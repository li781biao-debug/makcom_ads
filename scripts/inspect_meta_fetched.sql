SELECT '=== MetaCampaignDaily date vs fetchedAt ===' AS section;
SELECT date, MIN(fetchedAt) AS first_fetched, MAX(fetchedAt) AS last_fetched, COUNT(*) AS rows_n
FROM tenniix_mshop.MetaCampaignDaily
GROUP BY date
ORDER BY date DESC;

SELECT '=== Distinct fetchedAt across all Meta tables ===' AS section;
SELECT 'MetaCampaign' AS tbl, DATE_FORMAT(fetchedAt, '%Y-%m-%d %H:%i') AS minute, COUNT(*) AS rows_n
FROM tenniix_mshop.MetaCampaignDaily
GROUP BY minute
UNION ALL
SELECT 'MetaAd', DATE_FORMAT(fetchedAt, '%Y-%m-%d %H:%i'), COUNT(*)
FROM tenniix_mshop.MetaAdDaily
GROUP BY DATE_FORMAT(fetchedAt, '%Y-%m-%d %H:%i')
UNION ALL
SELECT 'MetaBreak', DATE_FORMAT(fetchedAt, '%Y-%m-%d %H:%i'), COUNT(*)
FROM tenniix_mshop.MetaBreakdownDaily
GROUP BY DATE_FORMAT(fetchedAt, '%Y-%m-%d %H:%i')
ORDER BY tbl, minute DESC;
