import express from 'express';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.get('/today', authMiddleware, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const checkin = db.prepare('SELECT id FROM checkins WHERE user_id = ? AND checked_date = ?').get(req.userId, today);
  res.json({ checked: !!checkin });
});

router.post('/', authMiddleware, (req, res) => {
  try {
    const { content, media_url, media_type, goal_id } = req.body;
    const today = new Date().toISOString().split('T')[0];

    const stmt = db.prepare(`
      INSERT INTO checkins (user_id, goal_id, content, media_url, media_type, checked_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(req.userId, goal_id, content, media_url, media_type, today);

    res.json({ id: result.lastInsertRowid });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/my', authMiddleware, (req, res) => {
  const checkins = db.prepare(`
    SELECT c.*, u.name, u.avatar_url,
      (SELECT COUNT(*) FROM likes WHERE checkin_id = c.id) as like_count,
      (SELECT COUNT(*) FROM likes WHERE checkin_id = c.id AND user_id = ?) as liked
    FROM checkins c
    JOIN users u ON c.user_id = u.id
    WHERE c.user_id = ?
    ORDER BY c.checked_date DESC
  `).all(req.userId, req.userId);

  res.json(checkins);
});

router.get('/wall/:userId', (req, res) => {
  const user = db.prepare('SELECT wall_public FROM users WHERE id = ?').get(req.params.userId);
  if (!user?.wall_public) return res.status(403).json({ error: 'Wall is private' });

  const checkins = db.prepare(`
    SELECT c.*, u.name, u.avatar_url,
      (SELECT COUNT(*) FROM likes WHERE checkin_id = c.id) as like_count,
      (SELECT COUNT(*) FROM likes WHERE checkin_id = c.id AND user_id = ?) as liked
    FROM checkins c
    JOIN users u ON c.user_id = u.id
    WHERE c.user_id = ?
    ORDER BY c.checked_date DESC
  `).all(req.userId || 0, req.params.userId);

  res.json(checkins);
});

router.get('/feed', (req, res) => {
  const checkins = db.prepare(`
    SELECT c.*, u.id as user_id, u.name, u.avatar_url,
      (SELECT COUNT(*) FROM likes WHERE checkin_id = c.id) as like_count
    FROM checkins c
    JOIN users u ON c.user_id = u.id
    WHERE u.wall_public = 1
    ORDER BY c.created_at DESC
    LIMIT 100
  `).all();

  res.json(checkins);
});

router.get('/leaderboard', (req, res) => {
  const ranking = db.prepare(`
    SELECT u.id, u.name, u.avatar_url,
      COUNT(DISTINCT c.checked_date) as total_days,
      MAX(CASE WHEN c.checked_date = DATE('now') THEN 1 ELSE 0 END) as checked_today,
      (SELECT COUNT(*) FROM checkins WHERE user_id = u.id AND checked_date >= DATE('now', '-30 days')) as recent_30days
    FROM users u
    LEFT JOIN checkins c ON u.id = c.user_id
    WHERE u.role = 'user'
    GROUP BY u.id
    ORDER BY total_days DESC
  `).all();

  res.json(ranking);
});

router.post('/:id/like', authMiddleware, (req, res) => {
  try {
    db.prepare('INSERT INTO likes (user_id, checkin_id) VALUES (?, ?)').run(req.userId, req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/:id/like', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM likes WHERE user_id = ? AND checkin_id = ?').run(req.userId, req.params.id);
  res.json({ ok: true });
});

export default router;
