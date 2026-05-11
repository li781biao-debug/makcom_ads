SELECT '=== Distinct accounts in MetaCampaignDaily 5/7 ===' AS section;
SELECT accountId, accountName,
       COUNT(*) AS campaigns,
       ROUND(SUM(spend), 2) AS spend,
       SUM(purchases) AS purchases
FROM tenniix_mshop.MetaCampaignDaily
WHERE date = '2026-05-07'
GROUP BY accountId, accountName;

SELECT '=== Distinct accounts overall ===' AS section;
SELECT accountId, accountName, COUNT(DISTINCT date) AS days, COUNT(*) AS rows_n
FROM tenniix_mshop.MetaCampaignDaily
GROUP BY accountId, accountName;

SELECT '=== Any 5/8 or 5/9 rows? ===' AS section;
SELECT date, COUNT(*) AS rows_n, MAX(fetchedAt) AS last_fetched
FROM tenniix_mshop.MetaCampaignDaily
WHERE date >= '2026-05-08'
GROUP BY date;
