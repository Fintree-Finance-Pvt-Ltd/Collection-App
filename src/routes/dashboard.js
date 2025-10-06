// routes/dashboard.js
import { Router } from "express";
import AppDataSource from "../config/database.js";
import User from "../entities/User.js";
import paymentsDetails from "../entities/paymentsDetails.js";
import Repossession from "../entities/Repossession.js";
import Embifi from "../entities/Embifi.js";
// import { authenticateToken } from "../middleware/auth.js"; // add back if you want

const router = Router();

const userRepo = AppDataSource.getRepository(User);
const paymentRepo = AppDataSource.getRepository(paymentsDetails);
const repossessionRepo = AppDataSource.getRepository(Repossession);
const embifiRepo = AppDataSource.getRepository(Embifi);

/* ========= helpers ========= */
const startOfDay = (d) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
const endOfDay   = (d) => { const x = new Date(d); x.setHours(23,59,59,999); return x; };
const fmtDate    = (d) => new Date(d).toISOString().slice(0,19).replace("T"," ");

function rangeForPeriod(period) {
  // default to ALL if not provided
  if (!period || period === "all") return { start: null, end: null };

  const now = new Date();
  switch (period) {
    case "day":   return { start: startOfDay(now), end: endOfDay(now) };
    case "week": {
      const s = new Date(now);
      const dow = (s.getDay() + 6) % 7; // Mon=0
      s.setDate(s.getDate() - dow);
      return { start: startOfDay(s), end: endOfDay(now) };
    }
    case "year":  return { start: startOfDay(new Date(now.getFullYear(), 0, 1)), end: endOfDay(now) };
    case "month":
    default:      return { start: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)), end: endOfDay(now) };
  }
}

/* ========= queries ========= */
async function getStats({ start, end }) {
  // total collections by createdAt (conditionally filtered)
  const qbTotal = paymentRepo
    .createQueryBuilder("p")
    .select("COALESCE(SUM(p.amount),0)", "total");
  if (start && end) qbTotal.where("p.createdAt BETWEEN :s AND :e", { s: fmtDate(start), e: fmtDate(end) });
  const { total } = await qbTotal.getRawOne();

  // simple counts (adjust where if you need)
  const activeLoans = await embifiRepo.count();
  const repossessions = await repossessionRepo.count();

  const qbAgents = paymentRepo
    .createQueryBuilder("p")
    .select("COUNT(DISTINCT p.collectedBy)", "cnt");
  if (start && end) qbAgents.where("p.createdAt BETWEEN :s AND :e", { s: fmtDate(start), e: fmtDate(end) });
  const { cnt } = await qbAgents.getRawOne();

  return {
    totalCollections: Number(total || 0),
    activeLoans,
    repossessions,
    activeAgents: Number(cnt || 0),
  };
}

async function getTrend(period, { start, end }) {
  const now = new Date();

  // All time -> individual collections (to show each one separately)
  if (!start || !end) {
    const rows = await paymentRepo
      .createQueryBuilder("p")
      .select("p.createdAt", "date")
      .addSelect("p.amount", "total")
      .orderBy("p.createdAt", "ASC")
      .getRawMany();

    return {
      labels: rows.map(r => new Date(r.date).toLocaleString("en-US", { 
        year: "numeric", 
        month: "short", 
        day: "numeric", 
        hour: "2-digit", 
        minute: "2-digit" 
      })),
      data: rows.map(r => Number(r.total)),
    };
  }

  if (period === "day") {
    const rows = await paymentRepo
      .createQueryBuilder("p")
      .select("HOUR(p.createdAt)", "bucket")
      .addSelect("COALESCE(SUM(p.amount),0)", "total")
      .where("p.createdAt BETWEEN :s AND :e", { s: fmtDate(start), e: fmtDate(end) })
      .groupBy("bucket").orderBy("bucket", "ASC").getRawMany();

    const labels = Array.from({ length: 24 }, (_, h) => `${h}:00`);
    const map = new Map(rows.map(r => [Number(r.bucket), Number(r.total)]));
    return { labels, data: labels.map((_, h) => map.get(h) || 0) };
  }

  if (period === "week") {
    const weekStart = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6));
    const weekEnd = endOfDay(now);
    const rows = await paymentRepo
      .createQueryBuilder("p")
      .select("DATE(p.createdAt)", "d")
      .addSelect("COALESCE(SUM(p.amount),0)", "total")
      .where("p.createdAt BETWEEN :s AND :e", { s: fmtDate(weekStart), e: fmtDate(weekEnd) })
      .groupBy("d").orderBy("d","ASC").getRawMany();

    const labels = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setDate(now.getDate() - i);
      labels.push(d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }));
    }
    const map = new Map(rows.map(r => [
      new Date(r.d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
      Number(r.total),
    ]));
    return { labels, data: labels.map(l => map.get(l) || 0) };
  }

  if (period === "year") {
    const thisYear = now.getFullYear();
    const labels = [];
    for (let y = thisYear - 4; y <= thisYear; y++) labels.push(String(y));

    const rows = await paymentRepo
      .createQueryBuilder("p")
      .select("YEAR(p.createdAt)", "y")
      .addSelect("COALESCE(SUM(p.amount),0)", "total")
      .where("YEAR(p.createdAt) BETWEEN :a AND :b", { a: thisYear - 4, b: thisYear })
      .groupBy("y").orderBy("y","ASC").getRawMany();

    const map = new Map(rows.map(r => [String(r.y), Number(r.total)]));
    return { labels, data: labels.map(l => map.get(l) || 0) };
  }

  // month -> last 7 months
  const labels = [];
  const ymKeys = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(d.toLocaleString("en-US", { month: "short" }));
    ymKeys.push({ y: d.getFullYear(), m: d.getMonth() + 1 });
  }
  const minYM = ymKeys[0];
  const minDate = new Date(minYM.y, minYM.m - 1, 1);
  const maxDate = endOfDay(now);

  const rows = await paymentRepo
    .createQueryBuilder("p")
    .select("YEAR(p.createdAt)", "y")
    .addSelect("MONTH(p.createdAt)", "m")
    .addSelect("COALESCE(SUM(p.amount),0)", "total")
    .where("p.createdAt BETWEEN :s AND :e", { s: fmtDate(minDate), e: fmtDate(maxDate) })
    .groupBy("y, m").orderBy("y","ASC").addOrderBy("m","ASC").getRawMany();

  const map = new Map(rows.map(r => [`${r.y}-${String(r.m).padStart(2, "0")}`, Number(r.total)]));
  return { labels, data: ymKeys.map(({ y, m }) => map.get(`${y}-${String(m).padStart(2, "0")}`) || 0) };
}

async function getPaymentModes({ start, end }) {
  const qb = paymentRepo
    .createQueryBuilder("p")
    .select("p.paymentMode", "mode")
    .addSelect("COALESCE(SUM(p.amount),0)", "total");
  if (start && end) qb.where("p.createdAt BETWEEN :s AND :e", { s: fmtDate(start), e: fmtDate(end) });
  const rows = await qb.groupBy("mode").orderBy("total","DESC").getRawMany();
  return { labels: rows.map(r => r.mode || "Unknown"), data: rows.map(r => Number(r.total)) };
}

async function getAgentPerformance({ start, end }) {
  const qb = paymentRepo
    .createQueryBuilder("p")
    .select("p.collectedBy", "agent")
    .addSelect("COALESCE(SUM(p.amount),0)", "total");
  if (start && end) qb.where("p.createdAt BETWEEN :s AND :e", { s: fmtDate(start), e: fmtDate(end) });
  const rows = await qb.groupBy("agent").orderBy("total","DESC").limit(5).getRawMany();
  return { labels: rows.map(r => r.agent || "Unknown"), data: rows.map(r => Number(r.total)) };
}

/* ========= unified endpoint ========= */
// GET /api/dashboard?period=day|week|month|year|all  (default = all)
router.get("/dashboard", async (req, res) => {
  try {
    const period = (req.query.period || "all").toString(); // default ALL
    const range = rangeForPeriod(period);
    const [stats, trend, modes, agents] = await Promise.all([
      getStats(range),
      getTrend(period, range),
      getPaymentModes(range),
      getAgentPerformance(range),
    ]);

    res.json({
      period,
      range: range.start && range.end ? { start: range.start.toISOString(), end: range.end.toISOString() } : null,
      stats,
      charts: { trend, paymentModes: modes, agentPerformance: agents },
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;