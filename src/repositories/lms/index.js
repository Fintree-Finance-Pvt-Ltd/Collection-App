import { LmsQueryBuilder } from './query-builder.js';
// import type { ILmsLoan } from './types.js';
import { PRODUCT_MAP } from '../../utils/index.js';

export class DynamicLmsRepository {
  /**
   * CORE: Get normalized customer profile across ALL products
   * Returns consistent structure
   */
  static async getCustomerProfile(productKey, lan) {
    try {
      return await LmsQueryBuilder.findByLan(productKey, lan);
    } catch (error) {
      console.error(`LMS Profile Query failed [${productKey}]:`, error);
      throw new Error(`Failed to fetch profile for ${productKey}: ${error.message}`);
    }
  }

  /**
   * Get loan details with extended fields
   */
  static async getLoanDetails(productKey, lan) {
    try {
      return await LmsQueryBuilder.findByLan(productKey, lan);
    } catch (error) {
      console.error(`LMS Loan Details failed [${productKey}]:`, error);
      throw new Error(`Failed to fetch loan details for ${productKey}: ${error.message}`);
    }
  }

  /**
   * Get upcoming EMI from RPS (manual table)
   */
  static async getUpcomingEmi(productKey, lan) {
    try {
      const config = PRODUCT_MAP[productKey];
      if (!config?.manual?.cols) {
        throw new Error(`Manual RPS config missing for: ${productKey}`);
      }
      
      const cols = config.manual.cols;
      const fields = ['emiAmount', 'dueDate', 'remainingAmount', 'status'];
      
      const selectClause = fields
        .map((field) => `${cols[field]} AS "${field}"`)
        .join(', ');
      
      const sql = `SELECT ${selectClause} FROM \`${config.manual.table}\` WHERE ${cols.lan} = ? AND (${cols.status} IS NULL OR ${cols.status} = '') AND ${cols.dueDate} >= CURDATE() ORDER BY ${cols.dueDate} ASC LIMIT 1`;
      
      const { initializeLMSDatabase } = await import('../../config/database2.js');
      const db = await initializeLMSDatabase();
      
      const rows = await db.query(sql, [lan]);
      return rows[0] || null;
    } catch (error) {
      console.error(`Upcoming EMI failed [${productKey}]:`, error);
      return null;
    }
  }

  /**
   * Validate product exists
   */
  static validateProduct(productKey) {
    return !!(PRODUCT_MAP[productKey]);
  }
}

export { LmsQueryBuilder };

