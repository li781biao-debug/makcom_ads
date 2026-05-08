-- Add slug/dbName/status to Tenant for multi-project routing
ALTER TABLE `Tenant`
  ADD COLUMN `slug` VARCHAR(191) NULL,
  ADD COLUMN `dbName` VARCHAR(191) NULL,
  ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'active';

-- Backfill existing tenants
UPDATE `Tenant` SET `slug` = 'tenniix', `dbName` = 'tenniix_mshop', `status` = 'active' WHERE `id` = 'cmogsd46v0001mw016lgb3dzz';
UPDATE `Tenant` SET `slug` = 'insights-test', `dbName` = 'insights_test_mshop', `status` = 'archived' WHERE `id` = 'cmogw63l60005l001w2q1ej8l';

-- Now require + unique
ALTER TABLE `Tenant`
  MODIFY COLUMN `slug` VARCHAR(191) NOT NULL,
  MODIFY COLUMN `dbName` VARCHAR(191) NOT NULL;

CREATE UNIQUE INDEX `Tenant_slug_key` ON `Tenant`(`slug`);
CREATE UNIQUE INDEX `Tenant_dbName_key` ON `Tenant`(`dbName`);
