// routes/dashboard.js
import { Router } from "express";
import AppDataSource from "../../config/database.js";

import embifiReceipt from "../../entities/embifiReceipt.js";
import malhotraReceipt from "../../entities/malhotraReceipt.js";

import EmbifiRepossession from "../../entities/EmbifiRepossession.js";
import MalhotraRepossession from "../../entities/malhotraRepossession.js";

import Embifi from "../../entities/Embifi.js";
import { fetchMalhotraActiveLoans } from "../../utils/index.js";

const router = Router();

/* ======================================
      REPOSITORY MAP (SWITCH PARTNER)
====================================== */
const REPO = {
  embifi: {
    payments: AppDataSource.getRepository(embifiReceipt),
    loans: AppDataSource.getRepository(Embifi),
    repo: AppDataSource.getRepository(EmbifiRepossession)
  },
  malhotra: {
    payments: AppDataSource.getRepository(malhotraReceipt),
    loans: null, // handled via API
    repo: AppDataSource.getRepository(MalhotraRepossession)
  }
};

/* ======================================
                HELPERS
====================================== */

const startOfDay = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const endOfDay = d => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };
const fmtDate = d => new Date(d).toISOString().slice(0, 19).replace("T", " ");

function rangeForPeriod(period) {
  if (!period || period === "all") return { start: null, end: null };

  const now = new Date();
  switch (period) {
    case "day": return { start: startOfDay(now), end: endOfDay(now) };

    case "week": {
      const s = new Date(now);
      const dow = (s.getDay() + 6) % 7;
      s.setDate(s.getDate() - dow);
      return { start: startOfDay(s), end: endOfDay(now) };
    }

    case "year":
      return {
        start: startOfDay(new Date(now.getFullYear(), 0, 1)),
        end: endOfDay(now)
      };

    default: // month
      return {
        start: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)),
        end: endOfDay(now)
      };
  }
}

/* ======================================
           DASHBOARD: BASIC METRICS
====================================== */

async function getStats(repo, partner, { start, end }) {
  const paymentRepo = repo.payments;

  // total collections
  const qbTotal = paymentRepo
    .createQueryBuilder("p")
    .select("COALESCE(SUM(p.amount),0)", "total");

  if (start && end)
    qbTotal.where("p.createdAt BETWEEN :s AND :e", { s: fmtDate(start), e: fmtDate(end) });

  const { total } = await qbTotal.getRawOne();

  // active loans
  let activeLoans = 0;
  if (partner === "embifi") {
    activeLoans = await repo.loans.count();
  } else {
    activeLoans = await fetchMalhotraActiveLoans();
  }

  // repossessions
  const repossessions = await repo.repo.count();

  // active agents
  const qbAgents = paymentRepo
    .createQueryBuilder("p")
    .select("COUNT(DISTINCT p.collectedBy)", "cnt");

  if (start && end)
    qbAgents.where("p.createdAt BETWEEN :s AND :e", { s: fmtDate(start), e: fmtDate(end) });

  const { cnt } = await qbAgents.getRawOne();

  return {
    totalCollections: Number(total || 0),
    activeLoans,
    repossessions,
    activeAgents: Number(cnt || 0)
  };
}

/* ======================================
          TREND (UNCHANGED LOGIC)
====================================== */

async function getTrend(repo, period, { start, end }) {
  const paymentRepo = repo.payments;
  const now = new Date();

  // ALL TIME
  if (!start || !end) {
    const rows = await paymentRepo
      .createQueryBuilder("p")
      .select("p.createdAt", "date")
      .addSelect("p.amount", "total")
      .orderBy("p.createdAt", "ASC")
      .getRawMany();

    return {
      labels: rows.map(r =>
        new Date(r.date).toLocaleString("en-US", {
          year: "numeric", month: "short", day: "numeric",
          hour: "2-digit", minute: "2-digit"
        })
      ),
      data: rows.map(r => Number(r.total))
    };
  }

  /* ===== DAY ===== */
  if (period === "day") {
    const rows = await paymentRepo
      .createQueryBuilder("p")
      .select("HOUR(p.createdAt)", "bucket")
      .addSelect("COALESCE(SUM(p.amount),0)", "total")
      .where("p.createdAt BETWEEN :s AND :e", { s: fmtDate(start), e: fmtDate(end) })
      .groupBy("bucket").orderBy("bucket", "ASC")
      .getRawMany();

    const labels = Array.from({ length: 24 }, (_, h) => `${h}:00`);
    const map = new Map(rows.map(r => [Number(r.bucket), Number(r.total)]));

    return { labels, data: labels.map((_, h) => map.get(h) || 0) };
  }

  /* ===== WEEK ===== */
  if (period === "week") {
    const rows = await paymentRepo
      .createQueryBuilder("p")
      .select("DATE(p.createdAt)", "d")
      .addSelect("COALESCE(SUM(p.amount),0)", "total")
      .where("p.createdAt BETWEEN :s AND :e", { s: fmtDate(start), e: fmtDate(end) })
      .groupBy("d").orderBy("d", "ASC")
      .getRawMany();

    const labels = [];
    const map = new Map(
      rows.map(r => [
        new Date(r.d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
        Number(r.total)
      ])
    );

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      labels.push(d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }));
    }

    return { labels, data: labels.map(l => map.get(l) || 0) };
  }

  /* ===== YEAR ===== */
  if (period === "year") {
    const thisYear = now.getFullYear();
    const labels = [];
    for (let y = thisYear - 4; y <= thisYear; y++) labels.push(String(y));

    const rows = await paymentRepo
      .createQueryBuilder("p")
      .select("YEAR(p.createdAt)", "y")
      .addSelect("COALESCE(SUM(p.amount),0)", "total")
      .where("YEAR(p.createdAt) BETWEEN :a AND :b", { a: thisYear - 4, b: thisYear })
      .groupBy("y").orderBy("y", "ASC")
      .getRawMany();

    const map = new Map(rows.map(r => [String(r.y), Number(r.total)]));

    return { labels, data: labels.map(l => map.get(l) || 0) };
  }

  /* ===== MONTH (7-MONTH WINDOW) ===== */
  const labels = [];
  const ymKeys = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(d.toLocaleString("en-US", { month: "short" }));
    ymKeys.push({ y: d.getFullYear(), m: d.getMonth() + 1 });
  }

  const minDate = new Date(ymKeys[0].y, ymKeys[0].m - 1, 1);

  const rows = await paymentRepo
    .createQueryBuilder("p")
    .select("YEAR(p.createdAt)", "y")
    .addSelect("MONTH(p.createdAt)", "m")
    .addSelect("COALESCE(SUM(p.amount),0)", "total")
    .where("p.createdAt BETWEEN :s AND :e", { s: fmtDate(minDate), e: fmtDate(end) })
    .groupBy("y, m").orderBy("y", "ASC").addOrderBy("m", "ASC")
    .getRawMany();

  const map = new Map(rows.map(r => [`${r.y}-${String(r.m).padStart(2, "0")}`, Number(r.total)]));

  return {
    labels,
    data: ymKeys.map(({ y, m }) =>
      map.get(`${y}-${String(m).padStart(2, "0")}`) || 0
    )
  };
}

/* ======================================
            PAYMENT MODES
====================================== */

async function getPaymentModes(repo, { start, end }) {
  const qb = repo.payments
    .createQueryBuilder("p")
    .select("p.paymentMode", "mode")
    .addSelect("COALESCE(SUM(p.amount),0)", "total");

  if (start && end)
    qb.where("p.createdAt BETWEEN :s AND :e", { s: fmtDate(start), e: fmtDate(end) });

  const rows = await qb.groupBy("mode").orderBy("total", "DESC").getRawMany();

  return {
    labels: rows.map(r => r.mode || "Unknown"),
    data: rows.map(r => Number(r.total))
  };
}

/* ======================================
        AGENT PERFORMANCE
====================================== */

async function getAgentPerformance(repo, { start, end }) {
  const qb = repo.payments
    .createQueryBuilder("p")
    .select("p.collectedBy", "agent")
    .addSelect("COALESCE(SUM(p.amount),0)", "total");

  if (start && end)
    qb.where("p.createdAt BETWEEN :s AND :e", { s: fmtDate(start), e: fmtDate(end) });

  const rows = await qb.groupBy("agent").orderBy("total", "DESC").limit(5).getRawMany();

  return {
    labels: rows.map(r => r.agent || "Unknown"),
    data: rows.map(r => Number(r.total))
  };
}

/* ======================================
        UNIFIED DASHBOARD ENDPOINT
====================================== */

router.get("/dashboard", async (req, res) => {
  try {
    const period = (req.query.period).toString();
    const partner = req.query.partner?.toLowerCase();
    console.log(req.query)
    if (!REPO[partner]) {
      return res.status(400).json({ message: "Invalid partner selected" });
    }

    const repo = REPO[partner];
    const range = rangeForPeriod(period);

    const [stats, trend, modes, agents] = await Promise.all([
      getStats(repo, partner, range),
      getTrend(repo, period, range),
      getPaymentModes(repo, range),
      getAgentPerformance(repo, range)
    ]);

    res.json({
      partner,
      period,
      range: range.start ? {
        start: range.start.toISOString(),
        end: range.end.toISOString()
      } : null,
      stats,
      charts: {
        trend,
        paymentModes: modes,
        agentPerformance: agents
      }
    });

  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
