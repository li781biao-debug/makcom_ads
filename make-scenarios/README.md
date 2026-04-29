# Make.com Scenarios — 完整配置清单

把 3 个平台（Shopify / Meta / Google）的数据接入看板，最少 **5 个 scenario** 跑完。设计原则：**Make.com 只做"取数 → 转发"，所有数据处理和转化放在业务端**（我们的 API 端点）。

```
Shopify  ─[1] daily orders ──────▶ /api/insights/shopify/daily ─▶ ShopifyDailyMetric
Meta     ─[2] campaign+ad daily ─▶ /api/insights/meta/{campaign,ad}-daily ─▶ MetaCampaignDaily / MetaAdDaily
Meta     ─[3] breakdowns 循环 ──▶ /api/insights/meta/breakdown ─▶ MetaBreakdownDaily
Google   ─[4] daily+by_type ────▶ /api/insights/google/{daily,campaign-type} ─▶ GoogleDailyMetric / Type
Google   ─[5] breakdowns 循环 ──▶ /api/insights/google/breakdown ─▶ GoogleBreakdownDaily
```

---

## 一次性准备

### A. 服务器端 secret 和 tenant_id

```bash
ssh root@47.251.57.66 'grep MAKE_SHARED_SECRET /opt/makcom_ads/.env.production'
# tenant_id 已知：cmogsd46v0001mw016lgb3dzz （biao 工作区）
```

### B. Make.com Facebook Insights connection（OAuth）

Make.com 内置 **Facebook Insights** 应用已经处理 OAuth + 字段选择 + breakdown，比手写 HTTP 简单很多。如果你 Make.com → **Connections** 里已经有一条 Facebook 连接（带 `ads_read` scope，授权时勾过"读取广告"权限），直接复用即可。

如果还没有：在 scenario 里随便加一个 **Facebook Insights → Get Insights** 模块，第一次配置时它会弹 Facebook 授权对话框，登录并授权所需权限即可。

### C. Make.com Data Store（共享配置）

新建一个 Data Store，名字 `makcom_config`，有一条记录 `key=cfg`：

| field | value |
|---|---|
| tenant_id | `cmogsd46v0001mw016lgb3dzz` |
| make_secret | 上面 A 拿到的 MAKE_SHARED_SECRET |
| api_base | `https://api.metraxis.me` |
| meta_account_id | `act_xxxxxxxxxxxxxxxx`（你的 Meta 广告账号；用于 Google Ads 不相关）|
| google_customer_id | `1234567890`（去横线）|
| google_login_customer_id | （可选，MCC ID）|
| shopify_shop | `tenniix.myshopify.com` |

> 注：用 Facebook Insights 模块时不再需要 `meta_token`——OAuth 全部由 Make.com 维护。

每个 scenario 第一步都是 `Data Store → Get a Record (key=cfg)`，后续模块直接用 `{{2.tenant_id}}` 等引用。

### D. 通用模块模板

每个 scenario 都有这两个固定模块：

**模块 1 — Set Variables**
```
yesterday = {{formatDate(addDays(now; -1); "YYYY-MM-DD")}}
```

**模块末尾 — HTTP → Make a request**

| 字段 | 值 |
|---|---|
| URL | `{{2.api_base}}/api/insights/<...>` |
| Method | POST |
| Headers | `X-Make-Secret: {{2.make_secret}}` + `Content-Type: application/json` |
| Body type | Raw |
| Content type | application/json |
| Request content | 见下方每个 scenario 的 body 模板 |

---

## Scenario 1 — Shopify daily orders

**目标表**：`ShopifyDailyMetric`
**频率**：每日 02:00 UTC

```
[1] Set vars (yesterday)
[2] Data Store → cfg
[3] Shopify → List orders
       created_at_min: {{1.yesterday}}T00:00:00Z
       created_at_max: {{1.yesterday}}T23:59:59Z
       status: any
       limit: 250 (auto-paginate)
[4] Numeric Aggregator
       SUM(total_price) → total_sales
       COUNT → orders
       SUM(refund_count) → returns（如果你 Shopify 有 refund 关联，否则填 0）
[5] HTTP POST → /api/insights/shopify/daily
```

Body：
```json
{
  "tenant_id": "{{2.tenant_id}}",
  "rows": [{
    "date": "{{1.yesterday}}",
    "total_sales": "{{4.total_sales}}",
    "orders": {{4.orders}},
    "returns": {{4.returns}},
    "currency": "USD"
  }]
}
```

---

## Scenario 2 — Meta campaign + ad daily

**目标表**：`MetaCampaignDaily` + `MetaAdDaily`
**频率**：每日 02:00 UTC

> 关键：用 Make.com 内置的 **Facebook Insights → Get Insights** 模块，它会自动处理 OAuth、字段、迭代输出。`actions[]` 和 `action_values[]` **直接原样转发**给我们后端，我们这边解析 `omni_purchase` 等。Make.com 不需要做 filter/extract。

### Campaign-level

```
[1] Set vars
       yesterday = {{formatDate(addDays(now; -1); "YYYY-MM-DD")}}
[2] Data Store → Get a record (key=cfg)
[3] Facebook Insights → Get Insights
       Connection: 你的 Facebook Insights 连接
       Get Insights for: Campaign
       Specify Date by: Time Range
         Time Range: { since: {{1.yesterday}}, until: {{1.yesterday}} }
       Time Increment: 1
       Fields (勾这些):
         account_id, account_name, campaign_id, campaign_name, objective,
         impressions, clicks, spend, cpm, cpc, ctr, actions, action_values
       Breakdowns: (空)
[4] Array aggregator
       Source: [3]
       Target structure: Custom
         （字段直接照抄 [3] 的输出，见下面的 body 模板）
[5] HTTP → Make a request
       URL: {{2.api_base}}/api/insights/meta/campaign-daily
       Method: POST
       Headers: X-Make-Secret = {{2.make_secret}}, Content-Type = application/json
       Body type: Raw / application/json
       Request content:
       {
         "tenant_id": "{{2.tenant_id}}",
         "rows": {{4.array}}
       }
```

Array aggregator 里每条 row 的字段映射（**直接 1:1 转发**，业务端做转化）：

```json
{
  "date_start": "{{3.date_start}}",
  "account_id": "{{3.account_id}}",
  "account_name": "{{3.account_name}}",
  "campaign_id": "{{3.campaign_id}}",
  "campaign_name": "{{3.campaign_name}}",
  "objective": "{{3.objective}}",
  "impressions": "{{3.impressions}}",
  "clicks": "{{3.clicks}}",
  "spend": "{{3.spend}}",
  "cpm": "{{3.cpm}}",
  "cpc": "{{3.cpc}}",
  "ctr": "{{3.ctr}}",
  "actions": {{3.actions}},
  "action_values": {{3.action_values}}
}
```

业务端会自动：
- 从 `actions[]` 提取 `omni_purchase`、`omni_add_to_cart`、`omni_initiated_checkout`
- 从 `action_values[]` 提取 `omni_purchase` 的 value 作为 `purchase_conv_value`
- 把 `ctr`（Meta 返回 1.23 = 1.23%）规范化成小数
- 计算 `roas = purchase_conv_value / spend`
- 接受 `date_start` 当作 `date`

所以你 Make.com 这边**完全不需要 filter / 计算 / 类型转换**。

### Ad-level

类似上面，把 [3] 的 "Get Insights for" 改成 **Ad**，Fields 改成：
```
ad_id, ad_name, adset_id, adset_name, campaign_id, account_id,
impressions, clicks, spend, cpm, cpc, ctr, actions, action_values
```

POST 端点改成 `/api/insights/meta/ad-daily`，Array aggregator 里多带几个字段：
```json
{
  "date_start": "{{3.date_start}}",
  "account_id": "{{3.account_id}}",
  "campaign_id": "{{3.campaign_id}}",
  "adset_id": "{{3.adset_id}}",
  "adset_name": "{{3.adset_name}}",
  "ad_id": "{{3.ad_id}}",
  "ad_name": "{{3.ad_name}}",
  "impressions": "{{3.impressions}}",
  "clicks": "{{3.clicks}}",
  "spend": "{{3.spend}}",
  "cpm": "{{3.cpm}}",
  "cpc": "{{3.cpc}}",
  "ctr": "{{3.ctr}}",
  "actions": {{3.actions}},
  "action_values": {{3.action_values}}
}
```

要 Creatives 表显示缩略图和文案（`ad_creative_image_url` + `ad_body`）的话，得再加一步：循环每个 `ad_id` 调 Facebook Pages → "Make an API Call" 拿 `creative{thumbnail_url, object_story_spec.video_data.message}`，拼到 row 里。先跳过这步，Creatives 表就只有名字 + 数字，等其他流程跑通后再加。

---

## Scenario 3 — Meta breakdowns 循环

**目标表**：`MetaBreakdownDaily`（一个表装所有 breakdown 类型）
**频率**：每日 02:00 UTC

6 种 breakdown 共用一个 scenario：在 scenario 顶部一次性 iterate 一个 breakdown 列表，每次跑一种。

```
[1] Set vars (yesterday)
[2] Data Store → cfg
[3] Iterator over 静态数组（6 种 breakdown）：
       [
         {bk: "country",            api: "country",            dim1_field: "country"},
         {bk: "publisher_platform", api: "publisher_platform", dim1_field: "publisher_platform"},
         {bk: "device_platform",    api: "device_platform",    dim1_field: "device_platform"},
         {bk: "age_gender",         api: "age,gender",         dim1_field: "age", dim2_field: "gender"},
         {bk: "promoted_object",    api: "promoted_object",    dim1_field: "promoted_object"},
         {bk: "landing_page",       api: "landing_url",        dim1_field: "landing_url"}
       ]
[4] Facebook Insights → Get Insights
       Connection: 你的 Facebook Insights 连接
       Get Insights for: Account
       Time Range: { since: {{1.yesterday}}, until: {{1.yesterday}} }
       Time Increment: 1
       Fields: impressions, clicks, spend, actions, action_values
       Breakdowns: {{3.api}}    ← 动态，每次循环不同
[5] Set vars (per-row 提取 dim1/dim2)
       dim1 = {{ get(4; 3.dim1_field) }}    ← 例如 4.country / 4.publisher_platform 等
       dim2 = {{ ifempty(get(4; 3.dim2_field); "") }}    ← 仅 age_gender 时有 dim2
[6] Array aggregator → rows
[7] HTTP POST → /api/insights/meta/breakdown
```

每条 row：
```json
{
  "date_start": "{{4.date_start}}",
  "breakdown_type": "{{3.bk}}",
  "dim1": "{{5.dim1}}",
  "dim2": "{{5.dim2}}",
  "impressions": "{{4.impressions}}",
  "clicks": "{{4.clicks}}",
  "spend": "{{4.spend}}",
  "actions": {{4.actions}},
  "action_values": {{4.action_values}}
}
```

业务端同样自动从 `actions[]`/`action_values[]` 提取 `purchases` 和 `purchase_conv_value`。

**`promoted_object` 注意事项**：Meta 返回是嵌套对象（如 `{"pixel_id":"123","custom_event_type":"PURCHASE"}`），Make.com 会渲染成 JSON 字符串。`dim1` 字段就用这个字符串，业务端原样存到表里。要更精细的话可以把 `dim1` 设为 `custom_event_type`、`dim_meta` 字段塞完整对象。

**`landing_page` 注意事项**：`landing_url` 这个 breakdown Meta 不一定在所有账号都返回值；如果发现这个表为空，看 Make.com History 里 [4] 的 raw output，确认 Meta API 是否真的支持这个 breakdown 在你账号上的使用。

---

## Scenario 4 — Google daily + campaign type

**目标表**：`GoogleDailyMetric` + `GoogleCampaignTypeDaily`
**频率**：每日 02:00 UTC

```
[1] Set vars (yesterday)
[2] Data Store → cfg

# === 账号日聚合 ===
[3] Google Ads → Search (GAQL)
       Customer ID: {{2.google_customer_id}}
       Login customer ID: {{2.google_login_customer_id}}（如果是 MCC）
       Query:
       SELECT segments.date,
              metrics.impressions,
              metrics.clicks,
              metrics.cost_micros,
              metrics.conversions,
              metrics.conversions_value,
              metrics.average_cpc,
              metrics.ctr
       FROM customer
       WHERE segments.date = '{{1.yesterday}}'
[4] Numeric Aggregator → SUM 全部
[5] HTTP POST → /api/insights/google/daily

# === 按 campaign type 分组 ===
[6] Google Ads → Search (GAQL)
       Query:
       SELECT segments.date,
              campaign.advertising_channel_type,
              metrics.clicks,
              metrics.cost_micros,
              metrics.conversions,
              metrics.conversions_value
       FROM campaign
       WHERE segments.date = '{{1.yesterday}}'
         AND campaign.status != 'REMOVED'
[7] Numeric Aggregator GROUP BY campaign.advertising_channel_type
[8] Iterator + Set vars (enum → display name)
       campaign_type =
         switch(7.advertising_channel_type;
                "PERFORMANCE_MAX"; "Performance Max";
                "SEARCH"; "Search";
                "SHOPPING"; "Shopping";
                "VIDEO"; "Video";
                "DEMAND_GEN"; "Discovery";
                "DISCOVERY"; "Discovery";
                "DISPLAY"; "Display";
                7.advertising_channel_type)
[9] Array Aggregator → rows
[10] HTTP POST → /api/insights/google/campaign-type
```

Body for [5]：
```json
{
  "tenant_id": "{{2.tenant_id}}",
  "rows": [{
    "date": "{{1.yesterday}}",
    "impressions": {{4.impressions}},
    "clicks": {{4.clicks}},
    "cost": "{{ 4.cost_micros / 1000000 }}",
    "total_conv_value": "{{4.conversions_value}}",
    "purchases": {{floor(4.conversions)}},
    "adds_to_cart": 0,
    "begins_checkout": 0,
    "avg_cpc": "{{ 4.average_cpc / 1000000 }}",
    "ctr": "{{4.ctr}}"
  }]
}
```

Body for [10]：
```json
{
  "tenant_id": "{{2.tenant_id}}",
  "rows": {{9.array}}
}
```
每条 row：
```json
{
  "date": "{{1.yesterday}}",
  "campaign_type": "{{8.campaign_type}}",
  "clicks": {{7.clicks}},
  "cost": "{{ 7.cost_micros / 1000000 }}",
  "purchases": {{floor(7.conversions)}},
  "total_conv_value": "{{7.conversions_value}}",
  "roas": "{{ 7.conversions_value / (7.cost_micros / 1000000) }}"
}
```

**关键转换**：
- `cost_micros` ÷ 1,000,000 → 美元
- `average_cpc` ÷ 1,000,000 → 美元
- `ctr` 已经是小数，不需再除
- `conversions` 是浮点 → `floor()` 取整

---

## Scenario 5 — Google breakdowns 循环

**目标表**：`GoogleBreakdownDaily`
**频率**：每日 02:00 UTC

8 种 breakdown 共用一个 scenario，靠 GAQL 区分查询，全部 POST 到同一个端点。

```
[1] Set vars (yesterday)
[2] Data Store → cfg
[3] Iterator over 静态数组，每项 (bk, gaql)：

  [
    {bk: "search_term_search", gaql: "SELECT search_term_view.search_term, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.conversions_value FROM search_term_view WHERE segments.date = '{{1.yesterday}}' AND segments.ad_network_type = 'SEARCH'"},
    {bk: "search_term_shopping", gaql: "... AND segments.ad_network_type = 'SHOPPING'"},
    {bk: "top_product_shopping", gaql: "SELECT segments.product_title, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.conversions_value FROM shopping_performance_view WHERE segments.date = '{{1.yesterday}}'"},
    {bk: "final_url", gaql: "SELECT campaign.advertising_channel_type, ad_group_ad.ad.final_urls, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.conversions_value FROM ad_group_ad WHERE segments.date = '{{1.yesterday}}'"},
    {bk: "country", gaql: "SELECT segments.geo_target_country, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.conversions_value FROM geographic_view WHERE segments.date = '{{1.yesterday}}'"},
    {bk: "conv_value_gender", gaql: "SELECT ad_group_criterion.gender.type, metrics.conversions_value FROM gender_view WHERE segments.date = '{{1.yesterday}}'"},
    {bk: "conv_value_age", gaql: "SELECT ad_group_criterion.age_range.type, metrics.conversions_value FROM age_range_view WHERE segments.date = '{{1.yesterday}}'"},
    {bk: "conv_value_device", gaql: "SELECT segments.device, metrics.conversions_value FROM customer WHERE segments.date = '{{1.yesterday}}'"}
  ]

[4] Google Ads → Search → query: {{3.gaql}}
[5] Iterator over results
[6] Set vars → dim1 (按 bk 取对应字段)
[7] Array Aggregator
[8] HTTP POST → /api/insights/google/breakdown
```

Body：
```json
{
  "tenant_id": "{{2.tenant_id}}",
  "rows": {{7.array}}
}
```
每条 row：
```json
{
  "date": "{{1.yesterday}}",
  "breakdown_type": "{{3.bk}}",
  "dim1": "{{6.dim1}}",
  "dim2": "",
  "clicks": {{5.metrics.clicks}},
  "cost": "{{ 5.metrics.cost_micros / 1000000 }}",
  "purchases": {{floor(5.metrics.conversions)}},
  "total_conv_value": "{{5.metrics.conversions_value}}",
  "all_conv_value": "{{5.metrics.conversions_value}}"
}
```

`final_url` 特例：`dim1 = ad_group_ad.ad.final_urls[0]`，`dim2 = campaign.advertising_channel_type`。

---

## 排程与试运行

每个 scenario 配好后：

1. 测试：把日期改成最近有数据的某一天，**Run once**，看返回是不是 `{"ok": true, "data": {"upserted": N}}`，N 大于 0
2. 看后端日志确认数据落表：
   ```bash
   ssh root@47.251.57.66 'docker exec makcom_ads_mysql sh -c "mysql -uroot -p\\$MYSQL_ROOT_PASSWORD makcom_ads -e \"SELECT COUNT(*) FROM MetaCampaignDaily WHERE tenantId='\''cmogsd46v0001mw016lgb3dzz'\''; SELECT MAX(date) FROM MetaCampaignDaily;\""'
   ```
3. 通过后 → **Scheduling**: Every day at 02:00 UTC（北京时间 10:00）→ **ON**

## 回填历史数据

把 `Set vars` 里的 `yesterday` 改成静态数组循环 `[2026-04-01, 2026-04-02, ...]`，加一层 Iterator，每次跑一天。**所有写入端点都按 `(tenantId, date, ...)` upsert，幂等**，可以放心重跑。

## 端点字段参考

完整 zod schema 在代码里：[src/lib/insights/schemas.ts](../src/lib/insights/schemas.ts)。snake_case 字段名，写错了会 400 + 详细错误。

## 验证 — 看板有数据

数据进 DB 后立即去 [https://api.metraxis.me/reports](https://api.metraxis.me/reports) 看：
- Overview 上有 Shopify 销售卡 + 总折线
- Meta 标签页有 KPI + 时间序列 + Campaigns 表 + 5 个 breakdown 表/饼
- Google 标签页有 KPI + 时间序列 + Campaign types + 5 个 breakdown 表/饼
- 每页头部"数据最新更新"显示对应 source 的 fetchedAt

如果某块空着，说明对应 scenario 没跑或没拉到数据。看 Make.com History 的 execution log + 后端 `docker compose logs --tail=50 app` 可以定位到哪一步。

---

## 端点对照表（备查）

| 端点 | 数据表 | 用途 |
|---|---|---|
| `/api/insights/shopify/daily` | ShopifyDailyMetric | Shopify 日订单聚合 |
| `/api/insights/meta/campaign-daily` | MetaCampaignDaily | Meta 各 campaign 日数据 |
| `/api/insights/meta/ad-daily` | MetaAdDaily | Meta 各 ad 日数据 + creative 信息 |
| `/api/insights/meta/breakdown` | MetaBreakdownDaily | Meta 6 种维度 breakdown |
| `/api/insights/google/daily` | GoogleDailyMetric | Google 账号日聚合 |
| `/api/insights/google/campaign-type` | GoogleCampaignTypeDaily | Google 按 channel type |
| `/api/insights/google/breakdown` | GoogleBreakdownDaily | Google 8 种维度 breakdown |
