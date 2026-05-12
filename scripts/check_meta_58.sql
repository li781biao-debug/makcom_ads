USE tenniix_mshop;
SELECT date, COUNT(*) AS rows_n, ROUND(SUM(spend),2) AS spend,
       SUM(impressions) AS impressions, SUM(clicksAll) AS clicks,
       MAX(fetchedAt) AS last_fetched
FROM MetaCampaignDaily
WHERE date BETWEEN '2026-05-07' AND '2026-05-10'
GROUP BY date
ORDER BY date DESC;
