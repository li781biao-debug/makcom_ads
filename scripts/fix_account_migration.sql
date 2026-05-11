-- Resume the account-scoping migration: shrink overly-long VARCHARs on the
-- breakdown tables so the new composite unique key fits within InnoDB's
-- 3072-byte key limit, then create the indexes + add Google columns.
USE tenniix_mshop;

-- 1. MetaBreakdownDaily — shrink string columns, then build unique key.
ALTER TABLE `MetaBreakdownDaily`
  MODIFY COLUMN `tenantId`      VARCHAR(64) NOT NULL,
  MODIFY COLUMN `accountId`     VARCHAR(64) NOT NULL,
  MODIFY COLUMN `breakdownType` VARCHAR(64) NOT NULL;

ALTER TABLE `MetaBreakdownDaily`
  ADD UNIQUE INDEX `MetaBreakdownDaily_uniq` (`tenantId`, `accountId`, `date`, `breakdownType`, `dim1`, `dim2`),
  ADD INDEX `MetaBreakdownDaily_tenant_acct` (`tenantId`, `accountId`);

-- 2. GoogleDailyMetric — add customerId/customerName + new unique.
ALTER TABLE `GoogleDailyMetric`
  ADD COLUMN `customerId`   VARCHAR(64) NOT NULL AFTER `date`,
  ADD COLUMN `customerName` VARCHAR(191) NULL    AFTER `customerId`,
  MODIFY COLUMN `tenantId`  VARCHAR(64) NOT NULL;
ALTER TABLE `GoogleDailyMetric`
  DROP INDEX `GoogleDailyMetric_tenantId_date_key`,
  ADD UNIQUE INDEX `GoogleDailyMetric_uniq` (`tenantId`, `customerId`, `date`),
  ADD INDEX `GoogleDailyMetric_tenant_cust` (`tenantId`, `customerId`);

-- 3. GoogleCampaignTypeDaily
ALTER TABLE `GoogleCampaignTypeDaily`
  ADD COLUMN `customerId`   VARCHAR(64) NOT NULL AFTER `date`,
  ADD COLUMN `customerName` VARCHAR(191) NULL    AFTER `customerId`,
  MODIFY COLUMN `tenantId`     VARCHAR(64) NOT NULL,
  MODIFY COLUMN `campaignType` VARCHAR(64) NOT NULL;
ALTER TABLE `GoogleCampaignTypeDaily`
  DROP INDEX `GoogleCampaignTypeDaily_tenantId_date_campaignType_key`,
  ADD UNIQUE INDEX `GoogleCampaignTypeDaily_uniq` (`tenantId`, `customerId`, `date`, `campaignType`),
  ADD INDEX `GoogleCampaignTypeDaily_tenant_cust` (`tenantId`, `customerId`);

-- 4. GoogleBreakdownDaily
ALTER TABLE `GoogleBreakdownDaily`
  ADD COLUMN `customerId`   VARCHAR(64) NOT NULL AFTER `date`,
  ADD COLUMN `customerName` VARCHAR(191) NULL    AFTER `customerId`,
  MODIFY COLUMN `tenantId`      VARCHAR(64) NOT NULL,
  MODIFY COLUMN `breakdownType` VARCHAR(64) NOT NULL;
ALTER TABLE `GoogleBreakdownDaily`
  DROP INDEX `GoogleBreakdownDaily_tenantId_date_breakdownType_dim1_dim2_key`,
  ADD UNIQUE INDEX `GoogleBreakdownDaily_uniq` (`tenantId`, `customerId`, `date`, `breakdownType`, `dim1`, `dim2`),
  ADD INDEX `GoogleBreakdownDaily_tenant_cust` (`tenantId`, `customerId`);
