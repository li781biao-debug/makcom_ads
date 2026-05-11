USE tenniix_mshop;
SELECT '=== Row counts + date range per table ===' AS section;
SELECT 'ShopifyDailyMetric' AS tbl, COUNT(*) AS rows_n, MIN(date) AS first_d, MAX(date) AS last_d, MAX(fetchedAt) AS last_fetched FROM ShopifyDailyMetric
UNION ALL SELECT 'MetaCampaignDaily', COUNT(*), MIN(date), MAX(date), MAX(fetchedAt) FROM MetaCampaignDaily
UNION ALL SELECT 'MetaAdDaily', COUNT(*), MIN(date), MAX(date), MAX(fetchedAt) FROM MetaAdDaily
UNION ALL SELECT 'MetaBreakdownDaily', COUNT(*), MIN(date), MAX(date), MAX(fetchedAt) FROM MetaBreakdownDaily
UNION ALL SELECT 'GoogleDailyMetric', COUNT(*), MIN(date), MAX(date), MAX(fetchedAt) FROM GoogleDailyMetric
UNION ALL SELECT 'GoogleCampaignTypeDaily', COUNT(*), MIN(date), MAX(date), MAX(fetchedAt) FROM GoogleCampaignTypeDaily
UNION ALL SELECT 'GoogleBreakdownDaily', COUNT(*), MIN(date), MAX(date), MAX(fetchedAt) FROM GoogleBreakdownDaily;

SELECT '=== Distinct Meta accounts ===' AS section;
SELECT accountId, accountName, COUNT(*) AS rows_n
FROM MetaCampaignDaily GROUP BY accountId, accountName;

SELECT '=== Distinct Google customers ===' AS section;
SELECT customerId, customerName, COUNT(*) AS rows_n
FROM GoogleDailyMetric GROUP BY customerId, customerName;

SELECT '=== 5/10 sanity (latest full day) ===' AS section;
SELECT 'Meta Camp 5/10' AS k, ROUND(SUM(spend),2) v1, SUM(purchases) v2, SUM(addsToCart) v3 FROM MetaCampaignDaily WHERE date='2026-05-10'
UNION ALL SELECT 'Google 5/10', ROUND(SUM(cost),2), SUM(purchases), SUM(addsToCart) FROM GoogleDailyMetric WHERE date='2026-05-10'
UNION ALL SELECT 'Shopify 5/10', ROUND(SUM(totalSales),2), SUM(orders), SUM(returns) FROM ShopifyDailyMetric WHERE date='2026-05-10';

SELECT '=== Meta breakdown types covered ===' AS section;
SELECT breakdownType, COUNT(*) AS rows_n FROM MetaBreakdownDaily GROUP BY breakdownType;

SELECT '=== Google breakdown types covered ===' AS section;
SELECT breakdownType, COUNT(*) AS rows_n FROM GoogleBreakdownDaily GROUP BY breakdownType;
