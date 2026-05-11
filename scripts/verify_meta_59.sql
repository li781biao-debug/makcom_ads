USE tenniix_mshop;
SELECT 'Meta 5/9 aggregate from MetaCampaignDaily' AS section;
SELECT
  ROUND(SUM(spend), 2)               AS spend,
  ROUND(SUM(purchaseConvValue), 2)   AS conv_value,
  SUM(purchases)                     AS purchases,
  SUM(addsToCart)                    AS atc,
  SUM(initiatedCheckouts)            AS ic,
  SUM(impressions)                   AS impressions,
  SUM(clicksAll)                     AS clicks,
  ROUND(SUM(purchaseConvValue) / NULLIF(SUM(spend),0), 2) AS roas,
  COUNT(*)                           AS rows_n
FROM MetaCampaignDaily
WHERE date = '2026-05-09';

SELECT 'Top 5 campaigns by spend on 5/9' AS section;
SELECT campaignName, ROUND(spend,2) AS spend, purchases, addsToCart, initiatedCheckouts, ROUND(purchaseConvValue,2) AS conv_value
FROM MetaCampaignDaily WHERE date='2026-05-09'
ORDER BY spend DESC LIMIT 5;
