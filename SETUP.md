# 快速部署指南

## 项目结构

```
Small Punch Card/
├── backend/           # Node.js + Express 后端
│   ├── server.js      # 主服务器
│   ├── db.js          # SQLite 数据库
│   ├── routes/        # API 路由
│   │   ├── auth.js    # 认证
│   │   ├── checkins.js  # 打卡
│   │   ├── users.js   # 用户
│   │   └── admin.js   # 管理员
│   └── middleware/    # 中间件
│       └── auth.js    # JWT认证
│
└── frontend/          # React + Vite PWA
    ├── src/
    │   ├── pages/     # 页面组件
    │   ├── components/    # 公共组件
    │   ├── App.jsx    # 路由
    │   ├── AuthContext.jsx # 认证上下文
    │   └── api.js     # API 封装
    └── index.html
```

## 后端 - 本地开发

```bash
cd backend

# 安装依赖
npm install

# 启动开发服务器（带热重载）
npm run dev

# 服务器运行在 http://localhost:3000
```

## 前端 - 本地开发

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 打开 http://localhost:5173
# 自动代理 /api 到 http://localhost:3000
```

## 部署到生产环境

### 后端部署到 Railway/Render

1. 创建账号：https://railway.app (Railway) 或 https://render.com (Render)
2. 连接 GitHub 仓库
3. 设置环境变量：
   ```
   JWT_SECRET=your-secret-key-here
   PORT=3000
   ```
4. 部署命令：
   ```bash
   cd backend
   npm install
   npm start
   ```

### 前端部署到 Vercel/Netlify

1. 创建账号：https://vercel.com 或 https://netlify.com
2. 连接 GitHub 仓库
3. 构建命令：
   ```bash
   cd frontend
   npm install
   npm run build
   ```
4. 部署目录：`dist/`
5. 环境变量：
   ```
   VITE_API_URL=https://your-backend.railway.app
   ```

## 功能清单

### MVP 版本（已实现）
- ✅ 注册/登录
- ✅ 每日打卡（文字 + URL媒体）
- ✅ 打卡墙（朋友圈风格）
- ✅ 动态流
- ✅ 排行榜
- ✅ 个人目标设定
- ✅ 管理后台（基础）

### 后续迭代
- 🎯 本地图片上传（需要图片处理库）
- 💬 评论功能
- 🔔 推送通知
- 📈 更详细的数据分析
- 🎁 成就徽章系统

## 数据库初始化

数据库会在首次启动 `server.js` 时自动初始化。不需要手动操作。

## 测试账号

注册后自动创建账号即可。首个注册的用户可在管理后台设置为 admin 角色。

## 常见问题

**Q: 图片/视频上传在哪里？**
A: MVP 版本先用外部链接（可复制粘贴图片URL）。后续可加 Cloudinary 集成。

**Q: 怎样添加第二个管理员？**
A: 在管理后台 Users 页面，点击用户修改 role 为 admin。

**Q: 怎样备份数据？**
A: `punch-card.db` 是 SQLite 数据库文件，可直接备份。

## 联系方式

项目基于 Ponytail 哲学构建 - 最小必要代码，最大化功能。

