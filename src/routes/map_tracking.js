// backend/src/routes/map_tracking.js
import { Router } from "express";
import AppDataSource from "../config/database.js";

const router = Router();

router.get("/tracking/:userId", async (req, res) => {
  const { userId } = req.params;
  const { from, to } = req.query; // expect 'YYYY-MM-DD'
  console.log(from,to)
  try {
    const params = [userId];
    let where = `WHERE userId = ?`;
    if (from) {
      where += ` AND timestamp >= ?`;
      params.push(`${from} 00:00:00`);
    }
    if (to) {
      where += ` AND timestamp < DATE_ADD(?, INTERVAL 1 DAY)`; // inclusive of 'to' day
      params.push(`${to} 00:00:00`);
    }

    const rows = await AppDataSource.query(
      `
      SELECT latitude, longitude, timestamp
      FROM user_sessions
      ${where}
      ORDER BY timestamp ASC
      `,
      params
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: "No data found", userId, from, to });
    }

    const data = rows
      .map((p) => ({
        lat: Number(p.latitude),
        lng: Number(p.longitude),
        timestamp: p.timestamp,
      }))
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));

    if (data.length === 0) {
      return res.status(422).json({ message: "Rows found but no valid lat/lng values" });
    }

    res.json({ userId, count: data.length, data });
  } catch (err) {
    console.error("GET /tracking/:userId failed:", err);
    res.status(500).json({ message: "Failed to fetch tracking data", error: err.message });
  }
});

export default router;
