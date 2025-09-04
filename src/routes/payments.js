import { Router } from 'express';
import AppDataSource from '../config/database.js';
import paymentsDetails from '../entities/paymentsDetails.js';
import Image from '../entities/paymentsImage.js'
import { authenticateToken } from '../middleware/auth.js';
import { normalizeTosmsDate } from '../utils/dateUtils.js';
import { upload } from "../utils/upload.js";
import fs from 'fs/promises';
import axios from 'axios';

const router = Router();
const paymentsRepository = AppDataSource.getRepository(paymentsDetails);
const paymentsImageRepository = AppDataSource.getRepository(Image);



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

router.get('/loans', async (_req, res) => {
  try {
    const loans = await paymentsRepository.find({
      order: { id: 'DESC' },
      take: 20,
    });
    res.json(loans);
  } catch (err) {
    console.error('Error in /loans:', err);
    res.status(500).json({ message: 'Error fetching loans' });
  }
});

router.post('/save-loan', authenticateToken, upload.single('image'), async (req, res) => {

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
    console.log(req.body)
    console.log("Uploaded File:", req.file); // Debug
    if (!loanId || !partnerLoanId|| !customerName || !vehicleNumber || !contactNumber || !paymentDate || !amount || !panNumber) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'Image is required' });
    }

    // const sqlDate = normalizeToSqlDate(paymentDate);
    // console.log("sqlDate-->",sqlDate)
    // if (!sqlDate) {
    //   return res.status(400).json({ message: 'Invalid paymentDate format. Use YYYY-MM-DD.' });
    // }
    if (['UPI', 'Cheque'].includes(paymentMode) && !paymentRef) {
      return res.status(400).json({
        message: 'Payment reference is required for UPI or Cheque payments',
      });
    }
    const smsDate = normalizeTosmsDate(paymentDate);
    console.log("smsDate-->",smsDate)
  
    
    const amountNum = Number(amount);
    if (isNaN(amountNum)) {
      return res.status(400).json({ message: 'Amount must be a number' });
    }

    
    const payments = paymentsRepository.create({
      loanId: String(loanId).trim(),
      partnerLoanId:String(partnerLoanId).trim(),
      customerName: String(customerName).trim(),
      vehicleNumber: String(vehicleNumber).trim(),
      contactNumber: String(contactNumber).trim(),
      panNumber: panNumber,
      paymentDate: paymentDate,
      paymentMode: paymentMode ? String(paymentMode).trim() : null,
      paymentRef: paymentRef ? String(paymentRef).trim() : null,
      collectedBy: collectedBy ? String(collectedBy).trim() : null,
      amount: amountNum,
      remark: remark ? String(remark).trim() : null,
      latitude: latitude,
      longitude: longitude,

    });

    const result = await paymentsRepository.save(payments);

    // Save image in the images table

    const imageBuffer = await fs.readFile(req.file.path);
    const image = paymentsImageRepository.create({
      paymentId: result.id,
      image: imageBuffer,
    });
    await paymentsImageRepository.save(image);
    console.log("saved successfully");
        // ✅ Send SMS after saving
    const smsText = `Thank you for your payment. We have received Rs. ${amountNum} towards your Fintree Finance Pvt Ltd Loan A/c No. ${loanId} on ${smsDate}, subject to realisation.`;

    const smsUrl = `https://alotsolutions.in/api/mt/SendSMS?user=Fintree&password=Vfyt14Ad&senderid=FTREEN&channel=TRANS&DCS=0&flashsms=0&number=${contactNumber}&text=${encodeURIComponent(smsText)}&route=5&DLTTemplateId=1707175688299723643&PEID=1201159568446234948`;

    try {
      const smsResponse = await axios.get(smsUrl);
      console.log("SMS API Response:", smsResponse.data);
    } catch (smsErr) {
      console.error("SMS sending failed:", smsErr.message);
    }
    return res.status(200).json({ message: 'Loan details saved successfully', insertId: result.id });
  } catch (err) {
    console.error('Error in /save-loan:', err);
    return res.status(500).json({
      message: 'Error saving loan details',
      code: err.code,
      sqlMessage: err.message,
    });
  }
});

export default router;