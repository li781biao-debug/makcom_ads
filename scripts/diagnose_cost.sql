-- Inspect Google + Meta cost values to find the unit issue
SELECT '=== GoogleDailyMetric (last 5 days) ===' AS section;
SELECT date, impressions, clicks, cost, totalConvValue, purchases
FROM tenniix_mshop.GoogleDailyMetric
ORDER BY date DESC LIMIT 10;

SELECT '=== GoogleCampaignTypeDaily (last 10) ===' AS section;
SELECT date, campaignType, clicks, cost, purchases, totalConvValue
FROM tenniix_mshop.GoogleCampaignTypeDaily
ORDER BY date DESC, cost DESC LIMIT 10;

SELECT '=== GoogleBreakdownDaily cost stats ===' AS section;
SELECT
  breakdownType,
  COUNT(*) AS rows_n,
  ROUND(MIN(cost), 4) AS min_cost,
  ROUND(MAX(cost), 4) AS max_cost,
  ROUND(AVG(cost), 4) AS avg_cost
FROM tenniix_mshop.GoogleBreakdownDaily
GROUP BY breakdownType;

SELECT '=== MetaCampaignDaily (last 10) ===' AS section;
SELECT date, campaignName, impressions, clicksAll, spend, purchases, purchaseConvValue
FROM tenniix_mshop.MetaCampaignDaily
ORDER BY date DESC LIMIT 10;
