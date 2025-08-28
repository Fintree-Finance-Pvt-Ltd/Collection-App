import { Router } from 'express';
import AppDataSource from '../config/database.js';
import paymentsDetails from '../entities/paymentsDetails.js';
import Image from '../entities/paymentsImage.js'
import { authenticateToken } from '../middleware/auth.js';
import { normalizeToSqlDate } from '../utils/dateUtils.js';
import { upload } from "../utils/upload.js";
import fs from 'fs/promises';
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

router.post('/save-loan', upload.single('image'), async (req, res) => {

  try {
    const {
      loanId,
      customerName,
      vehicleNumber,
      panNumber,
      contactNumber,
      paymentDate,
      paymentMode,
      paymentRef,
      collectedBy,
      amount,
      amountInWords,
      latitude,
      longitude
    } = req.body;
    console.log(req.body)
    console.log("Uploaded File:", req.file); // Debug
    if (!loanId || !customerName || !vehicleNumber || !contactNumber || !paymentDate || !amount || !panNumber) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
      if (!req.file) {
      return res.status(400).json({ message: 'Image is required' });
    }

    const sqlDate = normalizeToSqlDate(paymentDate);
    if (!sqlDate) {
      return res.status(400).json({ message: 'Invalid paymentDate format. Use YYYY-MM-DD.' });
    }
if (['UPI', 'Cheque'].includes(paymentMode) && !paymentRef) {
  return res.status(400).json({
    message: 'Payment reference is required for UPI or Cheque payments',
  });
}


    const amountNum = Number(amount);
    if (isNaN(amountNum)) {
      return res.status(400).json({ message: 'Amount must be a number' });
    }
     
    const payments = paymentsRepository.create({
      loanId: String(loanId).trim(),
      customerName: String(customerName).trim(),
      vehicleNumber: String(vehicleNumber).trim(),
      contactNumber: String(contactNumber).trim(),
      panNumber: panNumber,
      paymentDate: sqlDate,
      paymentMode: paymentMode ? String(paymentMode).trim() : null,
      paymentRef: paymentRef ? String(paymentRef).trim() : null,
      collectedBy: collectedBy ? String(collectedBy).trim() : null,
      amount: amountNum,
      amountInWords: amountInWords ? String(amountInWords).trim() : null,
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