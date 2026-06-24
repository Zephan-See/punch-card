import express from 'express';
import bcryptjs from 'bcryptjs';
import db from '../db.js';
import { createToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });

    const hash = bcryptjs.hashSync(password, 10);
    const stmt = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)');
    const result = stmt.run(name, email, hash);

    res.json({ id: result.lastInsertRowid, token: createToken(result.lastInsertRowid) });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    if (!bcryptjs.compareSync(password, user.password_hash)) return res.status(401).json({ error: 'Invalid credentials' });

    res.json({ id: user.id, token: createToken(user.id) });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
