# Supabase 迁移 · 一步一步

> 我（Claude）写好了所有代码、SQL、迁移脚本。你按这个清单执行即可。
> 全程预计 30–60 分钟（不含数据导入跑的时间）。

## 0. 准备
- Supabase 账号（免费档够用，含 500MB 数据库 + 1GB Storage）
- 把 Apps Script 端最新版本重新部署一次（我已经加了 `adminAllLikes` / `adminAllComments` 两个端点，迁移脚本会用）

## 1. 创建 Supabase 项目（5 分钟）
1. 打开 https://supabase.com → New project
2. 名字：`punch-card`
3. 区域：选**离你用户最近**的（马来西亚选 Singapore）
4. 数据库密码：随便设，记到密码管理器
5. 等 1-2 分钟项目初始化完成

## 2. 跑 Schema 和 RLS（5 分钟）
1. Supabase Studio → 左栏 **SQL Editor** → **New query**
2. 把 `supabase/01_schema.sql` 全部贴进去 → **Run**（看到 "Success" 即可）
3. 再 New query，贴 `supabase/02_rls.sql` → **Run**

## 3. 建 Storage 桶（2 分钟）
1. 左栏 **Storage** → **New bucket**
2. Name: `media`
3. **Public bucket: ON** ✅
4. **Create bucket**

（02_rls.sql 里已经写好 storage 的 policies，跑过就生效）

## 4. 拿 API 钥匙（2 分钟）
1. 左栏 **Project Settings** → **API**
2. 复制两个值：
   - **Project URL** → `https://xxxxx.supabase.co`
   - **anon public key** → `eyJhbGc...` (短的，约 200 字符)
   - **service_role key** → 这个**千万别上 Git**，仅本机 .env 和迁移脚本用

## 5. 跑数据迁移（最关键，10-30 分钟）
1. 部署一下最新版 Apps Script Code.gs（加了三个 admin 导出端点）。
   - 我在 `apps-script/Code.gs` 里已经更新好；复制全文 → 粘贴到 Apps Script 编辑器 → 保存 → 部署 → 管理部署 → 编辑（铅笔）→ 版本 New version → 部署
2. 准备 `.env`：
   ```bash
   cd supabase
   cp .env.example .env
   ```
   填进去：
   - `SUPABASE_URL` = 第 4 步的 Project URL
   - `SUPABASE_SERVICE_ROLE_KEY` = service_role key
   - `APPS_SCRIPT_URL` = 你当前的 `https://script.google.com/macros/s/.../exec`
   - `APPS_SCRIPT_ADMIN_TOKEN` = 你 admin 账号登录后的 token。拿法：登入活动 → DevTools → Application → Local Storage → `token` 那个值
3. 装依赖 + 跑：
   ```bash
   cd supabase
   npm init -y && npm install @supabase/supabase-js
   node migrate.mjs
   ```
4. 输出会一步步告诉你 `[1/5] Fetching users…` 等。期望最后看到 `DONE.` 加用户/打卡数

**密码：** 用户原密码完整保留（脚本会用 service role 的 admin API 把现有密码 plaintext → bcrypt 进 Supabase Auth）。用户用原密码登录不变。

## 6. 配置前端切换到 Supabase（5 分钟）
我已经写好 `frontend/src/api.supabase.js`（对外接口和 `api.js` 完全一样）。切换：

1. 在 Vercel 项目设置 → Environment Variables 添加：
   - `VITE_SUPABASE_URL` = Project URL
   - `VITE_SUPABASE_ANON_KEY` = anon public key
2. 在 `frontend/src/`：
   ```bash
   mv api.js api.apps-script.js
   mv api.supabase.js api.js
   ```
3. AuthContext 微调（我可以帮你改）：现在的 `login` 已经返回 `{id, token}`，新的 Supabase 也返回这个形状，所以**通常不需要改 AuthContext**。但 `register` 在 Supabase 流程里如果你启用了邮箱确认，会先返回 `pending-email-confirm`。如果不想要邮箱确认，去 Supabase Studio → Authentication → Providers → Email → 取消勾选 "Confirm email"
4. `git push` → Vercel 自动重新部署

## 7. 烟雾测试
- 登入老账号（原密码） → 应该能进
- 看打卡墙 → 应该有历史数据
- 发一条打卡 → 应该写到 Supabase
- 看动态流、排行榜 → 应该有数据

## 8. 收尾
- 旧 Apps Script + Sheets 留着归档一个月，确认没问题再删
- 旧的 Apps Script 缓存策略 / 复杂 Code.gs 不再使用，可以从 README 里清掉

---

## 我做不了的部分（需要你执行）
- ✋ **创建 Supabase 项目** — 需要你账号
- ✋ **跑 SQL** — Studio 里复制粘贴的 30 秒
- ✋ **复制 API key 到 Vercel/本机 .env** — 涉及你的密钥
- ✋ **跑 `node migrate.mjs`** — 需要 service role key（不能让外人持有）
- ✋ **重新部署 Apps Script** — 需要登录你的 Google 账号

## 我已经做完的
- ✅ 完整 Schema (`01_schema.sql`) — 表 + 索引 + 触发器 + 视图 + admin RPC
- ✅ RLS 策略 (`02_rls.sql`) — 谁能读/写什么、wall_public 控制、admin 权限
- ✅ 迁移脚本 (`migrate.mjs`) — Sheets → Supabase 全自动
- ✅ Apps Script 新增 admin 导出端点 (`adminAllLikes`, `adminAllComments`, 完整 media 字段)
- ✅ 前端新 API (`api.supabase.js`) — drop-in 替换 `api.js`
- ✅ Supabase client (`supabase.js`)

迁移完成后我会接着做：**用户自定义目标功能**（schema 里 `goals` 表已经准备好了，只差前端 UI）。
