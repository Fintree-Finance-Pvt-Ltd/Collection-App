
// // routes/dashboard.js
// import { Router } from "express";
// import AppDataSource from "../../config/database.js";
// import SecondDataSource from "../../config/database2.js";

// import Payment from "../../entities/Payment.js";
// import PaymentImage from "../../entities/PaymentImage.js";
// import Repossession from "../../entities/Repossession.js";
// // import EmbifiRepossession from "../../entities/EmbifiRepossession.js";
// // import MalhotraRepossession from "../../entities/malhotraRepossession.js";

// import { authenticateToken } from "../../middleware/auth.js";

// const router = Router();

// /* ======================================
//       UNIFIED REPOSITORY MAP
// ====================================== */

// const REPO = {
//   embifi: {
//     payments: AppDataSource.getRepository(Payment),
//     repo: AppDataSource.getRepository(Repossession),
//     loanTable: "loan_booking_embifi",
//     product: "embifi",
//   },

//   malhotra: {
//     payments: AppDataSource.getRepository(Payment),
//     repo: AppDataSource.getRepository(Repossession),
//     loanTable: "loan_booking_ev",
//     product: "malhotra",
//   },
//     heyev: {
//     payments: AppDataSource.getRepository(Payment),
//     repo: AppDataSource.getRepository(Repossession),
//     loanTable: "loan_booking_hey_ev",
//     product: "heyev",
//   },
// };

// /* ======================================
//                 HELPERS
// ====================================== */

// const startOfDay = (d) => {
//   const x = new Date(d);
//   x.setHours(0, 0, 0, 0);
//   return x;
// };

// const endOfDay = (d) => {
//   const x = new Date(d);
//   x.setHours(23, 59, 59, 999);
//   return x;
// };

// const fmtDate = (d) =>
//   new Date(d).toISOString().slice(0, 19).replace("T", " ");

// function rangeForPeriod(period) {
//   const now = new Date();
//   if (!period || period === "all") return { start: null, end: null };

//   switch (period) {
//     case "day":
//       return { start: startOfDay(now), end: endOfDay(now) };

//     case "week": {
//       const s = new Date(now);
//       const dow = (s.getDay() + 6) % 7;
//       s.setDate(s.getDate() - dow);
//       return { start: startOfDay(s), end: endOfDay(now) };
//     }

//     case "year":
//       return {
//         start: startOfDay(new Date(now.getFullYear(), 0, 1)),
//         end: endOfDay(now),
//       };

//     default: // month
//       return {
//         start: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)),
//         end: endOfDay(now),
//       };
//   }
// }

// /* ======================================
//            DASHBOARD BASIC METRICS
// ====================================== */


// async function getStatsForProduct(product, loanTable, { start, end }) {
//       const paymentRepo=AppDataSource.getRepository(Payment);
//       const reposRepo=AppDataSource.getRepository(Repossession)
//   // TOTAL COLLECTIONS (from payments table filtered by product)
//   const qbTotal = paymentRepo
//     .createQueryBuilder("p")
//     .select("COALESCE(SUM(p.amount),0)", "total")
//     .where("p.product = :product", { product });

//   if (start && end) {
//     qbTotal.andWhere("p.createdAt BETWEEN :s AND :e", {
//       s: fmtDate(start),
//       e: fmtDate(end),
//     });
//   }

//   const { total } = await qbTotal.getRawOne();

//   // ACTIVE LOANS (keeps using loanTable from SecondDataSource)
//   const loanRows = await SecondDataSource.query(
//     `SELECT COUNT(*) AS cnt FROM ${loanTable}`
//   );
//   const activeLoans = Number(loanRows[0].cnt || 0);
     
//   // REPOSSESSIONS (from the central repossessions table)
//   // Counts rows where partner matches and (optionally) repoDate is within range.
//   const repoQB = reposRepo.createQueryBuilder("r").where("r.partner = :partner", {
//     partner: product,
//   });

//   if (start && end) {
//     repoQB.andWhere("r.repoDate BETWEEN :s AND :e", {
//       s: fmtDate(start),
//       e: fmtDate(end),
//     });
//   }

//   const repossessions = await repoQB.getCount();

//   // ACTIVE AGENTS (distinct collectors in payments table)
//   const qbAgents = paymentRepo
//     .createQueryBuilder("p")
//     .select("COUNT(DISTINCT p.collectedBy)", "cnt")
//     .where("p.product = :product", { product });

//   if (start && end) {
//     qbAgents.andWhere("p.createdAt BETWEEN :s AND :e", {
//       s: fmtDate(start),
//       e: fmtDate(end),
//     });
//   }

//   const { cnt } = await qbAgents.getRawOne();

//   return {
//     totalCollections: Number(total || 0),
//     activeLoans,
//     repossessions: Number(repossessions || 0),
//     activeAgents: Number(cnt || 0),
//   };
// }

// /* ======================================
//               TREND CHART
// ====================================== */

// async function getTrendForProduct(product, period, { start, end }) {
//       const paymentRepo=AppDataSource.getRepository(Payment);

//   const qb = paymentRepo
//     .createQueryBuilder("p")
//     .select("p.createdAt", "date")
//     .addSelect("p.amount", "amount")
//     .where("p.product = :product", { product });

//   if (start && end) {
//     qb.andWhere("p.createdAt BETWEEN :s AND :e", {
//       s: fmtDate(start),
//       e: fmtDate(end),
//     });
//   }

//   const rows = await qb.getRawMany();

//   return {
//     labels: rows.map((r) =>
//       new Date(r.date).toLocaleString("en-IN", {
//         day: "2-digit",
//         month: "short",
//         year: "numeric",
//         hour: "2-digit",
//         minute: "2-digit",
//       })
//     ),
//     data: rows.map((r) => Number(r.amount)),
//   };
// }

// /* ======================================
//             PAYMENT MODES
// ====================================== */

// async function getPaymentModesForProduct(product, { start, end }) {
//       const paymentRepo=AppDataSource.getRepository(Payment);

//   const qb = paymentRepo
//     .createQueryBuilder("p")
//     .select("p.paymentMode", "mode")
//     .addSelect("COALESCE(SUM(p.amount),0)", "total")
//     .where("p.product = :product", { product });

//   if (start && end) {
//     qb.andWhere("p.createdAt BETWEEN :s AND :e", {
//       s: fmtDate(start),
//       e: fmtDate(end),
//     });
//   }

//   const rows = await qb.groupBy("mode").getRawMany();

//   return {
//     labels: rows.map((r) => r.mode || "Unknown"),
//     data: rows.map((r) => Number(r.total)),
//   };
// }

// /* ======================================
//         AGENT PERFORMANCE
// ====================================== */

// async function getAgentPerformanceForProduct(product, range) {
//   const { start, end } = range;
//     const paymentRepo=AppDataSource.getRepository(Payment);

//   const qb = paymentRepo
//     .createQueryBuilder("p")
//     .select("p.collectedBy", "agent")
//     .addSelect("COALESCE(SUM(p.amount),0)", "total")
//     .where("p.product = :product", { product });

//   if (start && end) {
//     qb.andWhere("p.createdAt BETWEEN :s AND :e", {
//       s: fmtDate(start),
//       e: fmtDate(end),
//     });
//   }

//   const rows = await qb
//     .groupBy("agent")
//     .orderBy("total", "DESC")
//     .limit(5)
//     .getRawMany();

//   return {
//     labels: rows.map((r) => r.agent || "Unknown"),
//     data: rows.map((r) => Number(r.total)),
//   };
// }

// /* ======================================
//         STANDARD DASHBOARD API
// ====================================== */

// router.get("/dashboard", async (req, res) => {
//   try {
//     const period = req.query.period?.toString() || "all";
//     const partner = req.query.partner?.toString().toLowerCase();

//     if (!REPO[partner]) {
//       return res.status(400).json({ message: "Invalid partner selected" });
//     }
//     const { loanTable, product } = REPO[partner];
//     const range = rangeForPeriod(period);
      
//     const [stats, trend, modes, agents] = await Promise.all([
//       getStatsForProduct(product, loanTable, range),
//       getTrendForProduct(product, period, range),
//       getPaymentModesForProduct(product, range),
//       getAgentPerformanceForProduct(product, range),
//     ]);

//     res.json({
//       partner,
//       period,
//       range: range.start
//         ? {
//             start: range.start.toISOString(),
//             end: range.end.toISOString(),
//           }
//         : null,
//       stats,
//       charts: {
//         trend,
//         paymentModes: modes,
//         agentPerformance: agents,
//       },
//     });
//   } catch (err) {
//     console.error("Dashboard error:", err);
//     res.status(500).json({ message: "Internal server error" });
//   }
// });
// /* ======================================
//    SUPERADMIN HELPERS
// ====================================== */

// function buildTrendFromPayments(payments, period, start, end) {
//   if (!payments.length) return { labels: [], data: [] };

//   const valid = payments.filter((p) => p.paymentDate instanceof Date);

//   if (!valid.length) return { labels: [], data: [] };

//   const result = new Map();

//   if (period === "day") {
//     for (let h = 0; h < 24; h++) result.set(h, 0);
//     valid.forEach((p) => {
//       const h = p.paymentDate.getHours();
//       result.set(h, result.get(h) + p.amount);
//     });
//     return {
//       labels: [...result.keys()].map((h) => `${h}:00`),
//       data: [...result.values()],
//     };
//   }

//   if (period === "week") {
//     const endD = end ? new Date(end) : new Date();
//     const labels = [];
//     const keys = [];
//     for (let i = 6; i >= 0; i--) {
//       const d = new Date(endD);
//       d.setDate(d.getDate() - i);
//       const label = d.toLocaleDateString("en-GB", {
//         day: "2-digit",
//         month: "short",
//       });
//       labels.push(label);
//       keys.push(d.toISOString().slice(0, 10));
//       result.set(keys[i], 0);
//     }
//     valid.forEach((p) => {
//       const k = p.paymentDate.toISOString().slice(0, 10);
//       if (result.has(k)) result.set(k, result.get(k) + p.amount);
//     });
//     return {
//       labels,
//       data: keys.map((k) => result.get(k) || 0),
//     };
//   }

//   // DEFAULT MONTH/YEAR
//   const labels = [];
//   const sums = new Map();

//   valid.forEach((p) => {
//     const key = `${p.paymentDate.getFullYear()}-${String(
//       p.paymentDate.getMonth() + 1
//     ).padStart(2, "0")}`;
//     sums.set(key, (sums.get(key) || 0) + p.amount);
//   });

//   const sorted = [...sums.keys()].sort();

//   sorted.forEach((k) => {
//     const dt = new Date(k + "-01");
//     labels.push(
//       dt.toLocaleString("en-US", {
//         month: "short",
//         year: "2-digit",
//       })
//     );
//   });

//   return {
//     labels,
//     data: sorted.map((k) => sums.get(k)),
//   };
// }

// function buildPaymentModesFromPayments(payments) {
//   const map = new Map();
//   payments.forEach((p) => {
//     const key = p.paymentMode || "Unknown";
//     map.set(key, (map.get(key) || 0) + p.amount);
//   });
//   return {
//     labels: [...map.keys()],
//     data: [...map.values()],
//   };
// }

// function buildAgentPerformanceFromPayments(payments) {
//   const map = new Map();
//   payments.forEach((p) => {
//     const key = p.collectedBy || "Unknown Agent";
//     map.set(key, (map.get(key) || 0) + p.amount);
//   });
//   const sorted = [...map.entries()]
//     .sort((a, b) => b[1] - a[1])
//     .slice(0, 5);
//   return {
//     labels: sorted.map((x) => x[0]),
//     data: sorted.map((x) => x[1]),
//   };
// }

// /* ======================================
//    SUPERADMIN COLLECTIONS API
// ====================================== */

// router.get(
//   "/superAdmin/collections",
//   authenticateToken,
//   async (req, res) => {
//     try {
//       if (req.user?.role !== "superadmin") {
//         return res.status(403).json({
//           message: "Only superadmin can access this report",
//         });
//       }

//       const partnerQuery = (req.query.partner || "all").toLowerCase();
//       const period = req.query.period || "all";

//       const partners =
//         partnerQuery === "all"
//           ? ["embifi", "malhotra"]
//           : [partnerQuery];

//       const { startDate, endDate } = req.query;

//       const dealersFilter = (req.query.dealers || "")
//         .split(",")
//         .map((s) => s.trim())
//         .filter(Boolean);

//       const districtsFilter = (req.query.districts || "")
//         .split(",")
//         .map((s) => s.trim())
//         .filter(Boolean);

//       const agentsFilter = (req.query.agents || "")
//         .split(",")
//         .map((s) => s.trim())
//         .filter(Boolean);

//       let grandTotal = 0;
//       let activeAgentsSet = new Set();
//       let dealersMap = {};
//       let allPayments = [];

//       const paymentsRepo = AppDataSource.getRepository(Payment);

//       for (const p of partners) {
//         const repo = REPO[p];

//         const qb = paymentsRepo
//           .createQueryBuilder("p")
//           .select([
//             "p.loanId AS lan",
//             "p.amount AS amount",
//             "p.paymentDate AS paymentDate",
//             "p.paymentMode AS paymentMode",
//             "p.collectedBy AS collectedBy",
//           ])
//           .where("p.product = :product", {
//             product: repo.product,
//           });

//         if (startDate && endDate) {
//           qb.andWhere("DATE(p.paymentDate) BETWEEN :s AND :e", {
//             s: startDate,
//             e: endDate,
//           });
//         }

//         if (agentsFilter.length) {
//           qb.andWhere("p.collectedBy IN (:...agents)", {
//             agents: agentsFilter,
//           });
//         }

//         const payRows = await qb.getRawMany();

//         if (!payRows.length) continue;

//         const lanList = payRows
//           .map((r) => r.lan)
//           .filter((x) => x);

//         if (!lanList.length) continue;

//         const placeholders = lanList.map(() => "?").join(",");

//         const loanRows = await SecondDataSource.query(
//           `
//           SELECT lan, dealer_name AS dealer, district
//           FROM ${repo.loanTable}
//           WHERE lan IN (${placeholders})
//         `,
//           lanList
//         );

//         const loanMap = new Map();
//         loanRows.forEach((r) => {
//           loanMap.set(r.lan, {
//             dealer: r.dealer || "Unknown Dealer",
//             district: r.district || "Unknown District",
//           });
//         });

//         for (const r of payRows) {
//           const amount = Number(r.amount || 0);
//           if (!amount) continue;

//           const info = loanMap.get(r.lan) || {
//             dealer: "Unknown Dealer",
//             district: "Unknown District",
//           };

//           if (
//             dealersFilter.length &&
//             !dealersFilter.includes(info.dealer)
//           )
//             continue;

//           if (
//             districtsFilter.length &&
//             !districtsFilter.includes(info.district)
//           )
//             continue;

//           if (
//             agentsFilter.length &&
//             !agentsFilter.includes(r.collectedBy)
//           )
//             continue;

//           const paymentDate = r.paymentDate
//             ? new Date(r.paymentDate)
//             : null;

//           allPayments.push({
//             amount,
//             paymentDate,
//             paymentMode: r.paymentMode,
//             collectedBy: r.collectedBy,
//             district: info.district,
//             dealer: info.dealer,
//             partner: p,
//           });

//           grandTotal += amount;

//           if (r.collectedBy) activeAgentsSet.add(r.collectedBy);

//           if (!dealersMap[info.dealer]) {
//             dealersMap[info.dealer] = {
//               dealer: info.dealer,
//               totalCollection: 0,
//               districts: {},
//             };
//           }

//           const dObj = dealersMap[info.dealer];
//           dObj.totalCollection += amount;

//           if (!dObj.districts[info.district]) {
//             dObj.districts[info.district] = {
//               district: info.district,
//               totalCollection: 0,
//               collectionAgents: {},
//             };
//           }

//           const distObj = dObj.districts[info.district];
//           distObj.totalCollection += amount;

//           if (!distObj.collectionAgents[r.collectedBy]) {
//             distObj.collectionAgents[r.collectedBy] = {
//               collectedBy: r.collectedBy,
//               totalCollection: 0,
//             };
//           }

//           distObj.collectionAgents[r.collectedBy].totalCollection +=
//             amount;
//         }
//       }

//       if (!Object.keys(dealersMap).length) {
//         return res.json({
//           partner: partnerQuery,
//           startDate,
//           endDate,
//           grandTotalCollection: 0,
//           activeLoans: 0,
//           activeAgents: 0,
//           charts: {
//             trend: { labels: [], data: [] },
//             paymentModes: { labels: [], data: [] },
//             agentPerformance: { labels: [], data: [] },
//           },
//           hierarchy: [],
//         });
//       }

//       // CALCULATE ACTIVE LOANS
//       let activeLoans = 0;

//       for (const p of partners) {
//         const repo = REPO[p];

//         let sql = `SELECT COUNT(*) AS cnt FROM ${repo.loanTable}`;
//         const where = [];
//         const params = [];

//         if (dealersFilter.length) {
//           where.push(
//             `dealer_name IN (${dealersFilter.map(() => "?").join(",")})`
//           );
//           params.push(...dealersFilter);
//         }

//         if (districtsFilter.length) {
//           where.push(
//             `district IN (${districtsFilter.map(() => "?").join(",")})`
//           );
//           params.push(...districtsFilter);
//         }

//         if (where.length) {
//           sql += " WHERE " + where.join(" AND ");
//         }

//         const rows = await SecondDataSource.query(sql, params);
//         activeLoans += Number(rows?.[0]?.cnt || 0);
//       }

//       const hierarchy = Object.values(dealersMap).map((dealerObj) => ({
//         dealer: dealerObj.dealer,
//         totalCollection: dealerObj.totalCollection,
//         districts: Object.values(dealerObj.districts).map((distObj) => ({
//           district: distObj.district,
//           totalCollection: distObj.totalCollection,
//           collectionAgents: Object.values(
//             distObj.collectionAgents
//           ),
//         })),
//       }));

//       const trend = buildTrendFromPayments(
//         allPayments,
//         period,
//         startDate,
//         endDate
//       );

//       const paymentModes =
//         buildPaymentModesFromPayments(allPayments);

//       const agentPerformance =
//         buildAgentPerformanceFromPayments(allPayments);

//       return res.json({
//         partner: partnerQuery,
//         startDate,
//         endDate,
//         grandTotalCollection: grandTotal,
//         activeLoans,
//         activeAgents: activeAgentsSet.size,
//         charts: {
//           trend,
//           paymentModes,
//           agentPerformance,
//         },
//         hierarchy,
//       });
//     } catch (err) {
//       console.error("superAdmin/collections error:", err);
//       return res.status(500).json({
//         message: "Internal server error",
//       });
//     }
//   }
// );

// export default router;



// routes/dashboard.js
import { Router } from "express";
import AppDataSource from "../../config/database.js";
import SecondDataSource from "../../config/database2.js";

import Payment from "../../entities/Payment.js";
import PaymentImage from "../../entities/PaymentImage.js";
import Repossession from "../../entities/Repossession.js";
// import EmbifiRepossession from "../../entities/EmbifiRepossession.js";
// import MalhotraRepossession from "../../entities/malhotraRepossession.js";

import { authenticateToken } from "../../middleware/auth.js";

const router = Router();

/* ======================================
      SHARED REPOSITORIES
====================================== */

const paymentRepository = AppDataSource.getRepository(Payment);
const repossessionRepository = AppDataSource.getRepository(Repossession);

/* ======================================
      UNIFIED REPOSITORY MAP
====================================== */

const REPO = {
  embifi: {
    payments: paymentRepository,
    repo: repossessionRepository,
    loanTable: "loan_booking_embifi",
    product: "embifi",
  },

  malhotra: {
    payments: paymentRepository,
    repo: repossessionRepository,
    loanTable: "loan_booking_ev",
    product: "malhotra",
  },
    heyev: {
    payments: paymentRepository,
    repo: repossessionRepository,
    loanTable: "loan_booking_hey_ev",
    product: "heyev",
  },
};

/* ======================================
                HELPERS
====================================== */

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const endOfDay = (d) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

const fmtDate = (d) =>
  new Date(d).toISOString().slice(0, 19).replace("T", " ");

function rangeForPeriod(period) {
  const now = new Date();
  if (!period || period === "all") return { start: null, end: null };

  switch (period) {
    case "day":
      return { start: startOfDay(now), end: endOfDay(now) };

    case "week": {
      const s = new Date(now);
      const dow = (s.getDay() + 6) % 7;
      s.setDate(s.getDate() - dow);
      return { start: startOfDay(s), end: endOfDay(now) };
    }

    case "year":
      return {
        start: startOfDay(new Date(now.getFullYear(), 0, 1)),
        end: endOfDay(now),
      };

    default: // month
      return {
        start: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)),
        end: endOfDay(now),
      };
  }
}

/* ======================================
           DASHBOARD BASIC METRICS
====================================== */


async function getStatsForProduct(product, loanTable, { start, end }) {
  // TOTAL COLLECTIONS (from payments table filtered by product)
  const qbTotal = paymentRepository
    .createQueryBuilder("p")
    .select("COALESCE(SUM(p.amount),0)", "total")
    .where("p.product = :product", { product });

  if (start && end) {
    qbTotal.andWhere("p.createdAt BETWEEN :s AND :e", {
      s: fmtDate(start),
      e: fmtDate(end),
    });
  }

  const { total } = await qbTotal.getRawOne();

  // ACTIVE LOANS (keeps using loanTable from SecondDataSource)
  const loanRows = await SecondDataSource.query(
    `SELECT COUNT(*) AS cnt FROM ${loanTable}`
  );
  const activeLoans = Number(loanRows[0].cnt || 0);
     
  // REPOSSESSIONS (from the central repossessions table)
  // Counts rows where partner matches and (optionally) repoDate is within range.
  const repoQB = repossessionRepository.createQueryBuilder("r").where("r.partner = :partner", {
    partner: product,
  });

  if (start && end) {
    repoQB.andWhere("r.repoDate BETWEEN :s AND :e", {
      s: fmtDate(start),
      e: fmtDate(end),
    });
  }

  const repossessions = await repoQB.getCount();

  // ACTIVE AGENTS (distinct collectors in payments table)
  const qbAgents = paymentRepository
    .createQueryBuilder("p")
    .select("COUNT(DISTINCT p.collectedBy)", "cnt")
    .where("p.product = :product", { product });

  if (start && end) {
    qbAgents.andWhere("p.createdAt BETWEEN :s AND :e", {
      s: fmtDate(start),
      e: fmtDate(end),
    });
  }

  const { cnt } = await qbAgents.getRawOne();

  return {
    totalCollections: Number(total || 0),
    activeLoans,
    repossessions: Number(repossessions || 0),
    activeAgents: Number(cnt || 0),
  };
}

/* ======================================
              TREND CHART
====================================== */

async function getTrendForProduct(product, period, { start, end }) {

  const qb = paymentRepository
    .createQueryBuilder("p")
    .select("p.createdAt", "date")
    .addSelect("p.amount", "amount")
    .where("p.product = :product", { product });

  if (start && end) {
    qb.andWhere("p.createdAt BETWEEN :s AND :e", {
      s: fmtDate(start),
      e: fmtDate(end),
    });
  }

  const rows = await qb.getRawMany();

  return {
    labels: rows.map((r) =>
      new Date(r.date).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    ),
    data: rows.map((r) => Number(r.amount)),
  };
}

/* ======================================
            PAYMENT MODES
====================================== */

async function getPaymentModesForProduct(product, { start, end }) {

  const qb = paymentRepository
    .createQueryBuilder("p")
    .select("p.paymentMode", "mode")
    .addSelect("COALESCE(SUM(p.amount),0)", "total")
    .where("p.product = :product", { product });

  if (start && end) {
    qb.andWhere("p.createdAt BETWEEN :s AND :e", {
      s: fmtDate(start),
      e: fmtDate(end),
    });
  }

  const rows = await qb.groupBy("mode").getRawMany();

  return {
    labels: rows.map((r) => r.mode || "Unknown"),
    data: rows.map((r) => Number(r.total)),
  };
}

/* ======================================
        AGENT PERFORMANCE
====================================== */

async function getAgentPerformanceForProduct(product, range) {
  const { start, end } = range;

  const qb = paymentRepository
    .createQueryBuilder("p")
    .select("p.collectedBy", "agent")
    .addSelect("COALESCE(SUM(p.amount),0)", "total")
    .where("p.product = :product", { product });

  if (start && end) {
    qb.andWhere("p.createdAt BETWEEN :s AND :e", {
      s: fmtDate(start),
      e: fmtDate(end),
    });
  }

  const rows = await qb
    .groupBy("agent")
    .orderBy("total", "DESC")
    .limit(5)
    .getRawMany();

  return {
    labels: rows.map((r) => r.agent || "Unknown"),
    data: rows.map((r) => Number(r.total)),
  };
}

/* ======================================
        STANDARD DASHBOARD API
====================================== */

router.get("/dashboard", async (req, res) => {
  try {
    const period = req.query.period?.toString() || "all";
    const partner = req.query.partner?.toString().toLowerCase();

    if (!REPO[partner]) {
      return res.status(400).json({ message: "Invalid partner selected" });
    }
    const { loanTable, product } = REPO[partner];
    const range = rangeForPeriod(period);
      
    const [stats, trend, modes, agents] = await Promise.all([
      getStatsForProduct(product, loanTable, range),
      getTrendForProduct(product, period, range),
      getPaymentModesForProduct(product, range),
      getAgentPerformanceForProduct(product, range),
    ]);

    res.json({
      partner,
      period,
      range: range.start
        ? {
            start: range.start.toISOString(),
            end: range.end.toISOString(),
          }
        : null,
      stats,
      charts: {
        trend,
        paymentModes: modes,
        agentPerformance: agents,
      },
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});
/* ======================================
   SUPERADMIN HELPERS
====================================== */

function buildTrendFromPayments(payments, period, start, end) {
  if (!payments.length) return { labels: [], data: [] };

  const valid = payments.filter((p) => p.paymentDate instanceof Date);

  if (!valid.length) return { labels: [], data: [] };

  const result = new Map();

  if (period === "day") {
    for (let h = 0; h < 24; h++) result.set(h, 0);
    valid.forEach((p) => {
      const h = p.paymentDate.getHours();
      result.set(h, result.get(h) + p.amount);
    });
    return {
      labels: [...result.keys()].map((h) => `${h}:00`),
      data: [...result.values()],
    };
  }

  if (period === "week") {
    const endD = end ? new Date(end) : new Date();
    const labels = [];
    const keys = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(endD);
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
      });
      labels.push(label);
      keys.push(d.toISOString().slice(0, 10));
      result.set(keys[i], 0);
    }
    valid.forEach((p) => {
      const k = p.paymentDate.toISOString().slice(0, 10);
      if (result.has(k)) result.set(k, result.get(k) + p.amount);
    });
    return {
      labels,
      data: keys.map((k) => result.get(k) || 0),
    };
  }

  // DEFAULT MONTH/YEAR
  const labels = [];
  const sums = new Map();

  valid.forEach((p) => {
    const key = `${p.paymentDate.getFullYear()}-${String(
      p.paymentDate.getMonth() + 1
    ).padStart(2, "0")}`;
    sums.set(key, (sums.get(key) || 0) + p.amount);
  });

  const sorted = [...sums.keys()].sort();

  sorted.forEach((k) => {
    const dt = new Date(k + "-01");
    labels.push(
      dt.toLocaleString("en-US", {
        month: "short",
        year: "2-digit",
      })
    );
  });

  return {
    labels,
    data: sorted.map((k) => sums.get(k)),
  };
}

function buildPaymentModesFromPayments(payments) {
  const map = new Map();
  payments.forEach((p) => {
    const key = p.paymentMode || "Unknown";
    map.set(key, (map.get(key) || 0) + p.amount);
  });
  return {
    labels: [...map.keys()],
    data: [...map.values()],
  };
}

function buildAgentPerformanceFromPayments(payments) {
  const map = new Map();
  payments.forEach((p) => {
    const key = p.collectedBy || "Unknown Agent";
    map.set(key, (map.get(key) || 0) + p.amount);
  });
  const sorted = [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  return {
    labels: sorted.map((x) => x[0]),
    data: sorted.map((x) => x[1]),
  };
}

/* ======================================
   SUPERADMIN COLLECTIONS API
====================================== */

router.get(
  "/superAdmin/collections",
  authenticateToken,
  async (req, res) => {
    try {
      if (req.user?.role !== "superadmin") {
        return res.status(403).json({
          message: "Only superadmin can access this report",
        });
      }

      const partnerQuery = (req.query.partner || "all").toLowerCase();
      const period = req.query.period || "all";

      const { startDate, endDate } = req.query;

      const dealersFilter = (req.query.dealers || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const districtsFilter = (req.query.districts || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const agentsFilter = (req.query.agents || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      let partners;
      if (partnerQuery === "all") {
        const uniqueProducts = await paymentRepository.createQueryBuilder("p").select("DISTINCT p.product", "product").getRawMany();
        partners = uniqueProducts.map(r => r.product?.toLowerCase()).filter(p => p && REPO[p]);
      } else {
        partners = REPO[partnerQuery] ? [partnerQuery] : [];
      }

      // CALCULATE ACTIVE LOANS
      let activeLoans = 0;

      for (const p of partners) {
        const repo = REPO[p];

        let sql = `SELECT COUNT(*) AS cnt FROM ${repo.loanTable}`;
        const where = [];
        const params = [];

        if (dealersFilter.length) {
          where.push(
            `dealer_name IN (${dealersFilter.map(() => "?").join(",")})`
          );
          params.push(...dealersFilter);
        }

        if (districtsFilter.length) {
          where.push(
            `district IN (${districtsFilter.map(() => "?").join(",")})`
          );
          params.push(...districtsFilter);
        }

        if (where.length) {
          sql += " WHERE " + where.join(" AND ");
        }

        const rows = await SecondDataSource.query(sql, params);
        activeLoans += Number(rows?.[0]?.cnt || 0);
      }

      let grandTotal = 0;
      let activeAgentsSet = new Set();
      let dealersMap = {};
      let allPayments = [];

      for (const p of partners) {
        const repo = REPO[p];

        const qb = paymentRepository
          .createQueryBuilder("p")
          .select([
            "p.loanId AS lan",
            "p.amount AS amount",
            "p.paymentDate AS paymentDate",
            "p.paymentMode AS paymentMode",
            "p.collectedBy AS collectedBy",
          ])
          .where("p.product = :product", {
            product: repo.product,
          });

        if (startDate && endDate) {
          qb.andWhere("DATE(p.paymentDate) BETWEEN :s AND :e", {
            s: startDate,
            e: endDate,
          });
        }

        if (agentsFilter.length) {
          qb.andWhere("p.collectedBy IN (:...agents)", {
            agents: agentsFilter,
          });
        }

        const payRows = await qb.getRawMany();

        if (!payRows.length) continue;

        const lanList = payRows
          .map((r) => r.lan)
          .filter((x) => x);

        if (!lanList.length) continue;

        const placeholders = lanList.map(() => "?").join(",");

        const loanRows = await SecondDataSource.query(
          `
          SELECT lan, dealer_name AS dealer, district
          FROM ${repo.loanTable}
          WHERE lan IN (${placeholders})
        `,
          lanList
        );

        const loanMap = new Map();
        loanRows.forEach((r) => {
          loanMap.set(r.lan, {
            dealer: r.dealer || "Unknown Dealer",
            district: r.district || "Unknown District",
          });
        });

        for (const r of payRows) {
          const amount = Number(r.amount || 0);
          if (!amount) continue;

          const info = loanMap.get(r.lan) || {
            dealer: "Unknown Dealer",
            district: "Unknown District",
          };

          if (
            dealersFilter.length &&
            !dealersFilter.includes(info.dealer)
          )
            continue;

          if (
            districtsFilter.length &&
            !districtsFilter.includes(info.district)
          )
            continue;

          if (
            agentsFilter.length &&
            !agentsFilter.includes(r.collectedBy)
          )
            continue;

          const paymentDate = r.paymentDate
            ? new Date(r.paymentDate)
            : null;

          allPayments.push({
            amount,
            paymentDate,
            paymentMode: r.paymentMode,
            collectedBy: r.collectedBy,
            district: info.district,
            dealer: info.dealer,
            partner: p,
          });

          grandTotal += amount;

          if (r.collectedBy) activeAgentsSet.add(r.collectedBy);

          if (!dealersMap[info.dealer]) {
            dealersMap[info.dealer] = {
              dealer: info.dealer,
              totalCollection: 0,
              districts: {},
            };
          }

          const dObj = dealersMap[info.dealer];
          dObj.totalCollection += amount;

          if (!dObj.districts[info.district]) {
            dObj.districts[info.district] = {
              district: info.district,
              totalCollection: 0,
              collectionAgents: {},
            };
          }

          const distObj = dObj.districts[info.district];
          distObj.totalCollection += amount;

          if (!distObj.collectionAgents[r.collectedBy]) {
            distObj.collectionAgents[r.collectedBy] = {
              collectedBy: r.collectedBy,
              totalCollection: 0,
            };
          }

          distObj.collectionAgents[r.collectedBy].totalCollection +=
            amount;
        }
      }

      if (!Object.keys(dealersMap).length) {
        return res.json({
          partner: partnerQuery,
          startDate,
          endDate,
          grandTotalCollection: 0,
          activeLoans: 0,
          activeAgents: 0,
          charts: {
            trend: { labels: [], data: [] },
            paymentModes: { labels: [], data: [] },
            agentPerformance: { labels: [], data: [] },
          },
          hierarchy: [],
        });
      }

      const hierarchy = Object.values(dealersMap).map((dealerObj) => ({
        dealer: dealerObj.dealer,
        totalCollection: dealerObj.totalCollection,
        districts: Object.values(dealerObj.districts).map((distObj) => ({
          district: distObj.district,
          totalCollection: distObj.totalCollection,
          collectionAgents: Object.values(
            distObj.collectionAgents
          ),
        })),
      }));

      const trend = buildTrendFromPayments(
        allPayments,
        period,
        startDate,
        endDate
      );

      const paymentModes =
        buildPaymentModesFromPayments(allPayments);

      const agentPerformance =
        buildAgentPerformanceFromPayments(allPayments);

      return res.json({
        partner: partnerQuery,
        startDate,
        endDate,
        grandTotalCollection: grandTotal,
        activeLoans,
        activeAgents: activeAgentsSet.size,
        charts: {
          trend,
          paymentModes,
          agentPerformance,
        },
        hierarchy,
      });
    } catch (err) {
      console.error("superAdmin/collections error:", err);
      return res.status(500).json({
        message: "Internal server error",
      });
    }
  }
);

export default router;
