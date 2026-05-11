USE tenniix_mshop;

-- See if any "duplicate" attribution is happening: are there campaigns where
-- per-row purchases × conv_value ratio is inconsistent with the dedup truth?
SELECT '=== Per-campaign purchases sum vs ratio ===' AS section;
SELECT
  campaignName,
  ROUND(spend,2) AS spend,
  purchases,
  addsToCart,
  initiatedCheckouts,
  ROUND(purchaseConvValue,2) AS conv_value,
  ROUND(purchaseConvValue/NULLIF(purchases,0),2) AS aov
FROM MetaCampaignDaily
WHERE date='2026-05-09' AND purchases > 0
ORDER BY purchases DESC;

SELECT '=== Total non-zero campaigns ===' AS section;
SELECT
  COUNT(*) AS campaigns_with_data,
  SUM(CASE WHEN purchases > 0 THEN 1 ELSE 0 END) AS campaigns_with_purchases,
  SUM(CASE WHEN spend > 0 THEN 1 ELSE 0 END) AS campaigns_with_spend,
  SUM(CASE WHEN impressions > 0 THEN 1 ELSE 0 END) AS campaigns_with_impr
FROM MetaCampaignDaily
WHERE date='2026-05-09';
