import { DynamicLmsRepository } from '../repositories/lms/index.js';
import { LmsQueryBuilder } from '../repositories/lms/query-builder.js';
import { AppDataSource } from '../config/database.js';
import Payment from '../entities/Payment.js';
import { PRODUCT_MAP, getProductSearchKeys, normalizeProductKey } from '../utils/tableMappings.js';

function getValidatedProductKey(product) {
  const productKey = normalizeProductKey(product);

  if (!DynamicLmsRepository.validateProduct(productKey)) {
    throw new Error(`Invalid product: ${product}`);
  }

  return productKey;
}

const CustomerService = {

  // ===============================  
  // CUSTOMER PROFILE
  // ===============================
  async getCustomerProfile(lanId, productKey) {
    const key = getValidatedProductKey(productKey);

    return DynamicLmsRepository.getCustomerProfile(key, lanId);
  },

  // ===============================
  // LOAN DETAILS
  // ===============================
  async getLoanDetails(lanId, productKey) {
    const key = getValidatedProductKey(productKey);

    return DynamicLmsRepository.getLoanDetails(key, lanId);
  },

  // ===============================
  // EMI SCHEDULE
  // ===============================
  async getEmiSchedule(lanId, productKey) {
    const key = getValidatedProductKey(productKey);

    const fields = [
      'id',
      'lan',
      'dueDate',
      'status',
      'emiAmount',
      'interestAmount',
      'principalAmount',
      'openingBalance',
      'closingBalance',
      'remainingPrincipal',
      'remainingInterest',
      'remainingAmount',
      'paymentDate',
      'extraPaid',
      'dpd'
    ];

    const { sql } = LmsQueryBuilder.buildRpsSelectQuery(key, fields);

    const { initializeLMSDatabase } = await import('../config/database2.js');
    const db = await initializeLMSDatabase();

    return db.query(`${sql} WHERE lan = ? ORDER BY dueDate ASC`, [lanId]);
  },

  // ===============================
  // UPCOMING EMI
  // ===============================
  async getUpcomingEmi(lanId, productKey) {
    const key = getValidatedProductKey(productKey);

    return DynamicLmsRepository.getUpcomingEmi(key, lanId);
  },

  // ===============================
  // LOAN SUMMARY
  // ===============================
  async getLoanSummary(lanId, productKey) {
    const key = getValidatedProductKey(productKey);

    const config = PRODUCT_MAP[key];

    const manualCols = config?.manual?.cols || {};

    const statusCol = manualCols.status || 'status';
    const remainingCol = manualCols.remainingAmount || 'remaining_amount';

    const { initializeLMSDatabase } = await import('../config/database2.js');
    const db = await initializeLMSDatabase();

    const result = await db.query(
      `
      SELECT
        COUNT(*) AS totalEmis,
        SUM(CASE WHEN \`${statusCol}\` = 'PAID' THEN 1 ELSE 0 END) AS paidEmis,
        SUM(CASE WHEN \`${statusCol}\` IS NULL THEN 1 ELSE 0 END) AS pendingEmis,
        SUM(\`${remainingCol}\`) AS totalOutstanding
      FROM \`${config.manual.table}\`
      WHERE lan = ?  
      `,
      [lanId]
    );

    return result?.[0] || null;
  },

  // ===============================
  // PAYMENT HISTORY (LOS DB)
  // ===============================
async getPaymentHistory(lanId, productKey) {
  const key = getValidatedProductKey(productKey);

  const config = PRODUCT_MAP[key];

  if (!config?.manual?.table || !config?.manual?.cols) {
    throw new Error(`Manual RPS mapping missing for ${key}`);
  }

  const rpsCols = config.manual.cols;

  const { initializeLMSDatabase } = await import('../config/database2.js');
  const db = await initializeLMSDatabase();

  const sql = `
    SELECT
      ${rpsCols.id || "id"} AS id,
      ${rpsCols.lan || "lan"} AS lan,
      ${rpsCols.dueDate || "due_date"} AS dueDate,
      ${rpsCols.paymentDate || "payment_date"} AS paymentDate,
      ${rpsCols.status || "status"} AS status,
      ${rpsCols.emiAmount || "emi"} AS emiAmount,
      ${rpsCols.interestAmount || "interest"} AS interestAmount,
      ${rpsCols.principalAmount || "principal"} AS principalAmount,
      ${rpsCols.remainingPrincipal || "remaining_principal"} AS remainingPrincipal,
      ${rpsCols.remainingInterest || "remaining_interest"} AS remainingInterest,
      ${rpsCols.remainingAmount || "remaining_amount"} AS remainingAmount,
      ${rpsCols.dpd || "dpd"} AS dpd,
      ${rpsCols.extraPaid || "extra_paid"} AS extraPaid
    FROM ${config.manual.table}
    WHERE ${rpsCols.lan || "lan"} = ?
      AND ${rpsCols.status || "status"} = 'PAID'
    ORDER BY ${rpsCols.paymentDate || "payment_date"} DESC
  `;

  const results = await db.query(sql, [lanId]);

  return results || [];
},

  // =============================== 
  // FIND CUSTOMER BY MOBILE
  // ===============================
  async findCustomerByMobile(mobile, productKey) {
    const key = getValidatedProductKey(productKey);

    return this.findCustomerByMobileForProduct(mobile, key);
  },

  async findCustomerByMobileForProduct(mobile, productKey) {
    try {
      const config = PRODUCT_MAP[productKey];

      if (!config) {
        return null;
      }

      const cols = config.cols;

      const { initializeLMSDatabase } = await import('../config/database2.js');
      const db = await initializeLMSDatabase();

      const sql = `
        SELECT 
          ${cols.lan} AS lan,
          ${cols.mobileNumber} AS mobile,
          ${cols.customerName} AS name
        FROM ${config.table}
        WHERE ${cols.mobileNumber} = ?
        LIMIT 1
      `;

      const results = await db.query(sql, [mobile]);

      return results[0] || null;
    } catch (error) {
      console.error(`Error finding customer by mobile for ${productKey}:`, error);
      return null;
    }
  },

  async findCustomerByMobileAcrossProducts(mobile, preferredProduct) {
    const productKeys = getProductSearchKeys(preferredProduct);

    for (const productKey of productKeys) {
      const customer = await this.findCustomerByMobileForProduct(mobile, productKey);

      if (customer) {
        return {
          ...customer,
          productKey,
        };
      }
    }

    return null;
  },

  // ===============================
  // CUSTOMER DASHBOARD
  // ===============================
  async getCustomerDashboard(lanId, productKey) {
    const key = getValidatedProductKey(productKey);

    const [profile, loans, upcomingEmi, summary] = await Promise.all([
      this.getCustomerProfile(lanId, key),
      this.getLoanDetails(lanId, key),
      this.getUpcomingEmi(lanId, key),
      this.getLoanSummary(lanId, key)
    ]);

    return {
      profile,
      loans,
      upcomingEmi,
      summary
    };
  }

};

export default CustomerService;
