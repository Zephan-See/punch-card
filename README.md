# 📅 打卡小程序

100 人 100 天打卡活动专用平台 - 完全免费部署，零服务器成本。

## 🌟 功能

- 👥 用户注册/登录（JWT 认证）
- ✏️ 每日打卡（文字 + 图片/录音/视频）
- 📸 打卡墙（朋友圈风格）
- ❤️ 点赞 & 补充说明（评论）
- 🏆 排行榜（按打卡天数）
- 📡 动态流（公开打卡）
- 🛡️ 管理员后台（统计 + 用户/打卡管理）
- 🔗 一键分享到社交媒体
- 🖼️ 头像上传 + 圆形裁切

## 🏗️ 技术栈

- **前端**：React + Vite + TailwindCSS
- **后端**：Google Apps Script
- **数据库**：Google Sheets
- **部署**：Vercel（前端）

## 🚀 部署

### 前端（Vercel）
1. Fork 这个仓库
2. 连接 Vercel
3. Root Directory 设为 `frontend`
4. Deploy

### 后端（Google Apps Script）
1. 新建 Google Sheets
2. 扩展 → Apps Script
3. 粘贴 `apps-script/Code.gs` 的代码
4. 运行 `initDB` 初始化
5. 部署为 Web App
6. 把 URL 填到 `frontend/src/api.js`

## 📄 License

MIT
