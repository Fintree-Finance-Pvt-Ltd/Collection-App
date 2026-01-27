import { Router } from 'express';
import AppDataSource from '../config/database2.js';
import { PRODUCT_MAP } from '../utils/index.js';
import { authenticateToken } from '../middleware/auth.js'
const router = Router();



// router.get('/auto-fetch', authenticateToken, async (req, res) => {
//   const { phoneNumber, panNumber, customerName,partnerLoanId } = req.query;

//   // Validate inputs
//   if (!phoneNumber && !panNumber && !partnerLoanId) {
//     return res.status(400).json({ error: 'Please provide at least one of phoneNumber, panNumber, or customerName.' });
//   }

//   if (phoneNumber && (typeof phoneNumber !== 'string' || !/^\d{10}$/.test(phoneNumber))) {
//     return res.status(400).json({ error: 'Invalid phoneNumber format. Must be a 10-digit number.' });
//   }
//   if (panNumber && (typeof panNumber !== 'string' || !/^[A-Z]{5}\d{4}[A-Z]{1}$/.test(panNumber))) {
//     return res.status(400).json({ error: 'Invalid panNumber format. Must be a valid PAN number (e.g., ABCDE1234F).' });
//   }
//   if (customerName && (typeof customerName !== 'string' || customerName.length > 100)) {
//     return res.status(400).json({ error: 'Invalid customerName format. Must be a string with max length of 100 characters.' });
//   }

//   try {
//     const queryBuilder = AppDataSource.createQueryBuilder()
//       .select([
//         'embifi.panNumber AS panNumber',
//         'embifi.applicantName AS customerName',
//         'embifi.partnerLoanId AS partnerLoanId ',
//         'embifi.lan AS lan',
//         'embifi.mobileNumber AS mobileNumber',
//       ])
//       .from('embifi', 'embifi');

//     // Prioritize phoneNumber, then panNumber, then customerName
//     if (phoneNumber) {
//       queryBuilder.where('embifi.mobileNumber = :phoneNumber', { phoneNumber });
//     } else if (panNumber) {
//       queryBuilder.where('embifi.panNumber = :panNumber', { panNumber });
//     } else if (customerName) {
//       queryBuilder.where('embifi.applicantName LIKE :customerName', { customerName: `%${customerName}%` });
//     }
//     else if (partnerLoanId) {
//       queryBuilder.where('embifi.partnerLoanId = :partnerLoanId', { partnerLoanId: {partnerLoanId}});
//     }

//     const rows = await queryBuilder.getRawMany();
//     console.log(rows)
//     if (rows.length === 0) {
//       return res.status(404).json({ message: 'No matching records found.' });
//     }

//     return res.json({ data: rows });
//   } catch (error) {
//     console.error('DB error:', error.message);
//     return res.status(500).json({ error: 'Internal Server Error' });
//   }
// });

// router.get('/user-Details', async (req, res) => {
//   const { partnerLoanId, customerName, mobileNumber, panNumber } = req.query;


//   if (!partnerLoanId && !customerName && !mobileNumber && !panNumber) {
//     return res.status(400).json({ error: 'Please provide partnerLoanId, customerName, mobileNumber or panNumber.' });
//   }

//   // ✅ validations
//   if (partnerLoanId && (typeof partnerLoanId !== 'string' || partnerLoanId.length > 50)) {
//     return res.status(400).json({ error: 'Invalid partnerLoanId format.' });
//   }
//   if (customerName && (typeof customerName !== 'string' || customerName.length > 100)) {
//     return res.status(400).json({ error: 'Invalid customerName format.' });
//   }
//   if (mobileNumber && (!/^[0-9]{10}$/.test(mobileNumber))) {
//     return res.status(400).json({ error: 'Invalid mobile number format.' });
//   }
//   if (panNumber && (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(panNumber))) {
//     return res.status(400).json({ error: 'Invalid PAN number format.' });
//   }


//   try {
//     const queryBuilder = AppDataSource.createQueryBuilder()
//       .select([
//         'embifi.partnerLoanId AS partnerLoanId',
//         'embifi.lan AS lan',
//         'embifi.dpd_days AS dpd',
//         'embifi.pos AS pos',
//         'embifi.overdue AS overdue',
//         'embifi.applicantName AS customerName',
//         'embifi.mobileNumber AS mobileNumber',
//         'embifi.panNumber AS panNumber',
//         'embifi.approvedLoanAmount AS approvedLoanAmount',
//         'embifi.emiAmount AS emiAmount',
//         'embifi.applicantAddress AS address',
//         'embifi.applicantCity AS city',
//         'embifi.applicantState AS state',
//       ])
//       .from('embifi', 'embifi');

//     // ✅ filtering conditions
//     if (partnerLoanId) {
//       queryBuilder.andWhere('embifi.partnerLoanId = :partnerLoanId', { partnerLoanId });
//     }
//     if (customerName) {
//       queryBuilder.andWhere('embifi.applicantName LIKE :customerName', { customerName: `%${customerName}%` });
//     }
//     if (mobileNumber) {
//       queryBuilder.andWhere('embifi.mobileNumber = :mobileNumber', { mobileNumber });
//     }
//     if (panNumber) {
//       queryBuilder.andWhere('embifi.panNumber = :panNumber', { panNumber });
//     }

//     const rows = await queryBuilder.getRawMany();

//     if (rows.length === 0) {

//       return res.status(404).json({ message: 'No matching user found.' });
//     }

//     console.log("this row", rows);
//     return res.json({ data: rows });
//   } catch (error) {
//     console.error('DB error:', error.message);
//     return res.status(500).json({ error: 'Internal Server Error' });
//   }
// });




// router.get('/user-Details', async (req, res) => {
//   try {
//     const { product, partnerLoanId, customerName, mobileNumber, panNumber } = req.query;
//     if (!product) return res.status(400).json({ error: 'Please provide product (embifi | ev | hey_ev)' });
// console.log(product)
//     const key = product.toString().toLowerCase();
//     const mapping = PRODUCT_MAP[key];
//     if (!mapping) return res.status(400).json({ error: 'Unknown product' });

//     // validation (same as you had)
//     if (partnerLoanId && (typeof partnerLoanId !== 'string' || partnerLoanId.length > 50)) {
//       return res.status(400).json({ error: 'Invalid partnerLoanId format.' });
//     }
//     if (customerName && (typeof customerName !== 'string' || customerName.length > 100)) {
//       return res.status(400).json({ error: 'Invalid customerName format.' });
//     }
//     if (mobileNumber && (!/^[0-9]{10}$/.test(mobileNumber))) {
//       return res.status(400).json({ error: 'Invalid mobile number format.' });
//     }
//     if (panNumber && (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(panNumber))) {
//       return res.status(400).json({ error: 'Invalid PAN number format.' });
//     }

//     // build SELECT using mapping.cols
//     const cols = mapping.cols;
//     const selectList = [
//       `${cols.partnerLoanId} AS partnerLoanId`,
//       `${cols.lan} AS lan`,
//       `NULL AS dpd`,
//       `NULL AS pos`,
//       `NULL AS overdue`,
//       `${cols.customerName} AS customerName`,
//       `${cols.mobileNumber} AS mobileNumber`,
//       `${cols.panNumber} AS panNumber`,
//       `${cols.approvedLoanAmount} AS approvedLoanAmount`,
//       `${cols.emiAmount} AS emiAmount`,
//       `${cols.address} AS address`,
//       `${cols.city} AS city`,
//       `${cols.state} AS state`,
//       `${cols.product} AS product`,
//       `${cols.lender} AS lender`,
//       `'${mapping.table}' AS source_table`
//     ].join(', ');

//     // build WHERE and params (use actual column names for the table)
//     const whereParts = [];
//     const params = [];

//     if (partnerLoanId) {
//       whereParts.push(`${cols.partnerLoanId} = ?`);
//       params.push(partnerLoanId);
//     }
//     if (customerName) {
//       whereParts.push(`LOWER(${cols.customerName}) LIKE ?`);
//       params.push(`%${customerName.toLowerCase()}%`);
//     }
//     if (mobileNumber) {
//       whereParts.push(`${cols.mobileNumber} = ?`);
//       params.push(mobileNumber);
//     }
//     if (panNumber) {
//       whereParts.push(`${cols.panNumber} = ?`);
//       params.push(panNumber.toUpperCase());
//     }

//     const whereSQL = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';
//     const finalSQL = `SELECT ${selectList} FROM ${mapping.table} ${whereSQL} ORDER BY ${cols.partnerLoanId} LIMIT 500;`;

//     const rows = await AppDataSource.query(finalSQL, params);
//     if (!rows || rows.length === 0) return res.status(404).json({ message: 'No matching user found.' });
//     return res.json({ data: rows });
//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({ error: 'Internal Server Error' });
//   }
// });

router.get('/user-Details', async (req, res) => {
  try {
    const { product, partnerLoanId, customerName, mobileNumber, panNumber } = req.query;

    if (!product) {
      return res.status(400).json({ error: 'Product is required' });
    }

    const key = product.toLowerCase();
    const mapping = PRODUCT_MAP[key];

    if (!mapping) {
      return res.status(400).json({ error: 'Invalid product' });
    }

    // validations
    if (partnerLoanId && partnerLoanId.length > 50) {
      return res.status(400).json({ error: 'Invalid partnerLoanId' });
    }

    if (customerName && customerName.length > 100) {
      return res.status(400).json({ error: 'Invalid customerName' });
    }

    if (mobileNumber && !/^[0-9]{10}$/.test(mobileNumber)) {
      return res.status(400).json({ error: 'Invalid mobileNumber' });
    }

    if (panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(panNumber)) {
      return res.status(400).json({ error: 'Invalid panNumber' });
    }

    const { cols, manual } = mapping;

    // SELECT
    const selectList = `
      lb.${cols.partnerLoanId} AS partnerLoanId,
      lb.${cols.lan} AS lan,
      COALESCE(rps.dpd, 0) AS dpd,
      COALESCE(rps.pos, 0) AS pos,
      COALESCE(rps.overdue, 0) AS overdue,
      lb.${cols.customerName} AS customerName,
      lb.${cols.mobileNumber} AS mobileNumber,
      lb.${cols.panNumber} AS panNumber,
      lb.${cols.approvedLoanAmount} AS approvedLoanAmount,
      lb.${cols.emiAmount} AS emiAmount,
      ${cols.address} AS address,
      lb.${cols.city} AS city,
      lb.${cols.state} AS state,
      lb.${cols.product} AS product,
      lb.${cols.lender} AS lender,
      '${mapping.table}' AS source_table
    `;

    // WHERE
    const whereParts = [];
    const params = [];

    if (partnerLoanId) {
      whereParts.push(`lb.${cols.partnerLoanId} = ?`);
      params.push(partnerLoanId);
    }

    if (customerName) {
      whereParts.push(`LOWER(lb.${cols.customerName}) LIKE ?`);
      params.push(`%${customerName.toLowerCase()}%`);
    }

    if (mobileNumber) {
      whereParts.push(`lb.${cols.mobileNumber} = ?`);
      params.push(mobileNumber);
    }

    if (panNumber) {
      whereParts.push(`lb.${cols.panNumber} = ?`);
      params.push(panNumber.toUpperCase());
    }

    const whereSQL = whereParts.length
      ? `WHERE ${whereParts.join(' AND ')}`
      : '';

    // MANUAL RPS JOIN
    const rpsJoinSQL = manual
      ? `
        LEFT JOIN (
          SELECT
            lan,
            SUM(remaining_principal) AS pos,
           SUM(
              CASE
                  WHEN status IN ('Late', 'Due') THEN remaining_emi
              ELSE 0
             END
                ) AS overdue,
            MAX(
              CASE
                WHEN due_date < CURDATE()
                     AND status != 'PAID'
                THEN DATEDIFF(CURDATE(), due_date)
                ELSE 0
              END
            ) AS dpd
          FROM ${manual.table}
          GROUP BY lan
        ) rps ON rps.lan = lb.${cols.lan}
      `
      : '';

    // FINAL QUERY
    const finalSQL = `
      SELECT ${selectList}
      FROM ${mapping.table} lb
      ${rpsJoinSQL}
      ${whereSQL}
      ORDER BY lb.${cols.partnerLoanId}
      LIMIT 500;
    `;

    const rows = await AppDataSource.query(finalSQL, params);

    if (!rows.length) {
      return res.status(404).json({ message: 'No matching user found' });
    }

    return res.json({ data: rows });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});







export default router;