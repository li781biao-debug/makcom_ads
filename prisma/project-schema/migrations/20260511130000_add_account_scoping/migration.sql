-- Multi-account scoping: add accountId/customerId columns and rebuild unique constraints.
-- The user opted to clear all existing BI data; we TRUNCATE before altering, then
-- the next Make sync will re-populate with account-aware rows.

-- 1. Drop existing data (TRUNCATE is faster than DELETE for full clears).
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE `ShopifyDailyMetric`;
TRUNCATE TABLE `MetaCampaignDaily`;
TRUNCATE TABLE `MetaAdDaily`;
TRUNCATE TABLE `MetaBreakdownDaily`;
TRUNCATE TABLE `GoogleDailyMetric`;
TRUNCATE TABLE `GoogleCampaignTypeDaily`;
TRUNCATE TABLE `GoogleBreakdownDaily`;
SET FOREIGN_KEY_CHECKS = 1;

-- 2. MetaBreakdownDaily — add accountId/accountName, replace unique constraint.
ALTER TABLE `MetaBreakdownDaily`
  ADD COLUMN `accountId`   VARCHAR(191) NOT NULL AFTER `date`,
  ADD COLUMN `accountName` VARCHAR(191) NULL     AFTER `accountId`;

ALTER TABLE `MetaBreakdownDaily`
  DROP INDEX `MetaBreakdownDaily_tenantId_date_breakdownType_dim1_dim2_key`,
  ADD UNIQUE INDEX `MetaBreakdownDaily_tenantId_accountId_date_breakdownType_dim1_dim2_key`
    (`tenantId`, `accountId`, `date`, `breakdownType`, `dim1`, `dim2`),
  ADD INDEX `MetaBreakdownDaily_tenantId_accountId_idx` (`tenantId`, `accountId`);

-- 3. GoogleDailyMetric — add customerId/customerName, replace unique constraint.
ALTER TABLE `GoogleDailyMetric`
  ADD COLUMN `customerId`   VARCHAR(191) NOT NULL AFTER `date`,
  ADD COLUMN `customerName` VARCHAR(191) NULL     AFTER `customerId`;

ALTER TABLE `GoogleDailyMetric`
  DROP INDEX `GoogleDailyMetric_tenantId_date_key`,
  ADD UNIQUE INDEX `GoogleDailyMetric_tenantId_customerId_date_key`
    (`tenantId`, `customerId`, `date`),
  ADD INDEX `GoogleDailyMetric_tenantId_customerId_idx` (`tenantId`, `customerId`);

-- 4. GoogleCampaignTypeDaily
ALTER TABLE `GoogleCampaignTypeDaily`
  ADD COLUMN `customerId`   VARCHAR(191) NOT NULL AFTER `date`,
  ADD COLUMN `customerName` VARCHAR(191) NULL     AFTER `customerId`;

ALTER TABLE `GoogleCampaignTypeDaily`
  DROP INDEX `GoogleCampaignTypeDaily_tenantId_date_campaignType_key`,
  ADD UNIQUE INDEX `GoogleCampaignTypeDaily_tenantId_customerId_date_campaignType_key`
    (`tenantId`, `customerId`, `date`, `campaignType`),
  ADD INDEX `GoogleCampaignTypeDaily_tenantId_customerId_idx` (`tenantId`, `customerId`);

-- 5. GoogleBreakdownDaily
ALTER TABLE `GoogleBreakdownDaily`
  ADD COLUMN `customerId`   VARCHAR(191) NOT NULL AFTER `date`,
  ADD COLUMN `customerName` VARCHAR(191) NULL     AFTER `customerId`;

ALTER TABLE `GoogleBreakdownDaily`
  DROP INDEX `GoogleBreakdownDaily_tenantId_date_breakdownType_dim1_dim2_key`,
  ADD UNIQUE INDEX `GoogleBreakdownDaily_tenantId_customerId_date_breakdownType_dim1_dim2_key`
    (`tenantId`, `customerId`, `date`, `breakdownType`, `dim1`, `dim2`),
  ADD INDEX `GoogleBreakdownDaily_tenantId_customerId_idx` (`tenantId`, `customerId`);
