import express from 'express';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

function requireAdmin(req, res, next) {
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.userId);
  if (user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
}

router.get('/stats', authMiddleware, requireAdmin, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const total_users = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = "user"').get().count;
  const today_checkins = db.prepare('SELECT COUNT(*) as count FROM checkins WHERE checked_date = ?').get(today).count;
  const checkin_rate = total_users > 0 ? Math.round((today_checkins / total_users) * 100) : 0;

  const daily_trend = db.prepare(`
    SELECT checked_date, COUNT(*) as count
    FROM checkins
    WHERE checked_date >= DATE('now', '-30 days')
    GROUP BY checked_date
    ORDER BY checked_date
  `).all();

  res.json({ total_users, today_checkins, checkin_rate, daily_trend });
});

router.get('/users', authMiddleware, requireAdmin, (req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.created_at,
      COUNT(DISTINCT c.id) as total_checkins
    FROM users u
    LEFT JOIN checkins c ON u.id = c.user_id
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `).all();

  res.json(users);
});

router.get('/checkins', authMiddleware, requireAdmin, (req, res) => {
  const checkins = db.prepare(`
    SELECT c.*, u.name, u.avatar_url,
      (SELECT COUNT(*) FROM likes WHERE checkin_id = c.id) as like_count
    FROM checkins c
    JOIN users u ON c.user_id = c.user_id
    ORDER BY c.created_at DESC
    LIMIT 100
  `).all();

  res.json(checkins);
});

router.put('/users/:id/role', authMiddleware, requireAdmin, (req, res) => {
  const { role } = req.body;
  if (!['admin', 'user'].includes(role)) return res.status(400).json({ error: 'Invalid role' });

  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
  res.json({ ok: true });
});

export default router;
