import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';

const app = express();
app.use(express.json());
app.use(cors());

const JWT_SECRET = 'demo-secret-key';

// 模拟数据存储
const users = [];
const checkins = [];

// 辅助函数
function createToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: '未授权' });
  const decoded = verifyToken(token);
  if (!decoded) return res.status(401).json({ error: '令牌无效' });
  req.userId = decoded.userId;
  next();
}

// 认证路由
app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ error: '邮箱已注册' });
  }
  const id = users.length + 1;
  const hash = bcryptjs.hashSync(password, 10);
  users.push({ id, name, email, password_hash: hash, role: 'user', wall_public: 1 });
  res.json({ id, token: createToken(id) });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  if (!user || !bcryptjs.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: '邮箱或密码错误' });
  }
  res.json({ id: user.id, token: createToken(user.id) });
});

// 打卡路由
app.get('/api/checkins/today', authMiddleware, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const checked = checkins.some(c => c.user_id === req.userId && c.checked_date === today);
  res.json({ checked });
});

app.post('/api/checkins', authMiddleware, (req, res) => {
  const { content } = req.body;
  const today = new Date().toISOString().split('T')[0];
  if (checkins.some(c => c.user_id === req.userId && c.checked_date === today)) {
    return res.status(400).json({ error: '今日已打卡' });
  }
  const id = checkins.length + 1;
  checkins.push({ id, user_id: req.userId, content, checked_date: today, created_at: new Date() });
  res.json({ id });
});

app.get('/api/checkins/my', authMiddleware, (req, res) => {
  const myCheckins = checkins
    .filter(c => c.user_id === req.userId)
    .map(c => {
      const user = users.find(u => u.id === c.user_id);
      return { ...c, name: user.name, like_count: 0, liked: false };
    })
    .sort((a, b) => new Date(b.checked_date) - new Date(a.checked_date));
  res.json(myCheckins);
});

app.get('/api/checkins/leaderboard', (req, res) => {
  const ranking = users.map(user => {
    const total_days = new Set(checkins.filter(c => c.user_id === user.id).map(c => c.checked_date)).size;
    return { id: user.id, name: user.name, total_days };
  }).sort((a, b) => b.total_days - a.total_days);
  res.json(ranking);
});

// 用户路由
app.get('/api/users/profile', authMiddleware, (req, res) => {
  const user = users.find(u => u.id === req.userId);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  res.json({ id: user.id, name: user.name, email: user.email, wall_public: user.wall_public });
});

app.put('/api/users/profile', authMiddleware, (req, res) => {
  const user = users.find(u => u.id === req.userId);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  const { name, wall_public } = req.body;
  if (name) user.name = name;
  if (wall_public !== undefined) user.wall_public = wall_public;
  res.json({ ok: true });
});

// 管理路由
app.get('/api/admin/stats', authMiddleware, (req, res) => {
  const user = users.find(u => u.id === req.userId);
  if (!user || user.role !== 'admin') return res.status(403).json({ error: '无权限' });
  const today = new Date().toISOString().split('T')[0];
  const total_users = users.filter(u => u.role === 'user').length;
  const today_checkins = checkins.filter(c => c.checked_date === today).length;
  const checkin_rate = total_users > 0 ? Math.round((today_checkins / total_users) * 100) : 0;
  res.json({ total_users, today_checkins, checkin_rate, daily_trend: [] });
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: '🚀 打卡小程序后端运行中（演示模式）',
    users: users.length,
    checkins: checkins.length
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n✅ 演示服务器运行在 http://localhost:${PORT}`);
  console.log(`📊 健康检查: http://localhost:${PORT}/health`);
  console.log(`💡 这是演示模式（数据存储在内存中）\n`);
});
