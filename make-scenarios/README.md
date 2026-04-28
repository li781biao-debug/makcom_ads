# Phase 1 Make.com Scenarios

Four daily scenarios to populate the BI fact tables that back `/reports`. Once these run, the **Overview / Meta KPI / Google KPI** sections of the dashboard plus all time-series charts and the **Top campaign types** table light up.

```
┌─────────────┐  ┌──────────────────┐  ┌─────────────────┐  ┌──────────────┐
│   Shopify   │  │   Meta Insights  │  │  Google Ads     │  │ Google Ads   │
│   Orders    │  │  (campaign lvl)  │  │ (account lvl)   │  │ (by ch type) │
└──────┬──────┘  └─────────┬────────┘  └────────┬────────┘  └──────┬───────┘
       │ POST            │ POST              │ POST              │ POST
       ▼                 ▼                   ▼                   ▼
 /api/insights/    /api/insights/      /api/insights/     /api/insights/
   shopify/         meta/campaign-       google/            google/
   daily            daily                daily              campaign-type
```

## Prerequisites — set up once in Make.com

### 1. Connections

| 模块 | 在 Make.com 里需要的连接 |
|---|---|
| Shopify | Shopify private/custom app or OAuth connection to your store |
| Meta Marketing API | Facebook for Business connection with `ads_read` scope |
| Google Ads | Google Ads connection (developer token + customer id + manager id if applicable) |

### 2. Data store (sharing tenant_id and secret across scenarios)

In Make.com → **Data stores → Add data store** → `makcom_ads_config` with these records:

| key | value |
|---|---|
| `tenant_id` | (从 Tenant 表查出来你自己 `biao` 的 id) |
| `make_secret` | 服务器 `/opt/makcom_ads/.env.production` 里的 `MAKE_SHARED_SECRET` |
| `api_base` | `http://47.251.57.66:8090` |
| `meta_ad_account_id` | e.g. `act_1234567890` |
| `google_customer_id` | e.g. `1234567890` (无破折号) |
| `shopify_shop` | e.g. `tenniix.myshopify.com` |

每个 scenario 用 **Data store → Get a record** 拿这些值，避免硬编码。

### 3. Schedule

每个 scenario：daily at **02:00 UTC**（北京/上海时间 10:00），拉**昨天**整天的数据。Meta/Google API 通常 T+1 才完整，更早跑会拿到不全的数据。

### 4. Error handling

每个 scenario 主流程末尾加一个 **HTTP module → POST** 到我们后端的失败回报（可选，先跳过；Make.com 自带 scenario history 已经够用）。Make.com → scenario settings → **"Auto-commit triggers" 关闭、"Number of consecutive errors" 设 3**。

---

## Common pieces (4 个 scenario 共享的模式)

### A. 计算"昨天"日期

Make.com 表达式：
```
{{formatDate(addDays(now; -1); "YYYY-MM-DD")}}
```

放在第一个 Set Variables 模块里，命名为 `yesterday`，后续模块直接引用 `{{1.yesterday}}`。

### B. 通用 HTTP POST 配置

每个 scenario 末尾的 HTTP 模块都长这样：

| 字段 | 值 |
|---|---|
| URL | `{{2.api_base}}/api/insights/<endpoint>` |
| Method | `POST` |
| Headers | `X-Make-Secret: {{2.make_secret}}` 和 `Content-Type: application/json` |
| Body type | Raw |
| Content type | application/json |
| Request content | 见下面每个 scenario 的 body 模板 |
| Parse response | Yes |
| Reject unauthorized | Yes |

成功响应：`{"ok":true,"data":{"upserted":N}}`，N 应该等于发送的 rows 数量。

---

## Scenario 1 — Shopify daily metrics

**目标表**：`ShopifyDailyMetric`
**端点**：`POST /api/insights/shopify/daily`
**频率**：每日 02:00 UTC

### 模块流

```
[1] Set variables (yesterday = ...)
    │
    ▼
[2] Data store → Get a record (key = "config")  // 拿 tenant_id / make_secret / shopify_shop
    │
    ▼
[3] Shopify → List orders
    Filter: created_at_min = {{1.yesterday}}T00:00:00Z
            created_at_max = {{1.yesterday}}T23:59:59Z
            status = any
    Limit:  250 per page，Make.com 自动翻页
    │
    ▼
[4] Aggregator → Numeric aggregator(s)
    Source: [3]
    Aggregate functions:
      - SUM(total_price) → total_sales
      - COUNT(orders)    → orders
    Group by: (none — single row)
    │
    ▼
[5] Shopify → List refunds (可选)
    Filter: processed_at >= {{1.yesterday}}T00:00:00Z
    │
    ▼
[6] Aggregator → COUNT → returns
    │
    ▼
[7] HTTP → POST /api/insights/shopify/daily
```

### HTTP body

```json
{
  "tenant_id": "{{2.tenant_id}}",
  "rows": [
    {
      "date": "{{1.yesterday}}",
      "total_sales": "{{4.total_sales}}",
      "orders": {{4.orders}},
      "returns": {{6.returns}},
      "currency": "USD"
    }
  ]
}
```

### 字段映射

| Shopify 原字段 | 我们的字段 | 说明 |
|---|---|---|
| `total_price`（每单累加）| `total_sales` | 含税含运费的销售额；如要去掉运费用 `subtotal_price` |
| 订单数 | `orders` | `COUNT()` |
| `Refund` 记录数 | `returns` | 简化版；如果你定义"returns"是退款金额而非笔数，把 SUM(refund.transactions[].amount) 替换 |
| 固定 | `currency` | 单店铺固定 USD。多币种店铺要从 `presentment_currency` 取 |

---

## Scenario 2 — Meta Insights campaign-daily

**目标表**：`MetaCampaignDaily`
**端点**：`POST /api/insights/meta/campaign-daily`
**频率**：每日 02:00 UTC

### 模块流

```
[1] Set variables (yesterday)
    │
    ▼
[2] Data store → Get config
    │
    ▼
[3] Facebook Marketing API → Make API Call
    URL: /v22.0/{{2.meta_ad_account_id}}/insights
    Method: GET
    Query params:
      level = campaign
      time_range = {"since":"{{1.yesterday}}","until":"{{1.yesterday}}"}
      fields = campaign_id,campaign_name,objective,account_id,account_name,impressions,clicks,spend,cpm,cpc,ctr,actions,action_values
      action_attribution_windows = ["7d_click","1d_view"]
    Pagination: follow next.cursor（Make.com 模块勾上）
    │
    ▼
[4] Iterator → over [3].data[]
    │
    ▼
[5] Set variables → 抽取 actions/action_values 数组里的关键 action_type
    omni_purchase_value =
      {{ get(filter(5.action_values; "action_type"; "omni_purchase"); 1; "value") | default 0 }}
    omni_purchases =
      {{ get(filter(5.actions; "action_type"; "omni_purchase"); 1; "value") | default 0 }}
    omni_add_to_cart =
      {{ get(filter(5.actions; "action_type"; "omni_add_to_cart"); 1; "value") | default 0 }}
    omni_initiated_checkout =
      {{ get(filter(5.actions; "action_type"; "omni_initiated_checkout"); 1; "value") | default 0 }}
    │
    ▼
[6] Array aggregator → 收集成 rows 数组
    │
    ▼
[7] HTTP → POST /api/insights/meta/campaign-daily
```

### HTTP body

```json
{
  "tenant_id": "{{2.tenant_id}}",
  "rows": [
    {{6.array}}
  ]
}
```

其中 `[6].array` 每个元素由 [5] 输出，结构：

```json
{
  "date": "{{1.yesterday}}",
  "account_id": "{{4.account_id}}",
  "account_name": "{{4.account_name}}",
  "campaign_id": "{{4.campaign_id}}",
  "campaign_name": "{{4.campaign_name}}",
  "campaign_objective": "{{4.objective}}",
  "impressions": "{{4.impressions}}",
  "clicks_all": "{{4.clicks}}",
  "spend": "{{4.spend}}",
  "purchases": {{5.omni_purchases}},
  "purchase_conv_value": "{{5.omni_purchase_value}}",
  "adds_to_cart": {{5.omni_add_to_cart}},
  "initiated_checkouts": {{5.omni_initiated_checkout}},
  "cpm": "{{4.cpm}}",
  "cpc_all": "{{4.cpc}}",
  "ctr_all": "{{ 4.ctr / 100 }}",
  "roas": "{{ 5.omni_purchase_value / 4.spend }}"
}
```

### 字段映射要点

- Meta 的 `ctr` 是百分比（例 `1.23` 表示 1.23%），我们的字段是小数（0.0123），需要除以 100。
- `actions` 数组里的 `action_type` 用 **omni_*** 前缀的（覆盖 web + app + offline 全渠道），不要用纯 web 的 `purchase`/`add_to_cart`，否则跟 Looker 报表对不上。
- 单 ad account 多个时，把 [3] 改成 iterator over data store 里的 ad account 列表。
- `time_range` 想拉**回填**（例如最近 7 天）时把 since/until 调宽。我们的 upsert 用 `(tenantId, date, campaignId)` 做主键，重跑幂等。

---

## Scenario 3 — Google Ads account daily

**目标表**：`GoogleDailyMetric`
**端点**：`POST /api/insights/google/daily`
**频率**：每日 02:00 UTC

### 模块流

```
[1] Set variables (yesterday)
    │
    ▼
[2] Data store → Get config
    │
    ▼
[3] Google Ads → Search Stream (GAQL)
    Customer ID: {{2.google_customer_id}}
    Query: ↓
        SELECT
          segments.date,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions,
          metrics.conversions_value,
          metrics.average_cpc,
          metrics.ctr
        FROM customer
        WHERE segments.date = '{{1.yesterday}}'
    │
    ▼
[4] Aggregator → SUM 所有指标（同一天可能多个 sub-customer 行）
    │
    ▼
[5] HTTP → POST /api/insights/google/daily
```

### HTTP body

```json
{
  "tenant_id": "{{2.tenant_id}}",
  "rows": [
    {
      "date": "{{1.yesterday}}",
      "impressions": {{4.impressions}},
      "clicks": {{4.clicks}},
      "cost": "{{ 4.cost_micros / 1000000 }}",
      "total_conv_value": "{{4.conversions_value}}",
      "purchases": {{ floor(4.conversions) }},
      "adds_to_cart": 0,
      "begins_checkout": 0,
      "avg_cpc": "{{ 4.average_cpc / 1000000 }}",
      "ctr": "{{ 4.ctr }}"
    }
  ]
}
```

### 字段映射要点

- **cost_micros**：Google Ads 用 micros (1 USD = 1,000,000)，必须除以 1,000,000 转成美元。`average_cpc` 同样是 micros。
- **`conversions`** 是浮点（含小数权重），我们的 `purchases` 是整数。简单处理：`floor()`。如果想精确，加一个浮点中间字段。
- **adds_to_cart / begins_checkout** 只有专门配置了 conversion action 的账号才有。Phase 1 先填 0，Phase 3 再补（用 conversion_action 维度查询）。
- **ctr**：Google Ads 这里返回的是小数（0.0123 = 1.23%），不需要再转换，跟我们的字段同方向。

---

## Scenario 4 — Google Ads by campaign type daily

**目标表**：`GoogleCampaignTypeDaily`
**端点**：`POST /api/insights/google/campaign-type`
**频率**：每日 02:00 UTC

### 模块流

```
[1] Set variables (yesterday)
    │
    ▼
[2] Data store → Get config
    │
    ▼
[3] Google Ads → Search Stream (GAQL)
    Query: ↓
        SELECT
          segments.date,
          campaign.advertising_channel_type,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions,
          metrics.conversions_value
        FROM campaign
        WHERE segments.date = '{{1.yesterday}}'
          AND campaign.status != 'REMOVED'
    │
    ▼
[4] Aggregator → 按 advertising_channel_type 分组 SUM
    │
    ▼
[5] Iterator over [4]
    │
    ▼
[6] Array aggregator → 收集 rows
    │
    ▼
[7] HTTP → POST /api/insights/google/campaign-type
```

### HTTP body

```json
{
  "tenant_id": "{{2.tenant_id}}",
  "rows": [
    {{6.array}}
  ]
}
```

每个 row：
```json
{
  "date": "{{1.yesterday}}",
  "campaign_type": "{{ 5.advertising_channel_type | mapType }}",
  "clicks": {{5.clicks}},
  "cost": "{{ 5.cost_micros / 1000000 }}",
  "purchases": {{ floor(5.conversions) }},
  "total_conv_value": "{{5.conversions_value}}",
  "roas": "{{ 5.conversions_value / (5.cost_micros / 1000000) }}"
}
```

### `campaign_type` 值映射（Google Ads enum → 我们看板上显示的字符串）

把 GAQL 返回的 enum 值映射到看板字符串（在 Set variables 模块里写 switch / lookup）：

| Google Ads enum | 我们存的值 |
|---|---|
| `PERFORMANCE_MAX` | `Performance Max` |
| `SEARCH` | `Search` |
| `SHOPPING` | `Shopping` |
| `VIDEO` | `Video` |
| `DISCOVERY` / `DEMAND_GEN` | `Discovery` |
| `DISPLAY` | `Display` |
| `LOCAL_SERVICES` / `MULTI_CHANNEL` / 其它 | enum 原值 |

---

## 导入蓝图（可选，作为模块布局起点）

`./blueprints/` 目录下 4 个 JSON 是**框架蓝图**，包含：

- Set variables 模块（已配置 yesterday 计算）
- Data store get 模块（占位，连接需要在 Make.com 里手工选）
- HTTP POST 模块（URL、headers、body 模板已配好，只需替换 `{{...}}` 引用上游模块输出）
- 中间的数据源模块（Shopify/Facebook/Google Ads）**留空**——这些模块的版本和必填参数取决于你 Make.com 账号里安装的具体 app 版本，按上面"模块流"章节手工添加最稳

导入步骤：

1. Make.com → My scenarios → "Create a new scenario" 旁边的 ⋯ → **Import blueprint**
2. 选择 `01-shopify-daily.blueprint.json`（先一个一个来）
3. 导入后会有红色警告：连接缺失。打开每个红色模块，选择对应连接（或先创建连接）
4. 在中间手工添加 Shopify/Facebook/Google Ads 模块，按上面"模块流"配置
5. 测试运行（**Run once**），检查最后 HTTP 模块返回 `{"ok":true,"data":{"upserted":N}}`
6. 调整成功后 → Schedule → daily 02:00 UTC → Activate

## 验证

每次 scenario 跑完，到服务器查看新行：

```bash
ssh root@47.251.57.66 'docker exec makcom_ads_mysql sh -c "mysql -uroot -p\$MYSQL_ROOT_PASSWORD makcom_ads -e \"SELECT date, totalSales, orders, returns FROM ShopifyDailyMetric WHERE tenantId=\\\"<your_tenant_id>\\\" ORDER BY date DESC LIMIT 5;\""'
```

或者直接打开 [http://47.251.57.66:8090/reports](http://47.251.57.66:8090/reports) 看 KPI 卡有没有更新。

## 回填历史数据

如果你想拉过去 30 天而不是只拉昨天：

- **临时回填**：在第一个 Set variables 里放一个静态日期范围，把 `time_range` / `WHERE segments.date BETWEEN ...` 改宽。`MetaCampaignDaily` 等都是按 `(tenantId, date, ...)` 主键 upsert，重跑幂等。
- **批量按天循环**：用 Make.com 的 iterator 模块生成 `[yesterday-30 ... yesterday-1]` 的日期数组，对每个日期跑一次 GAQL/Insights 调用 + POST。注意 Meta/Google 都有日 quota，一次别拉太多。
