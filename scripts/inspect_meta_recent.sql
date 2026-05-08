-- What dates have Meta rows in tenniix_mshop?
SELECT '=== MetaCampaignDaily by date ===' AS section;
SELECT date, COUNT(*) AS rows_n, ROUND(SUM(spend), 2) AS total_spend
FROM tenniix_mshop.MetaCampaignDaily
GROUP BY date
ORDER BY date DESC
LIMIT 10;

SELECT '=== MetaAdDaily by date ===' AS section;
SELECT date, COUNT(*) AS rows_n
FROM tenniix_mshop.MetaAdDaily
GROUP BY date
ORDER BY date DESC
LIMIT 10;

SELECT '=== MetaBreakdownDaily by date ===' AS section;
SELECT date, COUNT(*) AS rows_n
FROM tenniix_mshop.MetaBreakdownDaily
GROUP BY date
ORDER BY date DESC
LIMIT 10;

SELECT '=== Recent MakeJob entries (Meta) ===' AS section;
SELECT id, scenario, status, durationMs,
       LEFT(IFNULL(error, ''), 200) AS error_preview,
       createdAt
FROM makcom_ads.MakeJob
WHERE scenario LIKE '%meta%' OR scenario LIKE '%Meta%'
ORDER BY createdAt DESC
LIMIT 10;
