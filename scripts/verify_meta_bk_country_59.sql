USE tenniix_mshop;

SELECT 'Country breakdown aggregate' AS section;
SELECT
  COUNT(*)                          AS rows_n,
  ROUND(SUM(spend),2)               AS spend,
  SUM(purchases)                    AS purchases,
  ROUND(SUM(purchaseConvValue),2)   AS conv_value,
  MAX(fetchedAt)                    AS last_fetched
FROM MetaBreakdownDaily
WHERE breakdownType='country' AND date='2026-05-09';

SELECT 'Top 13 countries by spend' AS section;
SELECT dim1 AS country,
       ROUND(spend,2) AS spend,
       purchases,
       ROUND(purchaseConvValue,2) AS conv_value,
       ROUND(spend/NULLIF(purchases,0),2) AS cpa
FROM MetaBreakdownDaily
WHERE breakdownType='country' AND date='2026-05-09'
ORDER BY spend DESC
LIMIT 13;

SELECT 'MetaAdDaily 5/9 sum (sanity)' AS section;
SELECT
  COUNT(DISTINCT adId) AS ads,
  ROUND(SUM(spend),2)              AS spend,
  SUM(websitePurchases)            AS purchases,
  ROUND(SUM(purchaseConvValue),2)  AS conv_value,
  MAX(fetchedAt)                   AS last_fetched
FROM MetaAdDaily
WHERE date='2026-05-09';
