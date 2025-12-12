// import { Router } from 'express';
// import AppDataSource from '../config/database.js';
// import embifiReceipt from '../entities/embifiReceipt.js';
// import embifiImage from '../entities/embifiImage.js'
// import { authenticateToken } from '../middleware/auth.js';
// import { normalizeTosmsDate } from '../utils/index.js';
// import { upload } from "../utils/upload.js";
// import fs from 'fs/promises';
// import axios from 'axios';
// import malhotraImage from '../entities/malhotraImage.js';
// import malhotraReceipt from '../entities/malhotraReceipt.js';

// const router = Router();

// //
// const embifiRepository = AppDataSource.getRepository(embifiReceipt);
// const embifiImageRepository = AppDataSource.getRepository(embifiImage);

// const malhotraRepository = AppDataSource.getRepository(malhotraReceipt);
// const malhotraImageRepository = AppDataSource.getRepository(malhotraImage);




// router.get('/pending-cash-payments', async (req, res) => {
//   try {
//     const { collectedBy } = req.query;
//     console.log('Query param collectedBy:', collectedBy);

//     const buildQuery = (repository, tableAlias = 'p', imageTable = 'embifi_images', imageAlias = 'img') => {
//       const qb = repository.createQueryBuilder(tableAlias);
//       qb.where(`${tableAlias}.paymentMode = :mode`, { mode: 'Cash' })
//         .andWhere(qb2 => {
//           const sub = qb2.subQuery()
//             .select('1')
//             .from(imageTable, imageAlias)
//             .where(`${imageAlias}.paymentId = ${tableAlias}.id`)
//             .andWhere(`${imageAlias}.image1 IS NOT NULL`)
//             .andWhere(`${imageAlias}.image2 IS NULL`)
//             .getQuery();
//           return `EXISTS ${sub}`;
//         });

//       if (collectedBy && collectedBy.trim()) {
//         qb.andWhere(`LOWER(${tableAlias}.collectedBy) = LOWER(:collectedBy)`, { collectedBy: collectedBy.trim() });
//       }

//       return qb.select([
//         `${tableAlias}.id`,
//         `${tableAlias}.loanId`,
//         `${tableAlias}.partnerLoanId`,
//         `${tableAlias}.customerName`,
//         `${tableAlias}.vehicleNumber`,
//         `${tableAlias}.contactNumber`,
//         `${tableAlias}.panNumber`,
//         `${tableAlias}.paymentDate`,
//         `${tableAlias}.paymentMode`,
//         `${tableAlias}.paymentRef`,
//         `${tableAlias}.collectedBy`,
//         `${tableAlias}.amount`,
//         `${tableAlias}.remark`,
//         `${tableAlias}.latitude`,
//         `${tableAlias}.longitude`,
//         `${tableAlias}.createdAt`,
//       ]).orderBy(`${tableAlias}.paymentDate`, 'DESC');
//     };

//     // Always fetch from both tables
//     const embifiQb = buildQuery(embifiRepository, 'p', 'embifi_images', 'img');
//     const malhotraQb = buildQuery(malhotraRepository, 'm', 'malhotra_images', 'img'); // Adjust image table if plural

//     const [embifiPayments, malhotraPayments] = await Promise.all([
//       embifiQb.getMany(),
//       malhotraQb.getMany()
//     ]);

//     // Merge, add product field to each, and sort by paymentDate DESC
//     const payments = [
//       ...embifiPayments.map(p => ({ ...p, product: 'embifi' })),
//       ...malhotraPayments.map(p => ({ ...p, product: 'malhotra' }))
//     ].sort((a, b) => 
//       new Date(b.paymentDate) - new Date(a.paymentDate)
//     );

//     res.status(200).json({ success: true, data: payments });
//   } catch (err) {
//     console.error('Error fetching pending cash payments:', err);
//     res.status(500).json({ success: false, message: 'Internal server error' });
//   }
// });


// router.post(
//   '/payments/:paymentId/image2',
//   authenticateToken,
//   upload.single('image2'),
//   async (req, res) => {
//     try {
//       const paymentId = Number(req.params.paymentId);
//       const { product } = req.body;

//       if (!Number.isFinite(paymentId)) {
//         return res.status(400).json({ success: false, message: 'Invalid paymentId' });
//       }

//       if (!product) {
//         return res.status(400).json({ success: false, message: 'Product is required' });
//       }

//       if (!req.file?.path) {
//         return res.status(400).json({ success: false, message: 'image2 file is required' });
//       }

//       const normalizedProduct = product.toLowerCase().trim();
//       let imageRepo = null;

//       // ✅ STRICT product routing (NO fallback!)
//       if (normalizedProduct === 'embifi') {
//         imageRepo = embifiImageRepository;
//       } else if (normalizedProduct === 'malhotra') {
//         imageRepo = malhotraImageRepository;
//       } else {
//         return res.status(400).json({ success: false, message: 'Unsupported product' });
//       }

//       // ✅ Read and cleanup uploaded file
//       const data = await fs.readFile(req.file.path);
//       await fs.unlink(req.file.path).catch(() => {});

//       // ✅ Update only if image2 is empty
//       const result = await imageRepo
//         .createQueryBuilder()
//         .update()
//         .set({ image2: data })
//         .where('paymentId = :paymentId', { paymentId })
//         .andWhere('image2 IS NULL')
//         .execute();

//       if (result.affected > 0) {
//         return res.json({
//           success: true,
//           message: `image2 updated successfully in ${normalizedProduct} table.`,
//         });
//       }

//       // ✅ Detect proper error
//       const exists = await imageRepo.findOne({ where: { paymentId } });

//       if (!exists) {
//         return res.status(404).json({
//           success: false,
//           message: `image1 for this paymentId does not exist in ${normalizedProduct} table.`,
//         });
//       }

//       return res.status(409).json({
//         success: false,
//         message: 'image2 already uploaded for this payment.',
//       });

//     } catch (err) {
//       console.error('Upload image2 error:', err);
//       return res.status(500).json({ success: false, message: 'Internal server error' });
//     }
//   }
// );


// //get direct image
// router.get('/payments/:id/image', async (req, res) => {
//   try {
//     const payment = await embifiRepository.findOne({
//       where: { id: parseInt(req.params.id) },
//     });

//     if (!payment || !payment.image) {
//       return res.status(404).json({ message: "Image not found" });
//     }

//     // 👇 set mime type (you may want to also save mimetype in DB)
//     res.setHeader("Content-Type", "image/jpeg");
//     res.send(payment.image); // <-- sends the raw buffer
//   } catch (err) {
//     console.error("Error fetching image:", err);
//     res.status(500).json({ message: "Error fetching image" });
//   }
// });



// router.post(
//   '/save-loan',
//   authenticateToken,
//   upload.fields([
//     { name: 'image', maxCount: 1 },
//     { name: 'selfie', maxCount: 1 },
//   ]),
//   async (req, res) => {
//     let imageTmpPath = req.files?.['image']?.[0]?.path;
//     let selfieTmpPath = req.files?.['selfie']?.[0]?.path;

//     try {
//       const {
//         product,         
//         loanId,
//         partnerLoanId,
//         customerName,
//         vehicleNumber,
//         panNumber,
//         contactNumber,
//         paymentDate,
//         paymentMode,
//         paymentRef,
//         collectedBy,
//         amount,
//         remark,
//         latitude,
//         longitude,
//       } = req.body;

//       if (!loanId || !partnerLoanId || !customerName || !contactNumber || !paymentDate || !amount || !panNumber || !product) {
//         return res.status(400).json({ message: 'Missing required fields' });
//       }

//       if (!selfieTmpPath || !imageTmpPath) {
//         return res.status(400).json({ message: 'Selfie or image is required' });
//       }

//       if (['UPI', 'Cheque'].includes(paymentMode) && !paymentRef) {
//         return res.status(400).json({ message: 'Payment reference is required for UPI or Cheque payments' });
//       }

//       const amountNum = Number(amount);
//       if (isNaN(amountNum)) {
//         return res.status(400).json({ message: 'Amount must be a number' });
//       }

//       // ✅ Choose repository dynamically
//       const isMalhotra = product?.toLowerCase() === 'malhotra';
//       const repo = isMalhotra ? malhotraRepository : embifiRepository;
//       const imageRepo = isMalhotra ? malhotraImageRepository : embifiImageRepository;

//       // ✅ Create and save payment
//       const payment = repo.create({
//         loanId: loanId.trim(),
//         partnerLoanId: partnerLoanId.trim(),
//         customerName: customerName.trim(),
//         vehicleNumber: vehicleNumber ? vehicleNumber.trim() : null,
//         contactNumber: contactNumber.trim(),
//         panNumber: panNumber.trim(),
//         paymentDate,
//         paymentMode: paymentMode ? paymentMode.trim() : null,
//         paymentRef: paymentRef ? paymentRef.trim() : null,
//         collectedBy: collectedBy ? collectedBy.trim() : null,
//         amount: amountNum,
//         remark: remark ? remark.trim() : null,
//         latitude,
//         longitude,
//       });

//       const result = await repo.save(payment);

//       // ✅ Save image and selfie in correct table
//       const imageBuffer = await fs.readFile(imageTmpPath);
//       const selfieBuffer = await fs.readFile(selfieTmpPath);

//       const image = imageRepo.create({
//         paymentId: result.id,
//         image1: imageBuffer,
//         selfie: selfieBuffer,
//       });
//       await imageRepo.save(image);

//       // ✅ Send SMS (non-blocking)
//       const smsDate = normalizeTosmsDate(paymentDate);
//       const smsText = `Thank you for your payment. We have received Rs. ${amountNum} towards your Fintree Finance Pvt Ltd Loan A/c No. ${loanId} on ${smsDate}, subject to realisation.`;

//       const smsUrl = `https://alotsolutions.in/api/mt/SendSMS?user=Fintree&password=P@ssw0rd&senderid=FTREEN&channel=TRANS&DCS=0&flashsms=0&number=${contactNumber}&text=${encodeURIComponent(
//         smsText
//       )}&route=5&DLTTemplateId=1707175688299723643&PEID=1201159568446234948`;

//       axios.get(smsUrl).catch((err) => console.error('SMS failed:', err.message));

//       return res.status(200).json({
//         message: '✅ Receipt saved successfully .',
//         insertId: result.id,
//       });
//     } catch (err) {
//       console.error('Error in /save-loan:', err);
//       return res.status(500).json({ message: 'Error saving loan details' });
//     } finally {
//       // ✅ Always clean up temp files
//       if (imageTmpPath) await fs.unlink(imageTmpPath).catch(() => {});
//       if (selfieTmpPath) await fs.unlink(selfieTmpPath).catch(() => {});
//     }
//   }
// );


// export default router;







import { Router } from 'express';
import AppDataSource from '../config/database.js';
import Payment from '../entities/Payment.js';
import PaymentImage from '../entities/PaymentImage.js';
import { authenticateToken } from '../middleware/auth.js';
import { normalizeTosmsDate } from '../utils/index.js';
import { upload } from "../utils/upload.js";
import fs from 'fs/promises';
import axios from 'axios';

const router = Router();

const paymentRepo = AppDataSource.getRepository(Payment);
const imageRepo = AppDataSource.getRepository(PaymentImage);



router.get("/pending-cash-payments", async (req, res) => {
  try {
    const { collectedBy } = req.query;

    const qb = paymentRepo
      .createQueryBuilder("p")
      .leftJoin(PaymentImage, "img", "img.paymentId = p.id")

      // Required conditions
      .where("p.paymentMode = :mode", { mode: "Cash" })
      .andWhere("img.image1 IS NOT NULL")   // image1 uploaded
      .andWhere("img.image2 IS NULL");      // image2 pending

    // Optional collectedBy filter
    if (collectedBy && collectedBy.trim()) {
      qb.andWhere("LOWER(p.collectedBy) = LOWER(:collectedBy)", {
        collectedBy: collectedBy.trim()
      });
    }

    // Select only required fields
    qb.select([
      "p.id AS id",
      "p.product AS product",
      "p.loanId AS loanId",
      "p.partnerLoanId AS partnerLoanId",
      "p.customerName AS customerName",
      "p.vehicleNumber AS vehicleNumber",
      "p.contactNumber AS contactNumber",
      "p.panNumber AS panNumber",
      "p.paymentDate AS paymentDate",
      "p.paymentMode AS paymentMode",
      "p.paymentRef AS paymentRef",
      "p.collectedBy AS collectedBy",
      "p.amount AS amount",
      "p.remark AS remark",
      "p.latitude AS latitude",
      "p.longitude AS longitude",
      "p.createdAt AS createdAt",
    ])
      .orderBy("p.paymentDate", "DESC");

    const results = await qb.getRawMany();

    return res.json({
      success: true,
      total: results.length,
      data: results,
    });

  } catch (err) {
    console.error("Pending cash API error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


router.post(
  '/payments/:paymentId/image2',
  authenticateToken,
  upload.single('image2'),
  async (req, res) => {
    try {
      const paymentId = Number(req.params.paymentId);

      if (!req.file?.path) {
        return res.status(400).json({ success: false, message: 'image2 file required' });
      }

      const buffer = await fs.readFile(req.file.path);
      await fs.unlink(req.file.path).catch(() => { });

      const result = await imageRepo
        .createQueryBuilder()
        .update()
        .set({ image2: buffer })
        .where('paymentId = :id', { id: paymentId })
        .andWhere('image2 IS NULL')
        .execute();

      if (result.affected === 0) {
        const exists = await imageRepo.findOne({ where: { paymentId } });

        if (!exists)
          return res.status(404).json({ success: false, message: "No image1 found for this payment." });

        return res.status(409).json({ success: false, message: "image2 already uploaded." });
      }

      res.json({ success: true, message: "image2 uploaded successfully." });

    } catch (err) {
      console.error("image2 upload error:", err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
);



router.get('/payments/:id/image', async (req, res) => {
  try {
    const id = Number(req.params.id);

    const img = await imageRepo.findOne({ where: { paymentId: id } });

    if (!img || !img.image1) {
      return res.status(404).json({ message: "Image not found" });
    }

    res.setHeader("Content-Type", "image/jpeg");
    res.send(img.image1);

  } catch (err) {
    console.error("Image fetch error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});



router.post(
  '/save-loan',
  authenticateToken,
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'selfie', maxCount: 1 },
  ]),
  async (req, res) => {

    let imgPath = req.files?.['image']?.[0]?.path;
    let selfiePath = req.files?.['selfie']?.[0]?.path;

    try {
      const {
        product,
        loanId,
        partnerLoanId,
        customerName,
        vehicleNumber,
        panNumber,
        contactNumber,
        paymentDate,
        paymentMode,
        paymentRef,
        collectedBy,
        amount,
        remark,
        latitude,
        longitude,
      } = req.body;

      if (!loanId || !partnerLoanId || !customerName || !contactNumber || !paymentDate || !amount || !panNumber || !product) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      if (!imgPath || !selfiePath) {
        return res.status(400).json({ message: 'Both image & selfie required' });
      }

      if (['UPI', 'Cheque'].includes(paymentMode) && !paymentRef) {
        return res.status(400).json({ message: 'PaymentRef is required for UPI/Cheque' });
      }

      // ❗ Only check when paymentRef is provided
      if (paymentRef) {
        const exists = await paymentRepo.findOne({
          where: { paymentRef: paymentRef.trim() }
        });

        if (exists) {
          return res.status(409).json({
            message: "Payment reference already exists"
          });
        }
      }


      const amountNum = Number(amount);
      if (isNaN(amountNum)) {
        return res.status(400).json({ message: 'Amount must be number' });
      }

      // Save payment
      const payment = paymentRepo.create({
        product: product.toLowerCase(),
        loanId,
        partnerLoanId,
        customerName,
        vehicleNumber,
        panNumber,
        contactNumber,
        paymentDate,
        paymentMode,
        paymentRef,
        collectedBy,
        amount: amountNum,
        remark,
        latitude,
        longitude
      });

      const saved = await paymentRepo.save(payment);

      // Save images
      const img = await fs.readFile(imgPath);
      const selfie = await fs.readFile(selfiePath);

      await imageRepo.save({
        paymentId: saved.id,
        image1: img,
        selfie: selfie
      });

      // Send SMS
      const smsDate = normalizeTosmsDate(paymentDate);
      const smsText = `Thank you for your payment. We have received Rs. ${amountNum} towards your Fintree Finance Pvt Ltd Loan A/c No. ${loanId} on ${smsDate}, subject to realisation.`;

      const smsUrl = `
https://alotsolutions.in/api/mt/SendSMS?user=Fintree&password=P@ssw0rd&senderid=FTREEN&channel=TRANS&DCS=0&flashsms=0&number=${contactNumber}&text=${encodeURIComponent(smsText)}&route=5&DLTTemplateId=1707175688299723643&PEID=1201159568446234948`;

      axios.get(smsUrl).catch(err => console.error("SMS error:", err.message));

      res.json({ message: "Receipt saved successfully", insertId: saved.id });

    } catch (err) {
      console.error("save-loan error:", err);
      res.status(500).json({ message: "Error saving loan" });
    } finally {
      if (imgPath) await fs.unlink(imgPath).catch(() => { });
      if (selfiePath) await fs.unlink(selfiePath).catch(() => { });
    }
  }
);
export default router;