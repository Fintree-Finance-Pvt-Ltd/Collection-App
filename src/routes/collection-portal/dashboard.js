// // routes/dashboard.js
// import { Router } from "express";
// import AppDataSource from "../../config/database.js";

// import embifiReceipt from "../../entities/embifiReceipt.js";
// import malhotraReceipt from "../../entities/malhotraReceipt.js";

// import EmbifiRepossession from "../../entities/EmbifiRepossession.js";
// import MalhotraRepossession from "../../entities/malhotraRepossession.js";

// import Embifi from "../../entities/Embifi.js";
// import { fetchMalhotraActiveLoans } from "../../utils/index.js";
// import { authenticateToken } from "../../middleware/auth.js";
// import SecondDataSource from "../../config/database2.js"; // or "../config/secondDatabase.js" – match your actual file

// const router = Router();

// /* ======================================
//       REPOSITORY MAP (SWITCH PARTNER)
// ====================================== */
// const REPO = {
//   embifi: {
//     payments: AppDataSource.getRepository(embifiReceipt),
//     loans: AppDataSource.getRepository(Embifi),
//     repo: AppDataSource.getRepository(EmbifiRepossession)
//   },
//   malhotra: {
//     payments: AppDataSource.getRepository(malhotraReceipt),
//     loans: null, // handled via API
//     repo: AppDataSource.getRepository(MalhotraRepossession)
//   }
// };

// /* ======================================
//                 HELPERS
// ====================================== */

// const startOfDay = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
// const endOfDay = d => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };
// const fmtDate = d => new Date(d).toISOString().slice(0, 19).replace("T", " ");

// function rangeForPeriod(period) {
//   if (!period || period === "all") return { start: null, end: null };

//   const now = new Date();
//   switch (period) {
//     case "day": return { start: startOfDay(now), end: endOfDay(now) };

//     case "week": {
//       const s = new Date(now);
//       const dow = (s.getDay() + 6) % 7;
//       s.setDate(s.getDate() - dow);
//       return { start: startOfDay(s), end: endOfDay(now) };
//     }

//     case "year":
//       return {
//         start: startOfDay(new Date(now.getFullYear(), 0, 1)),
//         end: endOfDay(now)
//       };

//     default: // month
//       return {
//         start: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)),
//         end: endOfDay(now)
//       };
//   }
// }

// /* ======================================
//            DASHBOARD: BASIC METRICS
// ====================================== */

// async function getStats(repo, partner, { start, end }) {
//   const paymentRepo = repo.payments;

//   // total collections
//   const qbTotal = paymentRepo
//     .createQueryBuilder("p")
//     .select("COALESCE(SUM(p.amount),0)", "total");

//   if (start && end)
//     qbTotal.where("p.createdAt BETWEEN :s AND :e", { s: fmtDate(start), e: fmtDate(end) });

//   const { total } = await qbTotal.getRawOne();

//   // active loans
//   let activeLoans = 0;
//   if (partner === "embifi") {
//     activeLoans = await repo.loans.count();
//   } else {
//     activeLoans = await fetchMalhotraActiveLoans();
//   }

//   // repossessions
//   const repossessions = await repo.repo.count();

//   // active agents
//   const qbAgents = paymentRepo
//     .createQueryBuilder("p")
//     .select("COUNT(DISTINCT p.collectedBy)", "cnt");

//   if (start && end)
//     qbAgents.where("p.createdAt BETWEEN :s AND :e", { s: fmtDate(start), e: fmtDate(end) });

//   const { cnt } = await qbAgents.getRawOne();

//   return {
//     totalCollections: Number(total || 0),
//     activeLoans,
//     repossessions,
//     activeAgents: Number(cnt || 0)
//   };
// }

// /* ======================================
//           TREND (UNCHANGED LOGIC)
// ====================================== */

// async function getTrend(repo, period, { start, end }) {
//   const paymentRepo = repo.payments;
//   const now = new Date();

//   // ALL TIME
//   if (!start || !end) {
//     const rows = await paymentRepo
//       .createQueryBuilder("p")
//       .select("p.createdAt", "date")
//       .addSelect("p.amount", "total")
//       .orderBy("p.createdAt", "ASC")
//       .getRawMany();

//     return {
//       labels: rows.map(r =>
//         new Date(r.date).toLocaleString("en-US", {
//           year: "numeric", month: "short", day: "numeric",
//           hour: "2-digit", minute: "2-digit"
//         })
//       ),
//       data: rows.map(r => Number(r.total))
//     };
//   }

//   /* ===== DAY ===== */
//   if (period === "day") {
//     const rows = await paymentRepo
//       .createQueryBuilder("p")
//       .select("HOUR(p.createdAt)", "bucket")
//       .addSelect("COALESCE(SUM(p.amount),0)", "total")
//       .where("p.createdAt BETWEEN :s AND :e", { s: fmtDate(start), e: fmtDate(end) })
//       .groupBy("bucket").orderBy("bucket", "ASC")
//       .getRawMany();

//     const labels = Array.from({ length: 24 }, (_, h) => `${h}:00`);
//     const map = new Map(rows.map(r => [Number(r.bucket), Number(r.total)]));

//     return { labels, data: labels.map((_, h) => map.get(h) || 0) };
//   }

//   /* ===== WEEK ===== */
//   if (period === "week") {
//     const rows = await paymentRepo
//       .createQueryBuilder("p")
//       .select("DATE(p.createdAt)", "d")
//       .addSelect("COALESCE(SUM(p.amount),0)", "total")
//       .where("p.createdAt BETWEEN :s AND :e", { s: fmtDate(start), e: fmtDate(end) })
//       .groupBy("d").orderBy("d", "ASC")
//       .getRawMany();

//     const labels = [];
//     const map = new Map(
//       rows.map(r => [
//         new Date(r.d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
//         Number(r.total)
//       ])
//     );

//     for (let i = 6; i >= 0; i--) {
//       const d = new Date(now);
//       d.setDate(now.getDate() - i);
//       labels.push(d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }));
//     }

//     return { labels, data: labels.map(l => map.get(l) || 0) };
//   }

//   /* ===== YEAR ===== */
//   if (period === "year") {
//     const thisYear = now.getFullYear();
//     const labels = [];
//     for (let y = thisYear - 4; y <= thisYear; y++) labels.push(String(y));

//     const rows = await paymentRepo
//       .createQueryBuilder("p")
//       .select("YEAR(p.createdAt)", "y")
//       .addSelect("COALESCE(SUM(p.amount),0)", "total")
//       .where("YEAR(p.createdAt) BETWEEN :a AND :b", { a: thisYear - 4, b: thisYear })
//       .groupBy("y").orderBy("y", "ASC")
//       .getRawMany();

//     const map = new Map(rows.map(r => [String(r.y), Number(r.total)]));

//     return { labels, data: labels.map(l => map.get(l) || 0) };
//   }

//   /* ===== MONTH (7-MONTH WINDOW) ===== */
//   const labels = [];
//   const ymKeys = [];

//   for (let i = 6; i >= 0; i--) {
//     const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
//     labels.push(d.toLocaleString("en-US", { month: "short" }));
//     ymKeys.push({ y: d.getFullYear(), m: d.getMonth() + 1 });
//   }

//   const minDate = new Date(ymKeys[0].y, ymKeys[0].m - 1, 1);

//   const rows = await paymentRepo
//     .createQueryBuilder("p")
//     .select("YEAR(p.createdAt)", "y")
//     .addSelect("MONTH(p.createdAt)", "m")
//     .addSelect("COALESCE(SUM(p.amount),0)", "total")
//     .where("p.createdAt BETWEEN :s AND :e", { s: fmtDate(minDate), e: fmtDate(end) })
//     .groupBy("y, m").orderBy("y", "ASC").addOrderBy("m", "ASC")
//     .getRawMany();

//   const map = new Map(rows.map(r => [`${r.y}-${String(r.m).padStart(2, "0")}`, Number(r.total)]));

//   return {
//     labels,
//     data: ymKeys.map(({ y, m }) =>
//       map.get(`${y}-${String(m).padStart(2, "0")}`) || 0
//     )
//   };
// }

// /* ======================================
//             PAYMENT MODES
// ====================================== */

// async function getPaymentModes(repo, { start, end }) {
//   const qb = repo.payments
//     .createQueryBuilder("p")
//     .select("p.paymentMode", "mode")
//     .addSelect("COALESCE(SUM(p.amount),0)", "total");

//   if (start && end)
//     qb.where("p.createdAt BETWEEN :s AND :e", { s: fmtDate(start), e: fmtDate(end) });

//   const rows = await qb.groupBy("mode").orderBy("total", "DESC").getRawMany();

//   return {
//     labels: rows.map(r => r.mode || "Unknown"),
//     data: rows.map(r => Number(r.total))
//   };
// }

// /* ======================================
//         AGENT PERFORMANCE
// ====================================== */

// async function getAgentPerformance(repo, { start, end }) {
//   const qb = repo.payments
//     .createQueryBuilder("p")
//     .select("p.collectedBy", "agent")
//     .addSelect("COALESCE(SUM(p.amount),0)", "total");

//   if (start && end)
//     qb.where("p.createdAt BETWEEN :s AND :e", { s: fmtDate(start), e: fmtDate(end) });

//   const rows = await qb.groupBy("agent").orderBy("total", "DESC").limit(5).getRawMany();

//   return {
//     labels: rows.map(r => r.agent || "Unknown"),
//     data: rows.map(r => Number(r.total))
//   };
// }

// /* ======================================
//         UNIFIED DASHBOARD ENDPOINT
// ====================================== */

// router.get("/dashboard", async (req, res) => {
//   try {
//     const period = (req.query.period).toString();
//     const partner = req.query.partner?.toLowerCase();
    
//     if (!REPO[partner]) {
//       return res.status(400).json({ message: "Invalid partner selected" });
//     }

//     const repo = REPO[partner];
//     const range = rangeForPeriod(period);

//     const [stats, trend, modes, agents] = await Promise.all([
//       getStats(repo, partner, range),
//       getTrend(repo, period, range),
//       getPaymentModes(repo, range),
//       getAgentPerformance(repo, range)
//     ]);

//     res.json({
//       partner,
//       period,
//       range: range.start ? {
//         start: range.start.toISOString(),
//         end: range.end.toISOString()
//       } : null,
//       stats,
//       charts: {
//         trend,
//         paymentModes: modes,
//         agentPerformance: agents
//       }
//     });

//   } catch (err) {
//     console.error("Dashboard error:", err);
//     res.status(500).json({ message: "Internal server error" });
//   }
// });







// /// this for only super admin
// function buildTrendFromPayments(payments, period, startDateStr, endDateStr) {
//   if (!payments.length) return { labels: [], data: [] };

//   const paymentsWithDate = payments.filter((p) => p.paymentDate instanceof Date);
//   if (!paymentsWithDate.length) return { labels: [], data: [] };

//   const toKey = (d) => d.toISOString().slice(0, 10); // yyyy-mm-dd

//   // DAY: 24 hourly buckets
//   if (period === "day") {
//     const buckets = Array(24).fill(0);
//     paymentsWithDate.forEach((p) => {
//       const h = p.paymentDate.getHours();
//       buckets[h] += p.amount;
//     });
//     const labels = Array.from({ length: 24 }, (_, i) => `${i}:00`);
//     return { labels, data: buckets };
//   }

//   // WEEK: last 7 days
//   if (period === "week") {
//     const end = endDateStr ? new Date(endDateStr) : new Date();
//     const labels = [];
//     const dateKeys = [];
//     for (let i = 6; i >= 0; i--) {
//       const d = new Date(end);
//       d.setDate(end.getDate() - i);
//       labels.push(
//         d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
//       );
//       dateKeys.push(toKey(d));
//     }
//     const sums = Object.fromEntries(dateKeys.map((k) => [k, 0]));
//     paymentsWithDate.forEach((p) => {
//       const k = toKey(p.paymentDate);
//       if (k in sums) sums[k] += p.amount;
//     });
//     const data = dateKeys.map((k) => sums[k]);
//     return { labels, data };
//   }

//   // MONTH: current month day-wise
//   if (period === "month") {
//     const end = endDateStr ? new Date(endDateStr) : new Date();
//     const year = end.getFullYear();
//     const month = end.getMonth();
//     const daysInMonth = new Date(year, month + 1, 0).getDate();
//     const labels = [];
//     const dateKeys = [];
//     for (let d = 1; d <= daysInMonth; d++) {
//       const dt = new Date(year, month, d);
//       labels.push(
//         dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
//       );
//       dateKeys.push(toKey(dt));
//     }
//     const sums = Object.fromEntries(dateKeys.map((k) => [k, 0]));
//     paymentsWithDate.forEach((p) => {
//       const k = toKey(p.paymentDate);
//       if (k in sums) sums[k] += p.amount;
//     });
//     const data = dateKeys.map((k) => sums[k]);
//     return { labels, data };
//   }

//   // YEAR: current year month-wise
//   if (period === "year") {
//     const end = endDateStr ? new Date(endDateStr) : new Date();
//     const year = end.getFullYear();
//     const labels = [
//       "Jan",
//       "Feb",
//       "Mar",
//       "Apr",
//       "May",
//       "Jun",
//       "Jul",
//       "Aug",
//       "Sep",
//       "Oct",
//       "Nov",
//       "Dec",
//     ];
//     const buckets = Array(12).fill(0);
//     paymentsWithDate.forEach((p) => {
//       const d = p.paymentDate;
//       if (d.getFullYear() === year) {
//         const m = d.getMonth();
//         buckets[m] += p.amount;
//       }
//     });
//     return { labels, data: buckets };
//   }

//   // ALL: month-year buckets across all data
//   let minDate = paymentsWithDate[0].paymentDate;
//   let maxDate = paymentsWithDate[0].paymentDate;
//   paymentsWithDate.forEach((p) => {
//     if (p.paymentDate < minDate) minDate = p.paymentDate;
//     if (p.paymentDate > maxDate) maxDate = p.paymentDate;
//   });

//   const months = [];
//   const labels = [];
//   const cursor = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
//   const end = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);

//   while (cursor <= end) {
//     const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
//     months.push(key);
//     labels.push(
//       cursor.toLocaleString("en-US", {
//         month: "short",
//         year: "2-digit",
//       })
//     );
//     cursor.setMonth(cursor.getMonth() + 1);
//   }

//   const sums = Object.fromEntries(months.map((k) => [k, 0]));
//   paymentsWithDate.forEach((p) => {
//     const key = `${p.paymentDate.getFullYear()}-${String(
//       p.paymentDate.getMonth() + 1
//     ).padStart(2, "0")}`;
//     if (key in sums) sums[key] += p.amount;
//   });

//   const data = months.map((k) => sums[k]);
//   return { labels, data };
// }

// function buildPaymentModesFromPayments(payments) {
//   const map = new Map();
//   payments.forEach((p) => {
//     const mode = p.paymentMode || "Unknown";
//     const prev = map.get(mode) || 0;
//     map.set(mode, prev + p.amount);
//   });
//   return {
//     labels: Array.from(map.keys()),
//     data: Array.from(map.values()),
//   };
// }

// function buildAgentPerformanceFromPayments(payments) {
//   const map = new Map();
//   payments.forEach((p) => {
//     const agent = p.collectedBy || "Unknown Agent";
//     const prev = map.get(agent) || 0;
//     map.set(agent, prev + p.amount);
//   });
//   const arr = Array.from(map.entries())
//     .map(([agent, total]) => ({ agent, total }))
//     .sort((a, b) => b.total - a.total)
//     .slice(0, 5);
//   return {
//     labels: arr.map((x) => x.agent),
//     data: arr.map((x) => x.total),
//   };
// }

// /* ======================================
//    SUPERADMIN COLLECTIONS (DASHBOARD)
//    PATH: GET /superAdmin/collections
// ====================================== */
// /**
//  * Query params:
//  * - partner: embifi | malhotra | all (default all)
//  * - period: day|week|month|year|all   (for trend bucketing)
//  * - startDate, endDate: yyyy-mm-dd    (optional date filter on paymentDate)
//  * - dealers: comma separated dealer names (optional)
//  * - districts: comma separated district names (optional)
//  * - agents: comma separated collectedBy names (optional)
//  */
// router.get(
//   "/superAdmin/collections",
//   authenticateToken,
//   async (req, res) => {
//     try {
//       const userRole = req.user?.role;

//       if (userRole !== "superadmin") {
//         return res
//           .status(403)
//           .json({ message: "Only superadmin can access this report." });
//       }

//       const partnerQuery = (req.query.partner || "all").toLowerCase();
//       const period = (req.query.period || "all").toString();

//       if (
//         partnerQuery !== "all" &&
//         !["embifi", "malhotra"].includes(partnerQuery)
//       ) {
//         return res
//           .status(400)
//           .json({ message: "partner must be embifi, malhotra or all" });
//       }

//       const partnersToProcess =
//         partnerQuery === "all" ? ["embifi", "malhotra"] : [partnerQuery];

//       const { startDate, endDate } = req.query;

//       // Filters
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

//       // Global accumulators
//       const dealersMap = {}; // Dealer -> { dealer, totalCollection, districts: { ... } }
//       let grandTotalCollection = 0;
//       const activeAgentsSet = new Set();
//       const allPayments = []; // for charts

//       // ---- MAIN LOOP: PARTNERS → PAYMENTS → LOAN TABLE ----
//       for (const p of partnersToProcess) {
//         const paymentRepo =
//           p === "embifi"
//             ? AppDataSource.getRepository(embifiReceipt)
//             : AppDataSource.getRepository(malhotraReceipt);

//         // 1) ALL payments (not grouped) in date range
//         const qb = paymentRepo
//           .createQueryBuilder("p")
//           .select("p.loanId", "lan")
//           .addSelect("p.collectedBy", "collectedBy")
//           .addSelect("p.amount", "amount")
//           .addSelect("p.paymentDate", "paymentDate")
//           .addSelect("p.paymentMode", "paymentMode");

//         if (startDate && endDate) {
//           qb.where("DATE(p.paymentDate) BETWEEN :s AND :e", {
//             s: startDate,
//             e: endDate,
//           });
//         }

//         if (agentsFilter.length > 0) {
//           qb.andWhere("p.collectedBy IN (:...agents)", {
//             agents: agentsFilter,
//           });
//         }

//         const rows = await qb.getRawMany();
//         if (!rows.length) continue;

//         // 2) Loan info from second DB
//         const lanList = rows
//           .map((r) => r.lan)
//           .filter((lan) => lan && lan !== "");

//         if (!lanList.length) continue;

//         const loanTable =
//           p === "embifi" ? "loan_booking_embifi" : "loan_booking_ev";

//         const placeholders = lanList.map(() => "?").join(",");
//         const loanRows = await SecondDataSource.query(
//           `
//           SELECT 
//             lan,
//             dealer_name AS dealer,
//             district    AS district
//           FROM ${loanTable}
//           WHERE lan IN (${placeholders})
//         `,
//           lanList
//         );

//         const loanMap = new Map();
//         for (const row of loanRows) {
//           loanMap.set(row.lan, {
//             dealer: row.dealer || "Unknown Dealer",
//             district: row.district || "Unknown District",
//           });
//         }

//         // 3) Merge: apply filters + build hierarchy + chart payments
//         for (const r of rows) {
//           const amount = Number(r.amount || 0);
//           if (!amount) continue;

//           const lan = r.lan;
//           const baseInfo = loanMap.get(lan) || {
//             dealer: "Unknown Dealer",
//             district: "Unknown District",
//           };

//           const dealerName = baseInfo.dealer;
//           const districtName = baseInfo.district;
//           const agentName = r.collectedBy || "Unknown Agent";
//           const paymentDate = r.paymentDate
//             ? new Date(r.paymentDate)
//             : null;

//           // Apply filters
//           if (
//             dealersFilter.length > 0 &&
//             !dealersFilter.includes(dealerName)
//           ) {
//             continue;
//           }
//           if (
//             districtsFilter.length > 0 &&
//             !districtsFilter.includes(districtName)
//           ) {
//             continue;
//           }
//           if (
//             agentsFilter.length > 0 &&
//             !agentsFilter.includes(agentName)
//           ) {
//             continue;
//           }

//           // Add to payments pool for charts
//           allPayments.push({
//             amount,
//             paymentDate,
//             paymentMode: r.paymentMode || null,
//             collectedBy: agentName,
//             dealer: dealerName,
//             district: districtName,
//             partner: p,
//           });

//           // Update total & active agents
//           grandTotalCollection += amount;
//           if (agentName && agentName !== "Unknown Agent") {
//             activeAgentsSet.add(agentName);
//           }

//           // Build hierarchy: dealer -> district -> agent
//           if (!dealersMap[dealerName]) {
//             dealersMap[dealerName] = {
//               dealer: dealerName,
//               totalCollection: 0,
//               districts: {},
//             };
//           }
//           const dealerObj = dealersMap[dealerName];
//           dealerObj.totalCollection += amount;

//           if (!dealerObj.districts[districtName]) {
//             dealerObj.districts[districtName] = {
//               district: districtName,
//               totalCollection: 0,
//               collectionAgents: {},
//             };
//           }
//           const distObj = dealerObj.districts[districtName];
//           distObj.totalCollection += amount;

//           if (!distObj.collectionAgents[agentName]) {
//             distObj.collectionAgents[agentName] = {
//               collectedBy: agentName,
//               totalCollection: 0,
//             };
//           }
//           distObj.collectionAgents[agentName].totalCollection += amount;
//         }
//       }

//       // if no data → empty response
//       if (Object.keys(dealersMap).length === 0) {
//         return res.json({
//           partner: partnerQuery,
//           startDate: startDate || null,
//           endDate: endDate || null,
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

//       // ACTIVE LOANS (from second DB, respecting dealer/district filters)
//       let activeLoans = 0;
//       for (const p of partnersToProcess) {
//         const loanTable =
//           p === "embifi" ? "loan_booking_embifi" : "loan_booking_ev";

//         const whereClauses = [];
//         const params = [];

//         if (dealersFilter.length > 0) {
//           whereClauses.push(
//             `dealer_name IN (${dealersFilter.map(() => "?").join(",")})`
//           );
//           params.push(...dealersFilter);
//         }

//         if (districtsFilter.length > 0) {
//           whereClauses.push(
//             `district IN (${districtsFilter.map(() => "?").join(",")})`
//           );
//           params.push(...districtsFilter);
//         }

//         let sql = `SELECT COUNT(*) AS cnt FROM ${loanTable}`;
//         if (whereClauses.length) {
//           sql += " WHERE " + whereClauses.join(" AND ");
//         }

//         const rows = await SecondDataSource.query(sql, params);
//         const row = rows?.[0] || {};
//         const cnt =
//           row.cnt ??
//           row.CNT ??
//           Object.values(row)[0] ??
//           0;

//         activeLoans += Number(cnt || 0);
//       }

//       const activeAgents = activeAgentsSet.size;

//       // Charts from filtered payments
//       const trend = buildTrendFromPayments(
//         allPayments,
//         period,
//         startDate,
//         endDate
//       );
//       const paymentModes = buildPaymentModesFromPayments(allPayments);
//       const agentPerformance =
//         buildAgentPerformanceFromPayments(allPayments);

//       // Hierarchy → arrays
//       const hierarchy = Object.values(dealersMap).map((dealerObj) => ({
//         dealer: dealerObj.dealer,
//         totalCollection: dealerObj.totalCollection,
//         districts: Object.values(dealerObj.districts).map((distObj) => ({
//           district: distObj.district,
//           totalCollection: distObj.totalCollection,
//           collectionAgents: Object.values(distObj.collectionAgents).map(
//             (a) => ({
//               collectedBy: a.collectedBy,
//               totalCollection: a.totalCollection,
//             })
//           ),
//         })),
//       }));

//       return res.json({
//         partner: partnerQuery,
//         startDate: startDate || null,
//         endDate: endDate || null,
//         grandTotalCollection,
//         activeLoans,
//         activeAgents,
//         charts: {
//           trend,
//           paymentModes,
//           agentPerformance,
//         },
//         hierarchy,
//       });
//     } catch (err) {
//       console.error("superAdmin/collections error:", err);
//       return res
//         .status(500)
//         .json({ message: "Internal server error" });
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

import EmbifiRepossession from "../../entities/EmbifiRepossession.js";
import MalhotraRepossession from "../../entities/malhotraRepossession.js";

import { authenticateToken } from "../../middleware/auth.js";

const router = Router();

/* ======================================
      UNIFIED REPOSITORY MAP
====================================== */

const REPO = {
  embifi: {
    payments: AppDataSource.getRepository(Payment),
    repo: AppDataSource.getRepository(EmbifiRepossession),
    loanTable: "loan_booking_embifi",
    product: "embifi",
  },

  malhotra: {
    payments: AppDataSource.getRepository(Payment),
    repo: AppDataSource.getRepository(MalhotraRepossession),
    loanTable: "loan_booking_ev",
    product: "malhotra",
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

    case "week":
      const s = new Date(now);
      const dow = (s.getDay() + 6) % 7;
      s.setDate(s.getDate() - dow);
      return { start: startOfDay(s), end: endOfDay(now) };

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

async function getStats(repo, partner, { start, end }) {
  const paymentRepo = repo.payments;

  // TOTAL COLLECTIONS
  const qbTotal = paymentRepo
    .createQueryBuilder("p")
    .select("COALESCE(SUM(p.amount),0)", "total")
    .where("p.product = :product", { product: repo.product });

  if (start && end) {
    qbTotal.andWhere("p.createdAt BETWEEN :s AND :e", {
      s: fmtDate(start),
      e: fmtDate(end),
    });
  }

  const { total } = await qbTotal.getRawOne();

  // ACTIVE LOANS
  const loanRows = await SecondDataSource.query(
    `SELECT COUNT(*) AS cnt FROM ${repo.loanTable}`
  );
  const activeLoans = Number(loanRows[0].cnt || 0);

  // REPOSSESSIONS
  const repossessions = await repo.repo.count();

  // ACTIVE AGENTS
  const qbAgents = paymentRepo
    .createQueryBuilder("p")
    .select("COUNT(DISTINCT p.collectedBy)", "cnt")
    .where("p.product = :product", { product: repo.product });

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
    repossessions,
    activeAgents: Number(cnt || 0),
  };
}

/* ======================================
              TREND CHART
====================================== */

async function getTrend(repo, period, { start, end }) {
  const paymentRepo = repo.payments;

  const qb = paymentRepo
    .createQueryBuilder("p")
    .select("p.createdAt", "date")
    .addSelect("p.amount", "amount")
    .where("p.product = :product", { product: repo.product });

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

async function getPaymentModes(repo, { start, end }) {
  const qb = repo.payments
    .createQueryBuilder("p")
    .select("p.paymentMode", "mode")
    .addSelect("COALESCE(SUM(p.amount),0)", "total")
    .where("p.product = :product", { product: repo.product });

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

async function getAgentPerformance(repo, range) {
  const { start, end } = range;

  const qb = repo.payments
    .createQueryBuilder("p")
    .select("p.collectedBy", "agent")
    .addSelect("COALESCE(SUM(p.amount),0)", "total")
    .where("p.product = :product", { product: repo.product });

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
    const partner = req.query.partner?.toLowerCase();

    if (!REPO[partner]) {
      return res.status(400).json({ message: "Invalid partner selected" });
    }

    const repo = REPO[partner];
    const range = rangeForPeriod(period);

    const [stats, trend, modes, agents] = await Promise.all([
      getStats(repo, partner, range),
      getTrend(repo, period, range),
      getPaymentModes(repo, range),
      getAgentPerformance(repo, range),
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

      const partners =
        partnerQuery === "all"
          ? ["embifi", "malhotra"]
          : [partnerQuery];

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

      let grandTotal = 0;
      let activeAgentsSet = new Set();
      let dealersMap = {};
      let allPayments = [];

      const paymentsRepo = AppDataSource.getRepository(Payment);

      for (const p of partners) {
        const repo = REPO[p];

        const qb = paymentsRepo
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

