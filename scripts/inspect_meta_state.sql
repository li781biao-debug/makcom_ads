SELECT '=== MetaCampaignDaily by date (recent) ===' AS section;
SELECT date,
       COUNT(*) AS rows_n,
       ROUND(SUM(spend), 2)              AS total_spend,
       ROUND(SUM(purchaseConvValue), 2)  AS conv_value,
       SUM(purchases)                    AS purchases,
       SUM(addsToCart)                   AS adds_to_cart,
       SUM(initiatedCheckouts)           AS init_checkouts,
       MAX(fetchedAt)                    AS last_fetched
FROM tenniix_mshop.MetaCampaignDaily
GROUP BY date
ORDER BY date DESC
LIMIT 14;

SELECT '=== Aggregate over last 28 days (from today 5/9) ===' AS section;
SELECT
  COUNT(DISTINCT date) AS days_with_data,
  ROUND(SUM(spend), 2)             AS total_spend,
  ROUND(SUM(purchaseConvValue), 2) AS total_conv_value,
  ROUND(SUM(purchaseConvValue) / NULLIF(SUM(spend), 0), 2) AS roas,
  SUM(purchases)         AS total_purchases,
  SUM(addsToCart)        AS total_atc,
  SUM(initiatedCheckouts) AS total_ic,
  SUM(impressions)       AS total_impressions,
  SUM(clicksAll)         AS total_clicks
FROM tenniix_mshop.MetaCampaignDaily
WHERE date >= '2026-04-12';
