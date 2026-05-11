-- All campaign rows for 5/7 with their latest fetchedAt
SELECT '=== MetaCampaignDaily 5/7 sums ===' AS section;
SELECT
  COUNT(*)                          AS rows_n,
  ROUND(SUM(spend), 2)              AS total_spend,
  ROUND(SUM(purchaseConvValue), 2)  AS conv_value,
  SUM(purchases)                    AS purchases,
  SUM(addsToCart)                   AS adds_to_cart,
  SUM(initiatedCheckouts)           AS init_checkouts,
  SUM(impressions)                  AS impressions,
  SUM(clicksAll)                    AS clicks_all,
  MIN(fetchedAt)                    AS first_fetched,
  MAX(fetchedAt)                    AS last_fetched
FROM tenniix_mshop.MetaCampaignDaily
WHERE date = '2026-05-07';

SELECT '=== Per-campaign breakdown (5/7) ===' AS section;
SELECT campaignName, ROUND(spend,2) AS spend, purchases, addsToCart, initiatedCheckouts,
       ROUND(purchaseConvValue,2) AS conv_value, fetchedAt
FROM tenniix_mshop.MetaCampaignDaily
WHERE date = '2026-05-07'
ORDER BY spend DESC;
