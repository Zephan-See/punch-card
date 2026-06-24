import express from 'express';
import cors from 'cors';
import { initDB, db } from './db.js';
import authRoutes from './routes/auth.js';
import checkinRoutes from './routes/checkins.js';
import userRoutes from './routes/users.js';
import adminRoutes from './routes/admin.js';

const app = express();
app.use(express.json());
app.use(cors());

// 初始化数据库
await initDB();

app.use('/api/auth', authRoutes);
app.use('/api/checkins', checkinRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: '🚀 打卡小程序后端运行中' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n✅ 服务器运行在 http://localhost:${PORT}`);
  console.log(`📊 健康检查: http://localhost:${PORT}/health\n`);
});
