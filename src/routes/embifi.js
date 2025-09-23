// routes/embifi.js (replace your file)
import { Router } from 'express';
import AppDataSource from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js'
const router = Router();

router.get('/auto-fetch', authenticateToken, async (req, res) => {
  // normalize incoming query keys (optional - helpful while migrating clients)
  const {
    phoneNumber,
    panNumber,
    customerName,
    partnerLoanId,
    partner_loan_id, // accept both
    mobile_number
  } = req.query;

  const phone = phoneNumber ?? mobile_number;
  const partnerId = partnerLoanId ?? partner_loan_id;

  if (!phone && !panNumber && !partnerId) {
    return res.status(400).json({ error: 'Please provide at least one of phoneNumber, panNumber, or partnerLoanId.' });
  }

  // validations (same as you had)
  if (phone && (typeof phone !== 'string' || !/^\d{10}$/.test(phone))) {
    return res.status(400).json({ error: 'Invalid phoneNumber format. Must be a 10-digit number.' });
  }
  if (panNumber && (typeof panNumber !== 'string' || !/^[A-Z]{5}\d{4}[A-Z]{1}$/i.test(panNumber))) {
    return res.status(400).json({ error: 'Invalid panNumber format. Must be a valid PAN number (e.g., ABCDE1234F).' });
  }
  if (customerName && (typeof customerName !== 'string' || customerName.length > 100)) {
    return res.status(400).json({ error: 'Invalid customerName format. Must be a string with max length of 100 characters.' });
  }

  try {
    const queryBuilder = AppDataSource.createQueryBuilder()
      .select([
        'embifi.pan_number AS panNumber',
        'embifi.applicant_name AS customerName',
        'embifi.partner_loan_id AS partnerLoanId',
        'embifi.lan AS lan',
        'embifi.mobile_number AS mobileNumber',
      ])
      .from('embifi', 'embifi');

    if (phone) {
      queryBuilder.where('embifi.mobile_number = :phone', { phone });
    } else if (panNumber) {
      queryBuilder.where('embifi.pan_number = :panNumber', { panNumber });
    } else if (customerName) {
      queryBuilder.where('embifi.applicant_name LIKE :customerName', { customerName: `%${customerName}%` });
    } else if (partnerId) {
      queryBuilder.where('embifi.partner_loan_id = :partnerId', { partnerId }); // fixed param object
    }

    const rows = await queryBuilder.getRawMany();
    if (rows.length === 0) return res.status(404).json({ message: 'No matching records found.' });
    return res.json({ data: rows });
  } catch (error) {
    console.error('DB error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/user-Details', async (req, res) => {
  // accept both styles of params while you migrate clients
  const {
    partnerLoanId, partner_loan_id,
    customerName, customer_name,
    mobileNumber, mobile_number,
    panNumber, pan_number
  } = req.query;

  const partnerId = partnerLoanId ?? partner_loan_id;
  const custName = customerName ?? customer_name;
  const mobile = mobileNumber ?? mobile_number;
  const pan = panNumber ?? pan_number;

  if (!partnerId && !custName && !mobile && !pan) {
    return res.status(400).json({ error: 'Please provide partnerLoanId, customerName, mobileNumber or panNumber.' });
  }

  // validations...
  if (partnerId && (typeof partnerId !== 'string' || partnerId.length > 50)) {
    return res.status(400).json({ error: 'Invalid partnerLoanId format.' });
  }
  if (custName && (typeof custName !== 'string' || custName.length > 100)) {
    return res.status(400).json({ error: 'Invalid customerName format.' });
  }
  if (mobile && (!/^[0-9]{10}$/.test(mobile))) {
    return res.status(400).json({ error: 'Invalid mobile number format.' });
  }
  if (pan && (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(pan))) {
    return res.status(400).json({ error: 'Invalid PAN number format.' });
  }

  try {
    const qb = AppDataSource.createQueryBuilder()
      .select([
        'embifi.partner_loan_id AS partnerLoanId',
        'embifi.lan AS lan',
        'embifi.dpd_days AS DPD',
        'embifi.pos AS POS',
        'embifi.overdue AS Overdue',
        'embifi.applicant_name AS customerName',
        'embifi.mobile_number AS mobileNumber',
        'embifi.pan_number AS panNumber',
        'embifi.approved_loan_amount AS approvedLoanAmount',
        'embifi.emi_amount AS emiAmount',
        'embifi.applicant_address AS Address',
        'embifi.applicant_city AS City',
        'embifi.applicant_state AS State',
      ])
      .from('embifi', 'embifi');

    if (partnerId) qb.andWhere('embifi.partner_loan_id = :partnerId', { partnerId });
    if (custName) qb.andWhere('embifi.applicant_name LIKE :custName', { custName: `%${custName}%` });
    if (mobile) qb.andWhere('embifi.mobile_number = :mobile', { mobile });
    if (pan) qb.andWhere('embifi.pan_number = :pan', { pan });

    const rows = await qb.getRawMany();
    if (rows.length === 0) return res.status(404).json({ message: 'No matching user found.' });
    return res.json({ data: rows });
  } catch (error) {
    console.error('DB error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
