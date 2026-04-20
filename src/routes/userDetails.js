import { Router } from "express";
import AppDataSource from "../config/database2.js";
import { PRODUCT_MAP } from "../utils/tableMappings.js";
import { authenticateToken } from "../middleware/auth.js";

const router = Router();

/**
 * Helpers
 */
function getProductMapping(product) {
  if (!product) return null;
  const key = String(product).toLowerCase().trim();
  return {
    key,
    mapping: PRODUCT_MAP[key] || null,
  };
}

function isRawExpression(value) {
  if (!value || typeof value !== "string") return false;
  return value.includes("(") || value.includes(" ") || value.includes("'");
}

function withAlias(columnOrExpr, alias = "lb") {
  if (!columnOrExpr) return null;
  if (isRawExpression(columnOrExpr)) {
    return columnOrExpr;
  }
  return `${alias}.${columnOrExpr}`;
}

function buildWhereClause(cols, filters) {
  const whereParts = [];
  const params = [];

  if (filters.partnerLoanId && cols.partnerLoanId) {
    whereParts.push(`${withAlias(cols.partnerLoanId)} = ?`);
    params.push(filters.partnerLoanId);
  }

  if (filters.loanId) {
    const loanIdColumn = cols.loanId || cols.lan;
    if (!loanIdColumn) {
      throw new Error("loanId search not supported for this product");
    }
    whereParts.push(`${withAlias(loanIdColumn)} = ?`);
    params.push(filters.loanId);
  }

  if (filters.customerName && cols.customerName) {
    whereParts.push(`LOWER(${withAlias(cols.customerName)}) LIKE ?`);
    params.push(`%${String(filters.customerName).toLowerCase()}%`);
  }

  if (filters.mobileNumber && cols.mobileNumber) {
    whereParts.push(`${withAlias(cols.mobileNumber)} = ?`);
    params.push(filters.mobileNumber);
  }

  if (filters.panNumber && cols.panNumber) {
    whereParts.push(`${withAlias(cols.panNumber)} = ?`);
    params.push(String(filters.panNumber).toUpperCase());
  }

  console.log(filters,params)

  return {
    whereSQL: whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "",
    params,
  };
}

function buildRpsJoin(mapping) {
  const { cols, manual } = mapping;

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
    ) rps ON rps.lan = ${withAlias(cols.lan)}
  `;
}

function buildUserSelectQuery(mapping, whereSQL = "") {
  const { table, cols } = mapping;
  const rpsJoinSQL = buildRpsJoin(mapping);

  return `
    SELECT
      ${withAlias(cols.lan)} AS lan,
      COALESCE(rps.dpd, 0) AS dpd,
      COALESCE(rps.pos, 0) AS pos,
      COALESCE(rps.overdue, 0) AS overdue,
      ${withAlias(cols.customerName)} AS customerName,
      ${withAlias(cols.mobileNumber)} AS mobileNumber,
      ${withAlias(cols.panNumber)} AS panNumber,
      ${withAlias(cols.approvedLoanAmount)} AS approvedLoanAmount,
      ${withAlias(cols.emiAmount)} AS emiAmount,
      ${withAlias(cols.address)} AS address,
      ${withAlias(cols.city)} AS city,
      ${withAlias(cols.state)} AS state,
      ${withAlias(cols.product)} AS product,
      ${withAlias(cols.lender)} AS lender,
      '${table}' AS source_table
    FROM ${table} lb
    ${rpsJoinSQL}
    ${whereSQL}
    ORDER BY ${withAlias(cols.partnerLoanId)}
    LIMIT 500
  `;
}

function buildEmiScheduleQuery(mapping) {
  const { manual } = mapping;

  if (!manual?.table || !manual?.cols) {
    throw new Error("Manual RPS mapping missing for this product");
  }

  const rps = manual.cols;

  return `
    SELECT
      ${rps.id || "id"} AS id,
      ${rps.lan || "lan"} AS lan,
      ${rps.dueDate || "due_date"} AS dueDate,
      ${rps.status || "status"} AS status,
      ${rps.emiAmount || "emi"} AS emiAmount,
      ${rps.interestAmount || "interest"} AS interestAmount,
      ${rps.principalAmount || "principal"} AS principalAmount,
      ${rps.openingBalance || "opening"} AS openingBalance,
      ${rps.closingBalance || "closing"} AS closingBalance,
      ${rps.remainingEmiCount || "remaining_emi"} AS remainingEmiCount,
      ${rps.remainingInterest || "remaining_interest"} AS remainingInterest,
      ${rps.remainingPrincipal || "remaining_principal"} AS remainingPrincipal,
      ${rps.paymentDate || "payment_date"} AS paymentDate,
      ${rps.dpd || "dpd"} AS dpd,
      ${rps.remainingAmount || "remaining_amount"} AS remainingAmount,
      ${rps.extraPaid || "extra_paid"} AS extraPaid
    FROM ${manual.table}
    WHERE ${rps.lan || "lan"} = ?
    ORDER BY ${rps.dueDate || "due_date"} ASC
  `;
}

async function fetchUser(mapping, whereSQL, params) {
  const sql = buildUserSelectQuery(mapping, whereSQL);
  return AppDataSource.query(sql, params);
}

async function fetchWithFallback(productKey, whereSQL, params) {
  const mapping = PRODUCT_MAP[productKey];
  let rows = await fetchUser(mapping, whereSQL, params);

  if (!rows.length && mapping?.fallback) {
    const fallbackMapping = PRODUCT_MAP[mapping.fallback];
    if (fallbackMapping) {
      rows = await fetchUser(fallbackMapping, whereSQL, params);
    }
  }

  return rows;
}

function validateSearchInputs({ partnerLoanId, customerName, mobileNumber, panNumber }) {
  if (partnerLoanId && String(partnerLoanId).length > 50) {
    return "Invalid partnerLoanId";
  }

  if (customerName && String(customerName).length > 100) {
    return "Invalid customerName";
  }

  if (mobileNumber && !/^[0-9]{10}$/.test(String(mobileNumber))) {
    return "Invalid mobileNumber";
  }

  if (panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(String(panNumber))) {
    return "Invalid panNumber";
  }

  return null;
}

/**
 * Search customer details
 */
router.get("/user-Details", authenticateToken, async (req, res) => {
  try {
    const {
      product,
      partnerLoanId,
      loanId,
      customerName,
      mobileNumber,
      panNumber,
    } = req.query;
   console.log(req.query)
    if (!product) {
      return res.status(400).json({ error: "Product is required" });
    }

    const validationError = validateSearchInputs({
      partnerLoanId,
      customerName,
      mobileNumber,
      panNumber,
    });

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const { key, mapping } = getProductMapping(product);

    if (!mapping) {
      return res.status(400).json({ error: "Invalid product" });
    }

    const { whereSQL, params } = buildWhereClause(mapping.cols, {
      partnerLoanId,
      loanId,
      customerName,
      mobileNumber,
      panNumber,
    });

    const rows = await fetchWithFallback(key, whereSQL, params);

    if (!rows.length) {
      return res.status(404).json({ message: "No matching user found" });
    }
   console.log(rows[0])
    return res.status(200).json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error("user-Details error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * EMI Schedule
 */
router.get("/getEmiSchedule/:lan", authenticateToken, async (req, res) => {
  try {
    const { lan } = req.params;
    const { product } = req.query;

    if (!product) {
      return res.status(400).json({ error: "Product is required" });
    }

    const { mapping } = getProductMapping(product);

    if (!mapping) {
      return res.status(400).json({ error: "Unknown product" });
    }

    const sql = buildEmiScheduleQuery(mapping);
    const schedule = await AppDataSource.query(sql, [lan]);

    return res.status(200).json({
      success: true,
      count: schedule.length,
      data: schedule,
    });
  } catch (error) {
    console.error("getEmiSchedule error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * Upcoming EMI
 */
//we didnt use this api in app, but keeping it for future use, as it has rps upcoming emi which is not available in lms tables
router.get("/upcomingEmi/:lan", authenticateToken, async (req, res) => {
  try {
    const { lan } = req.params;
    const { product } = req.query;

    if (!product) {
      return res.status(400).json({ error: "Product is required" });
    }

    const { mapping } = getProductMapping(product);

    if (!mapping?.manual?.table || !mapping?.manual?.cols) {
      return res.status(400).json({ error: "Manual RPS mapping missing" });
    }

    const rps = mapping.manual.cols;

    const sql = `
      SELECT
        ${rps.emiAmount || "emi"} AS emiAmount,
        ${rps.dueDate || "due_date"} AS dueDate,
        ${rps.remainingAmount || "remaining_amount"} AS remainingAmount,
        ${rps.status || "status"} AS status
      FROM ${mapping.manual.table}
      WHERE ${rps.lan || "lan"} = ?
        AND (${rps.status || "status"} IS NULL OR ${rps.status || "status"} = '' OR ${rps.status || "status"} IN ('Due', 'Late'))
        AND ${rps.dueDate || "due_date"} >= CURDATE()
      ORDER BY ${rps.dueDate || "due_date"} ASC
      LIMIT 1
    `;

    const rows = await AppDataSource.query(sql, [lan]);

    return res.status(200).json({
      success: true,
      data: rows[0] || null,
    });
  } catch (error) {
    console.error("upcomingEmi error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * Loan summary
 */
//we dont use this api in app, but keeping it for future use, as it has rps summary which is not available in lms tables
router.get("/loanSummary/:lan", authenticateToken, async (req, res) => {
  try {
    const { lan } = req.params;
    const { product } = req.query;

    if (!product) {
      return res.status(400).json({ error: "Product is required" });
    }

    const { mapping } = getProductMapping(product);

    if (!mapping?.manual?.table || !mapping?.manual?.cols) {
      return res.status(400).json({ error: "Manual RPS mapping missing" });
    }

    const rps = mapping.manual.cols;

    const sql = `
      SELECT
        COUNT(*) AS totalEmis,
        SUM(CASE WHEN ${rps.status || "status"} = 'PAID' THEN 1 ELSE 0 END) AS paidEmis,
        SUM(
          CASE
            WHEN ${rps.status || "status"} IS NULL
              OR ${rps.status || "status"} = ''
              OR ${rps.status || "status"} IN ('Due', 'Late')
            THEN 1 ELSE 0
          END
        ) AS pendingEmis,
        SUM(${rps.remainingAmount || "remaining_amount"}) AS totalOutstanding
      FROM ${mapping.manual.table}
      WHERE ${rps.lan || "lan"} = ?
    `;

    const rows = await AppDataSource.query(sql, [lan]);

    return res.status(200).json({
      success: true,
      data: rows[0] || null,
    });
  } catch (error) {
    console.error("loanSummary error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;