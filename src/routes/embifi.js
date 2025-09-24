import { Router } from 'express';
import AppDataSource from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js'
const router = Router();



router.get('/auto-fetch', authenticateToken, async (req, res) => {
  const { phoneNumber, panNumber, customerName,partnerLoanId } = req.query;
  console.log(req.query)
  // Validate inputs
  if (!phoneNumber && !panNumber && !partnerLoanId) {
    return res.status(400).json({ error: 'Please provide at least one of phoneNumber, panNumber, or customerName.' });
  }

  if (phoneNumber && (typeof phoneNumber !== 'string' || !/^\d{10}$/.test(phoneNumber))) {
    return res.status(400).json({ error: 'Invalid phoneNumber format. Must be a 10-digit number.' });
  }
  if (panNumber && (typeof panNumber !== 'string' || !/^[A-Z]{5}\d{4}[A-Z]{1}$/.test(panNumber))) {
    return res.status(400).json({ error: 'Invalid panNumber format. Must be a valid PAN number (e.g., ABCDE1234F).' });
  }
  if (customerName && (typeof customerName !== 'string' || customerName.length > 100)) {
    return res.status(400).json({ error: 'Invalid customerName format. Must be a string with max length of 100 characters.' });
  }

  try {
    const queryBuilder = AppDataSource.createQueryBuilder()
      .select([
        'embifi.panNumber AS panNumber',
        'embifi.applicantName AS customerName',
        'embifi.partnerLoanId AS partnerLoanId ',
        'embifi.lan AS lan',
        'embifi.mobileNumber AS mobileNumber',
      ])
      .from('embifi', 'embifi');

    // Prioritize phoneNumber, then panNumber, then customerName
    if (phoneNumber) {
      queryBuilder.where('embifi.mobileNumber = :phoneNumber', { phoneNumber });
    } else if (panNumber) {
      queryBuilder.where('embifi.panNumber = :panNumber', { panNumber });
    } else if (customerName) {
      queryBuilder.where('embifi.applicantName LIKE :customerName', { customerName: `%${customerName}%` });
    }
    else if (partnerLoanId) {
      queryBuilder.where('embifi.partnerLoanId = :partnerLoanId', { partnerLoanId: {partnerLoanId}});
    }

    const rows = await queryBuilder.getRawMany();
    console.log(rows)
    if (rows.length === 0) {
      return res.status(404).json({ message: 'No matching records found.' });
    }

    return res.json({ data: rows });
  } catch (error) {
    console.error('DB error:', error.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// router.get('/user-Details',async (req, res) => {
//   const { loanId, customerName } = req.query;
//   console.log(req.query)
//   if (!loanId && !customerName) {
//     return res.status(400).json({ error: 'Please provide either loanId or customerName.' });
//   }

//   if (loanId && (typeof loanId !== 'string' || loanId.length > 50)) {
//     return res.status(400).json({ error: 'Invalid loanId format.' });
//   }
//   if (customerName && (typeof customerName !== 'string' || customerName.length > 100)) {
//     return res.status(400).json({ error: 'Invalid customerName format.' });
//   }

//   try {
//     const queryBuilder = AppDataSource.createQueryBuilder()
//       .select([
//         // 'embifi.createdAt AS createdAt',
//         'embifi.partnerLoanId AS partner_LoanId',
//         'embifi.lan AS Fintree_lan',
//         'embifi.applicantName AS customer_Name',
//         'embifi.mobileNumber AS mobile_Number',
//         'embifi.panNumber AS pan_Number',
//         'embifi.approvedLoanAmount AS approved_LoanAmount',
//         // 'embifi.disbursalAmount AS disbursalAmount',
//         'embifi.emiAmount AS emi_Amount',
//         // 'embifi.loanTenure AS loanTenure',
//         // 'embifi.interestRate AS interestRate',
//         // 'embifi.loanStatus AS loanStatus',
//         // 'embifi.loanAdminStatus AS loanAdminStatus',
//         // 'embifi.firstEmiDate AS firstEmiDate',
//         // 'embifi.lastEmiDate AS lastEmiDate',
//         'embifi.applicantAddress AS Address',
//         'embifi.applicantCity AS City',
//         'embifi.applicantState AS State',
//         // 'embifi.accountNo AS accountNo',
//         // 'embifi.ifscCode AS ifscCode'
//       ])

//       .from('embifi', 'embifi');

//     if (loanId) {
//       queryBuilder.andWhere('embifi.partnerLoanId = :loanId', { loanId });
//     }
//     if (customerName) {
//       queryBuilder.andWhere('embifi.applicantName LIKE :customerName', { customerName: `%${customerName}%` });
//     }

//     const rows = await queryBuilder.getRawMany();

//     if (rows.length === 0) {
//       return res.status(404).json({ message: 'No matching user found.' });
//     }
//     console.log(rows)
//     return res.json({ data: rows });
//   } catch (error) {
//     console.error('DB error:', error.message);
//     return res.status(500).json({ error: 'Internal Server Error' });
//   }
// });
router.get('/user-Details', async (req, res) => {
  const { partnerLoanId, customerName, mobileNumber, panNumber } = req.query;
  console.log(req.query);

  if (!partnerLoanId && !customerName && !mobileNumber && !panNumber) {
    return res.status(400).json({ error: 'Please provide partnerLoanId, customerName, mobileNumber or panNumber.' });
  }

  // ✅ validations
  if (partnerLoanId && (typeof partnerLoanId !== 'string' || partnerLoanId.length > 50)) {
    return res.status(400).json({ error: 'Invalid partnerLoanId format.' });
  }
  if (customerName && (typeof customerName !== 'string' || customerName.length > 100)) {
    return res.status(400).json({ error: 'Invalid customerName format.' });
  }
  if (mobileNumber && (!/^[0-9]{10}$/.test(mobileNumber))) {
    return res.status(400).json({ error: 'Invalid mobile number format.' });
  }
  if (panNumber && (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(panNumber))) {
    return res.status(400).json({ error: 'Invalid PAN number format.' });
  }


  try {
    const queryBuilder = AppDataSource.createQueryBuilder()
      .select([
        'embifi.partnerLoanId AS partnerLoanId',
        'embifi.lan AS lan',
        'embifi.dpd_days AS dpd',
        'embifi.pos AS pos',
        'embifi.overdue AS overdue',
        'embifi.applicantName AS customerName',
        'embifi.mobileNumber AS mobileNumber',
        'embifi.panNumber AS panNumber',
        'embifi.approvedLoanAmount AS approvedLoanAmount',
        'embifi.emiAmount AS emiAmount',
        'embifi.applicantAddress AS address',
        'embifi.applicantCity AS city',
        'embifi.applicantState AS state',
      ])
      .from('embifi', 'embifi');

    // ✅ filtering conditions
    if (partnerLoanId) {
      queryBuilder.andWhere('embifi.partnerLoanId = :partnerLoanId', { partnerLoanId });
    }
    if (customerName) {
      queryBuilder.andWhere('embifi.applicantName LIKE :customerName', { customerName: `%${customerName}%` });
    }
    if (mobileNumber) {
      queryBuilder.andWhere('embifi.mobileNumber = :mobileNumber', { mobileNumber });
    }
    if (panNumber) {
      queryBuilder.andWhere('embifi.panNumber = :panNumber', { panNumber });
    }

    const rows = await queryBuilder.getRawMany();

    if (rows.length === 0) {

      return res.status(404).json({ message: 'No matching user found.' });
    }

    console.log("this row", rows);
    return res.json({ data: rows });
  } catch (error) {
    console.error('DB error:', error.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;