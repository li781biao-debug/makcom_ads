-- One-shot data migration: makcom_ads → tenniix_mshop for the tenniix tenant.
-- Tenant ID: cmogsd46v0001mw016lgb3dzz
-- Idempotent: uses INSERT IGNORE so re-runs are safe.
SET @TID = 'cmogsd46v0001mw016lgb3dzz';

-- BI fact tables (have tenantId)
INSERT IGNORE INTO tenniix_mshop.ShopifyDailyMetric        SELECT * FROM makcom_ads.ShopifyDailyMetric        WHERE tenantId = @TID;
INSERT IGNORE INTO tenniix_mshop.MetaCampaignDaily         SELECT * FROM makcom_ads.MetaCampaignDaily         WHERE tenantId = @TID;
INSERT IGNORE INTO tenniix_mshop.MetaAdDaily               SELECT * FROM makcom_ads.MetaAdDaily               WHERE tenantId = @TID;
INSERT IGNORE INTO tenniix_mshop.MetaBreakdownDaily        SELECT * FROM makcom_ads.MetaBreakdownDaily        WHERE tenantId = @TID;
INSERT IGNORE INTO tenniix_mshop.GoogleDailyMetric         SELECT * FROM makcom_ads.GoogleDailyMetric         WHERE tenantId = @TID;
INSERT IGNORE INTO tenniix_mshop.GoogleCampaignTypeDaily   SELECT * FROM makcom_ads.GoogleCampaignTypeDaily   WHERE tenantId = @TID;
INSERT IGNORE INTO tenniix_mshop.GoogleBreakdownDaily      SELECT * FROM makcom_ads.GoogleBreakdownDaily      WHERE tenantId = @TID;

-- Meta domain (parents before children)
INSERT IGNORE INTO tenniix_mshop.MetaConnection            SELECT * FROM makcom_ads.MetaConnection            WHERE tenantId = @TID;
INSERT IGNORE INTO tenniix_mshop.AdAccount                 SELECT * FROM makcom_ads.AdAccount                 WHERE tenantId = @TID;
INSERT IGNORE INTO tenniix_mshop.Campaign                  SELECT * FROM makcom_ads.Campaign                  WHERE tenantId = @TID;

-- AdSet has no tenantId — filter via Campaign
INSERT IGNORE INTO tenniix_mshop.AdSet
  SELECT s.* FROM makcom_ads.AdSet s
  JOIN makcom_ads.Campaign c ON c.id = s.campaignId
  WHERE c.tenantId = @TID;

INSERT IGNORE INTO tenniix_mshop.Creative                  SELECT * FROM makcom_ads.Creative                  WHERE tenantId = @TID;
INSERT IGNORE INTO tenniix_mshop.Asset                     SELECT * FROM makcom_ads.Asset                     WHERE tenantId = @TID;

-- Ad has no tenantId — filter via AdSet → Campaign chain
INSERT IGNORE INTO tenniix_mshop.Ad
  SELECT a.* FROM makcom_ads.Ad a
  JOIN makcom_ads.AdSet s ON s.id = a.adSetId
  JOIN makcom_ads.Campaign c ON c.id = s.campaignId
  WHERE c.tenantId = @TID;

-- InsightCache has adAccountId but no tenantId
INSERT IGNORE INTO tenniix_mshop.InsightCache
  SELECT ic.* FROM makcom_ads.InsightCache ic
  JOIN makcom_ads.AdAccount aa ON aa.id = ic.adAccountId
  WHERE aa.tenantId = @TID;

-- Verification: row counts
SELECT 'ShopifyDailyMetric' AS tbl, COUNT(*) AS n FROM tenniix_mshop.ShopifyDailyMetric
UNION ALL SELECT 'MetaCampaignDaily',       COUNT(*) FROM tenniix_mshop.MetaCampaignDaily
UNION ALL SELECT 'MetaAdDaily',             COUNT(*) FROM tenniix_mshop.MetaAdDaily
UNION ALL SELECT 'MetaBreakdownDaily',      COUNT(*) FROM tenniix_mshop.MetaBreakdownDaily
UNION ALL SELECT 'GoogleDailyMetric',       COUNT(*) FROM tenniix_mshop.GoogleDailyMetric
UNION ALL SELECT 'GoogleCampaignTypeDaily', COUNT(*) FROM tenniix_mshop.GoogleCampaignTypeDaily
UNION ALL SELECT 'GoogleBreakdownDaily',    COUNT(*) FROM tenniix_mshop.GoogleBreakdownDaily
UNION ALL SELECT 'MetaConnection',          COUNT(*) FROM tenniix_mshop.MetaConnection
UNION ALL SELECT 'AdAccount',               COUNT(*) FROM tenniix_mshop.AdAccount
UNION ALL SELECT 'Campaign',                COUNT(*) FROM tenniix_mshop.Campaign
UNION ALL SELECT 'AdSet',                   COUNT(*) FROM tenniix_mshop.AdSet
UNION ALL SELECT 'Creative',                COUNT(*) FROM tenniix_mshop.Creative
UNION ALL SELECT 'Asset',                   COUNT(*) FROM tenniix_mshop.Asset
UNION ALL SELECT 'Ad',                      COUNT(*) FROM tenniix_mshop.Ad
UNION ALL SELECT 'InsightCache',            COUNT(*) FROM tenniix_mshop.InsightCache;
