USE womo_mshop;
DELETE FROM GoogleDailyMetric;
DELETE FROM GoogleCampaignTypeDaily;
DELETE FROM GoogleBreakdownDaily;
DELETE FROM MetaCampaignDaily;
DELETE FROM MetaAdDaily;
DELETE FROM MetaBreakdownDaily;
DELETE FROM ShopifyDailyMetric;
SELECT 'AFTER' AS phase,
  (SELECT COUNT(*) FROM GoogleDailyMetric) AS google_daily,
  (SELECT COUNT(*) FROM MetaCampaignDaily) AS meta_campaign,
  (SELECT COUNT(*) FROM ShopifyDailyMetric) AS shopify;
