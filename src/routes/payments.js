import { Router } from 'express';
import AppDataSource from '../config/database.js';
import paymentsDetails from '../entities/paymentsDetails.js';
import Image from '../entities/paymentsImage.js'
import { authenticateToken } from '../middleware/auth.js';
import { normalizeTosmsDate } from '../utils/index.js';
import { upload } from "../utils/upload.js";
import fs from 'fs/promises';
import axios from 'axios';

const router = Router();
const paymentsRepository = AppDataSource.getRepository(paymentsDetails);
const paymentsImageRepository = AppDataSource.getRepository(Image);



//get pending a
router.get('/pending-cash-payments', async (req, res) => {
  try {
    const { collectedBy } = req.query;
    console.log(collectedBy)
    const qb = paymentsRepository
      .createQueryBuilder('p')
      .where('p.paymentMode = :mode', { mode: 'Cash' }) // remove this line if you want all modes
      .andWhere(qb2 => {
        const sub = qb2.subQuery()
          .select('1')
          .from('payments_images', 'img')
          .where('img.paymentId = p.id')
          .andWhere('img.image1 IS NOT NULL')
          .andWhere('img.image2 IS NULL')
          .getQuery();
        return `EXISTS ${sub}`;
      });

    if (collectedBy && collectedBy.trim()) {
      qb.andWhere('LOWER(p.collectedBy) = LOWER(:collectedBy)', { collectedBy: collectedBy.trim() });
    }

    const payments = await qb
      .select([
        'p.id',
        'p.loanId',
        'p.partnerLoanId',
        'p.customerName',
        'p.vehicleNumber',
        'p.contactNumber',
        'p.panNumber',
        'p.paymentDate',
        'p.paymentMode',
        'p.paymentRef',
        'p.collectedBy',
        'p.amount',
        'p.remark',
        'p.latitude',
        'p.longitude',
        'p.createdAt',
      ])
      .orderBy('p.paymentDate', 'DESC')
      .getMany();

    res.status(200).json({ success: true, data: payments });
  } catch (err) {
    console.error('Error fetching pending second images:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});


//image2 inserting 
router.post(
  '/payments/:paymentId/image2',
  authenticateToken,
  upload.single('image2'),
  async (req, res) => {
    try {
      const paymentId = Number(req.params.paymentId);
      if (!Number.isFinite(paymentId) || !Number.isSafeInteger(paymentId)) {
        return res.status(400).json({ success: false, message: 'Invalid paymentId' });
      }
      if (!req.file || !req.file.path) {
        return res.status(400).json({ success: false, message: 'image2 file is required' });
      }

      // Read binary from disk (since you're using diskStorage)
      const data = await fs.readFile(req.file.path);

      // Optional: remove the uploaded file from disk after reading
      // (comment out if you want to keep the file on disk)
      await fs.unlink(req.file.path).catch(() => { });

      // Ensure image2 column is nullable in schema
      // Do the conditional update (only if image2 is currently NULL)
      const qb = paymentsImageRepository
        .createQueryBuilder()
        // .update(Image) // <- if you have an entity class, use it
        .update()         // <- otherwise default is fine for MySQL/MariaDB
        .set({ image2: data })
        .where('paymentId = :paymentId', { paymentId })
        .andWhere('image2 IS NULL');

      const result = await qb.execute();

      if (result.affected && result.affected > 0) {
        return res.json({ success: true, message: 'image2 uploaded' });
      }

      // Diagnose why nothing was updated
      const rowExists = await paymentsImageRepository.exist({ where: { paymentId } });
      if (!rowExists) {
        return res.status(404).json({
          success: false,
          message: 'No images row found for this paymentId (upload image1 first).',
        });
      }

      // Row exists but image2 already set
      return res.status(409).json({
        success: false,
        message: 'image2 already uploaded for this payment.',
      });
    } catch (e) {
      console.error('Upload image2 error:', e);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);


//get direct image
router.get('/payments/:id/image', async (req, res) => {
  try {
    const payment = await paymentsRepository.findOne({
      where: { id: parseInt(req.params.id) },
    });

    if (!payment || !payment.image) {
      return res.status(404).json({ message: "Image not found" });
    }

    // 👇 set mime type (you may want to also save mimetype in DB)
    res.setHeader("Content-Type", "image/jpeg");
    res.send(payment.image); // <-- sends the raw buffer
  } catch (err) {
    console.error("Error fetching image:", err);
    res.status(500).json({ message: "Error fetching image" });
  }
});

router.get("/collection", async (req, res) => {
  try {
    // join payments_details + payments_images
    const data = await paymentsRepository
      .createQueryBuilder("p")
      .leftJoinAndSelect("payments_images", "img", "img.paymentId = p.id")
      .select([
        // "p.id AS id",
        // "p.loanId AS loanId",
        // "p.partnerLoanId AS partnerLoanId",
        "p.customerName AS customerName",
        "p.vehicleNumber AS vehicleNumber",
        "p.contactNumber AS contactNumber",
        // "p.panNumber AS panNumber",
        "p.paymentDate AS paymentDate",
        "p.paymentMode AS paymentMode",
        "p.amount AS amount",
        "p.collectedBy AS collectedBy",
        // "p.remark AS remark",
        "p.createdAt AS createdAt",
        "img.image1 AS image1",
        "img.image2 AS image2",
      ])
      .orderBy("p.createdAt", "DESC")
      .getRawMany();

    // compute status
    const result = data.map((row) => {
      const isCash = row.paymentMode?.toLowerCase() === "cash";
      const hasImage2 = !!row.image2;

      const status = isCash && !hasImage2 ? "Incomplete" : "Completed";

      return {
        ...row,
        status,
      };
    });

    res.json(result);
  } catch (err) {
    console.error("Error fetching payments:", err);
    res.status(500).json({ message: "Error fetching payments", error: err.message });
  }
});



router.post('/save-loan', authenticateToken, upload.single('image'), async (req, res) => {
  let tmpPath = req.file?.path;   // <--- capture the temp file path once
  try {
    const {
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
      longitude
    } = req.body;

    if (!loanId || !partnerLoanId || !customerName  || !contactNumber || !paymentDate || !amount || !panNumber) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'Image is required' });
    }

    if (['UPI', 'Cheque'].includes(paymentMode) && !paymentRef) {
      return res.status(400).json({ message: 'Payment reference is required for UPI or Cheque payments' });
    }

    const amountNum = Number(amount);
    if (isNaN(amountNum)) {
      return res.status(400).json({ message: 'Amount must be a number' });
    }

    const payments = paymentsRepository.create({
      loanId: String(loanId).trim(),
      partnerLoanId: String(partnerLoanId).trim(),
      customerName: String(customerName).trim(),
      vehicleNumber: String(vehicleNumber).trim(),
      contactNumber: String(contactNumber).trim(),
      panNumber: String(panNumber).trim(),
      paymentDate,
      paymentMode: paymentMode ? String(paymentMode).trim() : null,
      paymentRef: paymentRef ? String(paymentRef).trim() : null,
      collectedBy: collectedBy ? String(collectedBy).trim() : null,
      amount: amountNum,
      remark: remark ? String(remark).trim() : null,
      latitude,
      longitude,
    });

    const result = await paymentsRepository.save(payments);

    // Read + save image
    const imageBuffer = await fs.readFile(tmpPath);
    const image = paymentsImageRepository.create({
      paymentId: result.id,
      image1: imageBuffer,
    });
    await paymentsImageRepository.save(image);

    // Send SMS (non-blocking)
    const smsDate = normalizeTosmsDate(paymentDate);
    const smsText = `Thank you for your payment. We have received Rs. ${amountNum} towards your Fintree Finance Pvt Ltd Loan A/c No. ${loanId} on ${smsDate}, subject to realisation.`;
    const smsUrl = `https://alotsolutions.in/api/mt/SendSMS?user=Fintree&password=P@ssw0rd&senderid=FTREEN&channel=TRANS&DCS=0&flashsms=0&number=${contactNumber}&text=${encodeURIComponent(smsText)}&route=5&DLTTemplateId=1707175688299723643&PEID=1201159568446234948`;

    axios.get(smsUrl).catch(err => console.error('SMS failed:', err.message));

    return res.status(200).json({ message: 'Loan details saved successfully', insertId: result.id });

  } catch (err) {
    console.error('Error in /save-loan:', err);
    return res.status(500).json({ message: 'Error saving loan details' });
  } finally {
    if (tmpPath) {
      await fs.unlink(tmpPath).catch(() => {}); // ✅ always clean up
    }
  }
});


// router.post('/save-loan', authenticateToken, upload.single('image'), async (req, res) => {
//   try {
//     const {
//       loanId,
//       partnerLoanId,
//       customerName,
//       vehicleNumber,
//       panNumber,
//       contactNumber,
//       paymentDate,
//       paymentMode,
//       paymentRef,
//       collectedBy,
//       amount,
//       remark,
//       latitude,
//       longitude
//     } = req.body;
//     console.log(req.body)
//     console.log("Uploaded File:", req.file); // Debug
//     if (!loanId || !partnerLoanId || !customerName || !vehicleNumber || !contactNumber || !paymentDate || !amount || !panNumber) {
//       return res.status(400).json({ message: 'Missing required fields' });
//     }
//     if (!req.file) {
//       return res.status(400).json({ message: 'Image is required' });
//     }

//     // const sqlDate = normalizeToSqlDate(paymentDate);
//     // console.log("sqlDate-->",sqlDate)
//     // if (!sqlDate) {
//     //   return res.status(400).json({ message: 'Invalid paymentDate format. Use YYYY-MM-DD.' });
//     // }
//     if (['UPI', 'Cheque'].includes(paymentMode) && !paymentRef) {
//       return res.status(400).json({
//         message: 'Payment reference is required for UPI or Cheque payments',
//       });
//     }
//     const smsDate = normalizeTosmsDate(paymentDate);
//     console.log("smsDate-->", smsDate)


//     const amountNum = Number(amount);
//     if (isNaN(amountNum)) {
//       return res.status(400).json({ message: 'Amount must be a number' });
//     }


//     const payments = paymentsRepository.create({
//       loanId: String(loanId).trim(),
//       partnerLoanId: String(partnerLoanId).trim(),
//       customerName: String(customerName).trim(),
//       vehicleNumber: String(vehicleNumber).trim(),
//       contactNumber: String(contactNumber).trim(),
//       panNumber: panNumber,
//       paymentDate: paymentDate,
//       paymentMode: paymentMode ? String(paymentMode).trim() : null,
//       paymentRef: paymentRef ? String(paymentRef).trim() : null,
//       collectedBy: collectedBy ? String(collectedBy).trim() : null,
//       amount: amountNum,
//       remark: remark ? String(remark).trim() : null,
//       latitude: latitude,
//       longitude: longitude,

//     });

//     const result = await paymentsRepository.save(payments);

//     // Save image in the images table

//     const imageBuffer = await fs.readFile(req.file.path);
//     const image = paymentsImageRepository.create({
//       paymentId: result.id,
//       image1: imageBuffer,
//     });

//     await paymentsImageRepository.save(image);
//     console.log("saved successfully");
    
//     // ✅ Send SMS after saving
//     const smsText = `Thank you for your payment. We have received Rs. ${amountNum} towards your Fintree Finance Pvt Ltd Loan A/c No. ${loanId} on ${smsDate}, subject to realisation.`;

//     const smsUrl = `https://alotsolutions.in/api/mt/SendSMS?user=Fintree&password=P@ssw0rd&senderid=FTREEN&channel=TRANS&DCS=0&flashsms=0&number=${contactNumber}&text=${encodeURIComponent(smsText)}&route=5&DLTTemplateId=1707175688299723643&PEID=1201159568446234948`;

//     try {
//       const smsResponse = await axios.get(smsUrl);
//       console.log("SMS API Response:", smsResponse.data);
//     } catch (smsErr) {
//       console.error("SMS sending failed:", smsErr.message);
//     }
//     return res.status(200).json({ message: 'Loan details saved successfully', insertId: result.id });
//   } catch (err) {
//     console.error('Error in /save-loan:', err);
//     return res.status(500).json({
//       message: 'Error saving loan details',
//       code: err.code,
//       sqlMessage: err.message,
//     });
//   }
// });

export default router;