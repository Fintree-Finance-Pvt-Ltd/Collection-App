import { initializeLMSDatabase } from '../../config/database2.js';
// import type { ILmsLoan } from './types.js'; // Removed TS type
import { PRODUCT_MAP, normalizeProductKey } from '../../utils/index.js';
// import { IProductConfig } from './types.js'; // Removed
import { REQUIRED_LOAN_FIELDS } from './constants.js';

export class LmsQueryBuilder {
  /**
   * Builds normalized SELECT for RPS/manual table
   */
  static buildRpsSelectQuery(productKey, fields = ['emiAmount', 'dueDate', 'remainingAmount', 'status']) {
    const key = normalizeProductKey(productKey);
    const config = PRODUCT_MAP[key];
    
    if (!config?.manual?.cols) {
      throw new Error(`RPS config missing for: ${key}`);
    }

    const missingFields = fields.filter((field) => !config.manual.cols[field]);
    if (missingFields.length > 0) {
      throw new Error(`Missing RPS column mappings for ${key}: ${missingFields.join(', ')}`);
    }

    const selectClause = fields
      .map((field) => {
        const col = config.manual.cols[field];
        if (typeof col === 'string') {
          return `${col} AS "${field}"`;
        }
        return col;
      })
      .join(', ');

    const sql = `
      SELECT ${selectClause}
      FROM \`${config.manual.table}\`
    `;

    return { sql, params: [] };
  }
  /**
   * Builds normalized SELECT query using PRODUCT_MAP column mappings
   * Handles computed columns (CONCAT_WS) automatically
   */
  static buildSelectQuery(productKey, fields = REQUIRED_LOAN_FIELDS) {
    const key = normalizeProductKey(productKey);
    const config = PRODUCT_MAP[key];
    
    if (!config) {
      throw new Error(`Product config missing for: ${key}`);
    }

    // Validate required fields exist in mapping
    const missingFields = fields.filter((field) => !config.cols[field]);
    if (missingFields.length > 0) {
      throw new Error(`Missing column mappings for ${key}: ${missingFields.join(', ')}`);
    }

    // Build SELECT clause with normalized aliases
    const selectClause = fields
      .map((field) => {
        const col = config.cols[field];
        if (typeof col === 'string') {
          return `${col} AS "${field}"`;
        }
        return col; // Already aliased computed column
      })
      .join(', ');

    const sql = `
      SELECT ${selectClause}
      FROM \`${config.table}\`
    `;

    return { sql, params: [] };
  }

  /**
   * Execute query with WHERE clause (e.g., lan = ?)
   */
  static async query(productKey, whereClause, params) {
    const { sql } = this.buildSelectQuery(productKey);
    const fullSql = `${sql} WHERE ${whereClause}`.trim();
    
    const db = await initializeLMSDatabase();
    return db.query(fullSql, params);
  }

  /**
   * Get single record by LAN
   */
  static async findByLan(productKey, lan) {
    const key = normalizeProductKey(productKey);
    const results = await this.query(key, 'lan = ?', [lan]);
    console.log(`Query for ${key} with LAN ${lan} returned:`, results);
    return results[0] || null;
  }
}

