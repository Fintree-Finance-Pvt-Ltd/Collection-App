import { Router } from 'express';
import AppDataSource from '../config/database.js';
import user_sessions from '../entities/user_sessions.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();
const sessionRepository = AppDataSource.getRepository(user_sessions);

router.post('/locations/batch', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { sessionId, locations,action } = req.body || {};

    if (!userId) return res.status(401).json({ ok: false, message: 'No user in token' });
    if (!sessionId) return res.status(400).json({ ok: false, message: 'sessionId required' });
    if (!Array.isArray(locations) || locations.length === 0) {
      return res.status(400).json({ ok: false, message: 'locations must be a non-empty array' });
    }

    const rows = locations.map((p) => {
      const lat = Number(p.latitude);
      const lng = Number(p.longitude);
      if (!isFinite(lat) || !isFinite(lng)) return null;

      const ts = Number.isFinite(+p.timestamp)
        ? new Date(+p.timestamp)
        : new Date(p.timestamp || Date.now());
      if (Number.isNaN(ts.getTime())) return null;

      return {
        userId,                  // from JWT
        sessionId,
        action,               // from body
        latitude: lat,
        longitude: lng,
        accuracy: p.accuracy != null ? Number(p.accuracy) : null,
        speed: p.speed != null ? Number(p.speed) : null,
        source: p.source || 'watch',
        timestamp: ts,
      };
    }).filter(Boolean);

    if (rows.length === 0) {
      return res.status(400).json({ ok: false, message: 'No valid location points in payload' });
    }

    const result = await sessionRepository.createQueryBuilder().insert().values(rows).execute();
    
    return res.json({ ok: true, inserted: result?.identifiers?.length ?? rows.length, message: 'Locations saved' });
  } catch (err) {
    console.error('Error saving location batch:', err);
    return res.status(500).json({ ok: false, message: 'Internal server error' });
  }
});

export default router;