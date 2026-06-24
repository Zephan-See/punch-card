import express from 'express';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.get('/profile', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, name, email, avatar_url, wall_public, created_at FROM users WHERE id = ?').get(req.userId);
  res.json(user);
});

router.put('/profile', authMiddleware, (req, res) => {
  const { name, avatar_url, wall_public } = req.body;
  db.prepare('UPDATE users SET name = ?, avatar_url = ?, wall_public = ? WHERE id = ?').run(
    name, avatar_url, wall_public, req.userId
  );
  res.json({ ok: true });
});

router.post('/goal', authMiddleware, (req, res) => {
  try {
    const { title, description, target_days } = req.body;
    const result = db.prepare(`
      INSERT INTO goals (user_id, title, description, target_days, start_date)
      VALUES (?, ?, ?, ?, DATE('now'))
    `).run(req.userId, title, description, target_days || 100);

    res.json({ id: result.lastInsertRowid });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/goals', authMiddleware, (req, res) => {
  const goals = db.prepare(`
    SELECT g.*,
      (SELECT COUNT(*) FROM checkins WHERE goal_id = g.id) as completed_days
    FROM goals WHERE user_id = ?
  `).all(req.userId);

  res.json(goals);
});

export default router;
