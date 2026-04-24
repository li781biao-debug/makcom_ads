# Makcom Ads

Meta Ads 多租户操作平台。业务方通过 Web UI 管理广告账号、看数据、建 campaign/ad set/ad、上传素材。

**架构关键点**：所有 Meta Graph API 调用都由 Make.com 代理。Meta access_token 永不离开 Make。后端只存引用、同步数据、记录审计。

```
[Next.js UI]
    ↓
[Next.js API / MySQL]        ← 本仓库
    ↓ webhook
[Make.com 场景群]              ← 持有 Meta 连接
    ↓
[Meta Graph API]
```

## 技术栈

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind v4
- Prisma 6 + MySQL 8
- NextAuth v5 (Credentials provider)
- Zod 验证

## 快速开始

### 1. 准备 MySQL

**选项 A（推荐）· Docker Desktop**
```bash
docker compose up -d
```

**选项 B · 本地安装 MySQL 8**
- 从 https://dev.mysql.com/downloads/installer/ 下载并安装（需要管理员权限）
- 安装后创建库：
  ```sql
  CREATE DATABASE makcom_ads CHARACTER SET utf8mb4;
  ```

**选项 C · 云 MySQL（免费档位）**
- Aiven / TiDB Serverless / Railway
- 注册后拿连接串，替换 `.env` 的 `DATABASE_URL`

### 2. 配置环境变量

`.env` 已生成，按需要修改：
```
DATABASE_URL="mysql://root:rootpassword@localhost:3306/makcom_ads"
AUTH_SECRET="<openssl rand -hex 32>"
MAKE_SHARED_SECRET="<随机长字符串>"
APP_BASE_URL="http://localhost:3000"
```

### 3. 初始化数据库

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 4. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000 → 注册账号 → 登录 → 连接 Meta。

## Make.com 场景配置

在 Make.com 创建以下 **13 个场景**，每个场景触发器都是 **Webhook · Custom webhook**，响应器是 **Webhooks · Webhook response**。

### 通用约定

**入参格式**（所有场景共用）：
```json
{
  "tenant_id": "cuid",
  "make_connection_ref": "xxx",
  "ad_account_id": "act_123456",
  "params": { ... }
}
```

**出参格式**（成功）：`{ "ok": true, "data": { ... } }`
**出参格式**（失败）：`{ "ok": false, "error": { "code": "...", "message": "..." } }`

**鉴权**：每个场景开头加一个 Filter，检查 `X-Make-Secret` 等于 `MAKE_SHARED_SECRET`，不等就直接返回 401。

### 场景列表

| # | 场景名 | 对应 env 变量 | 主要 Graph API |
|---|---|---|---|
| 1 | meta.connect | `MAKE_WEBHOOK_META_CONNECT` | Facebook OAuth + GET `/me` + GET `/me/adaccounts` + HTTP POST 回 `/api/meta/callback` |
| 2 | meta.list_adaccounts | `MAKE_WEBHOOK_META_LIST_ADACCOUNTS` | GET `/me/adaccounts` |
| 3 | meta.insights | `MAKE_WEBHOOK_META_INSIGHTS` | GET `/{act_id}/insights` |
| 4 | meta.campaign.list | `MAKE_WEBHOOK_CAMPAIGN_LIST` | GET `/{act_id}/campaigns` |
| 5 | meta.campaign.create | `MAKE_WEBHOOK_CAMPAIGN_CREATE` | POST `/{act_id}/campaigns` |
| 6 | meta.campaign.update | `MAKE_WEBHOOK_CAMPAIGN_UPDATE` | POST `/{campaign_id}` |
| 7 | meta.adset.list | `MAKE_WEBHOOK_ADSET_LIST` | GET `/{campaign_id}/adsets` |
| 8 | meta.adset.create | `MAKE_WEBHOOK_ADSET_CREATE` | POST `/{act_id}/adsets` |
| 9 | meta.ad.list | `MAKE_WEBHOOK_AD_LIST` | GET `/{adset_id}/ads` |
| 10 | meta.ad.create | `MAKE_WEBHOOK_AD_CREATE` | POST `/{act_id}/ads` |
| 11 | meta.creative.create | `MAKE_WEBHOOK_CREATIVE_CREATE` | POST `/{act_id}/adcreatives` |
| 12 | meta.image.upload | `MAKE_WEBHOOK_IMAGE_UPLOAD` | POST `/{act_id}/adimages` |
| 13 | meta.video.upload | `MAKE_WEBHOOK_VIDEO_UPLOAD` | POST `/{act_id}/advideos` |

### 场景 1（`meta.connect`）特别说明

负责把 Make 的 Facebook 连接信息回传给后端。流程：

1. Webhook 触发：接收 `state`、`tenant_id`、`return_to` 查询参数
2. Facebook Login：让用户授权（或重用已有连接）
3. GET `/me` 拿 fb_user_id / name
4. GET `/me/adaccounts` 拿账号列表
5. HTTP 模块 POST 回 `{APP_BASE_URL}/api/meta/callback`，body：
   ```json
   {
     "state": "{{state}}",
     "tenant_id": "{{tenant_id}}",
     "make_connection_ref": "<Make 连接的内部 ID>",
     "fb_user_id": "{{me.id}}",
     "fb_user_name": "{{me.name}}",
     "ad_accounts": [{ "act_id": "act_xxx", "name": "...", "currency": "USD" }]
   }
   ```
   header: `X-Make-Secret: <MAKE_SHARED_SECRET>`
6. Redirect 用户回 `return_to`

> **本地开发**：Make 无法直接 POST 到 `localhost`，用 [ngrok](https://ngrok.com/) 或 [cloudflared](https://github.com/cloudflare/cloudflared) 暴露 3000 端口，把 `APP_BASE_URL` 改成 ngrok URL。

## 目录结构

```
src/
├── app/
│   ├── (auth)/                          # 登录注册
│   ├── (dashboard)/                     # 主界面
│   │   ├── connections/                 # Meta 连接管理
│   │   ├── insights/, campaigns/,       # 业务模块
│   │   ├── adsets/, ads/, creatives/
│   │   └── jobs/                        # Make 调用日志
│   └── api/
│       ├── auth/[...nextauth]/
│       ├── register/
│       └── meta/{connect,callback}/
├── lib/
│   ├── db.ts, env.ts, tenant.ts
│   └── make/                            # Webhook 封装 + 业务方法
│       ├── client.ts, scenarios.ts
│       ├── campaigns.ts, adsets.ts, ads.ts
│       ├── insights.ts, assets.ts
├── auth.ts                              # NextAuth v5
└── middleware.ts
prisma/schema.prisma                      # 多租户 + Meta 对象 + MakeJob
```

## Make.com 额度估算

Pro 档 = 10,000 ops/月。粗算：

| 操作 | ops |
|---|---|
| 拉 campaign 列表 | 1 |
| 拉 insights（单账号）| 1-2 |
| 建一个 campaign | 1-2 |
| 建一整套（Campaign+AdSet+Ad+Creative+图片）| 5-8 |

量大时升 Teams 档或引入缓存层（`InsightCache` 表已预留）。

## 下一步 TODO

- [ ] Campaign 新建表单 + 调 `createCampaign`
- [ ] AdSet 创建（含定向 JSON 编辑器）
- [ ] 素材上传（先传到对象存储拿 URL，再交给 Make）
- [ ] Creative 创建 + Ad 发布
- [ ] Insights KPI 卡片 + 图表
- [ ] 多用户邀请
- [ ] `state` nonce 验证（防伪造 callback）
- [ ] 云服务器部署脚本 (PM2 + Nginx)

## 生产部署要点

- Ubuntu + Node 22 + PM2 + Nginx + Let's Encrypt
- MySQL：RDS / 自建 + 每日备份
- `APP_BASE_URL` 必须是 HTTPS 公网域名，Make 才能回调
- `MAKE_SHARED_SECRET` 所有场景和后端保持一致
