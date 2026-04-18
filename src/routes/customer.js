import { Router } from 'express';
import { customerMiddleware } from '../middleware/customerHeader.js';
import CustomerService from '../service/customerService.js';
import { PRODUCT_MAP, products } from '../utils/index.js';
import AppDataSource from '../config/database2.js';
import { REQUIRED_LOAN_FIELDS } from '../repositories/lms/constants.js';

const router = Router();

router.get('/getProducts', async (req, res) => {
  try {
    return res.status(200).json({ success: true, data: products });
  } catch (error) {
    console.error('Error in getProducts:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.use(customerMiddleware);

router.get('/profile', async (req, res) => {
  try {
    const lanId = req.lanId;
    const productKey = req.user.product?.toLowerCase();
    
    const profile = await CustomerService.getCustomerProfile(lanId, productKey);
    
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }
    console.log("profile data-->",profile)
    return res.status(200).json({ success: true, data: profile });
  } catch (error) {
    console.error('Error in get profile:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

function getProductMapping(product) {
  if (!product) return null;
  const key = String(product).toLowerCase().trim();
  return PRODUCT_MAP[key] || null;
}

function buildRpsJoin(mapping) {
  const { manual } = mapping;
  if (!manual?.table || !manual?.cols) {
    return "";
  }

  const rps = manual.cols;
  const lanCol = rps.lan || "lan";
  const remainingPrincipalCol = rps.remainingPrincipal || "remaining_principal";
  const remainingEmiCountCol = rps.remainingEmiCount || "remaining_emi";
  const statusCol = rps.status || "status";
  const dueDateCol = rps.dueDate || "due_date";

  return `
    LEFT JOIN (
      SELECT
        ${lanCol} AS lan,
        SUM(${remainingPrincipalCol}) AS pos,
        SUM(
          CASE
            WHEN ${statusCol} IN ('Late', 'Due')
            THEN ${remainingEmiCountCol}
            ELSE 0
          END
        ) AS overdue,
        MAX(
          CASE
            WHEN ${dueDateCol} < CURDATE()
              AND ${statusCol} != 'PAID'
            THEN DATEDIFF(CURDATE(), ${dueDateCol})
            ELSE 0
          END
        ) AS dpd
      FROM ${manual.table}
      GROUP BY ${lanCol}
    ) rps ON rps.lan = lb.lan
  `;
}

function buildLoanDetailsSelect(mapping) {
  const { table, cols } = mapping;
  const rpsJoinSQL = buildRpsJoin(mapping);
  
  const selectFields = REQUIRED_LOAN_FIELDS.map(field => {
    const col = cols[field];
    if (typeof col === 'string') {
      return `lb.${col} AS "${field}"`;
    }
    return col;
  }).join(',\n        ');

  const sql = `
    SELECT
      ${selectFields},
      COALESCE(rps.pos, 0) AS "pos",
      COALESCE(rps.dpd, 0) AS "dpd",
      COALESCE(rps.overdue, 0) AS "overdue"
    FROM \`${table}\` lb
    ${rpsJoinSQL}
    WHERE lb.lan = ?
    LIMIT 1
  `;

  return sql;
}

router.get('/loan-details', customerMiddleware, async (req, res) => {
  try {
    const lanId = req.lanId;
    const productKey = req.user.product?.toLowerCase();
    console.log("loan-details api called with lanId:", lanId, "and productKey:", productKey);
    
    if (!PRODUCT_MAP[productKey]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product type'
      });
    }

    const mapping = getProductMapping(productKey);
    const sql = buildLoanDetailsSelect(mapping);

    const [loans] = await AppDataSource.query(sql, [lanId]);
   console.log(loans)
    return res.status(200).json({
      success: true,
      data: loans
    });

  } catch (error) {
    console.error('Error in get loan-details:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

router.get('/payment-history', customerMiddleware, async (req, res) => {
  try {
    const lanId = req.lanId;
    const productKey = req.user.product?.toLowerCase();
    const payments = await CustomerService.getPaymentHistory(lanId, productKey);
    console.log("payment history-->", payments);
    return res.status(200).json({ success: true, data: payments });
  } catch (error) {
    console.error('Error in get payment-history:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/upcoming-emi', customerMiddleware, async (req, res) => {
  try {
    const lanId = req.lanId;
    if(!lanId){
      return res.status(400).json({ success: false, message: 'LAN ID is required' });
    }
    const productKey = req.user.product?.toLowerCase();
    const upcomingEmi = await CustomerService.getUpcomingEmi(lanId, productKey);
    
    return res.status(200).json({ success: true, data: upcomingEmi });
  } catch (error) {
    console.error('Error in get upcoming-emi:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;

