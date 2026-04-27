-- CreateTable
CREATE TABLE `ShopifyDailyMetric` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `totalSales` DECIMAL(18, 2) NOT NULL,
    `orders` INTEGER NOT NULL DEFAULT 0,
    `returns` INTEGER NOT NULL DEFAULT 0,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `fetchedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ShopifyDailyMetric_tenantId_date_idx`(`tenantId`, `date`),
    UNIQUE INDEX `ShopifyDailyMetric_tenantId_date_key`(`tenantId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MetaCampaignDaily` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `accountName` VARCHAR(191) NULL,
    `campaignId` VARCHAR(191) NOT NULL,
    `campaignName` VARCHAR(191) NOT NULL,
    `campaignObjective` VARCHAR(191) NULL,
    `impressions` BIGINT NOT NULL DEFAULT 0,
    `clicksAll` BIGINT NOT NULL DEFAULT 0,
    `spend` DECIMAL(18, 4) NOT NULL DEFAULT 0,
    `purchases` INTEGER NOT NULL DEFAULT 0,
    `purchaseConvValue` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `addsToCart` INTEGER NOT NULL DEFAULT 0,
    `initiatedCheckouts` INTEGER NOT NULL DEFAULT 0,
    `cpm` DECIMAL(10, 4) NULL,
    `cpcAll` DECIMAL(10, 4) NULL,
    `ctrAll` DECIMAL(10, 6) NULL,
    `roas` DECIMAL(10, 4) NULL,
    `fetchedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `MetaCampaignDaily_tenantId_date_idx`(`tenantId`, `date`),
    INDEX `MetaCampaignDaily_tenantId_campaignId_idx`(`tenantId`, `campaignId`),
    UNIQUE INDEX `MetaCampaignDaily_tenantId_date_campaignId_key`(`tenantId`, `date`, `campaignId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MetaAdDaily` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NOT NULL,
    `adsetId` VARCHAR(191) NOT NULL,
    `adsetName` VARCHAR(191) NULL,
    `adId` VARCHAR(191) NOT NULL,
    `adName` VARCHAR(191) NOT NULL,
    `adCreativeImageUrl` TEXT NULL,
    `adBody` TEXT NULL,
    `impressions` BIGINT NOT NULL DEFAULT 0,
    `clicksAll` BIGINT NOT NULL DEFAULT 0,
    `spend` DECIMAL(18, 4) NOT NULL DEFAULT 0,
    `websitePurchases` INTEGER NOT NULL DEFAULT 0,
    `purchaseConvValue` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `cpm` DECIMAL(10, 4) NULL,
    `cpcAll` DECIMAL(10, 4) NULL,
    `ctrAll` DECIMAL(10, 6) NULL,
    `roas` DECIMAL(10, 4) NULL,
    `fetchedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `MetaAdDaily_tenantId_date_idx`(`tenantId`, `date`),
    INDEX `MetaAdDaily_tenantId_adId_idx`(`tenantId`, `adId`),
    UNIQUE INDEX `MetaAdDaily_tenantId_date_adId_key`(`tenantId`, `date`, `adId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MetaBreakdownDaily` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `breakdownType` VARCHAR(191) NOT NULL,
    `dim1` VARCHAR(255) NOT NULL,
    `dim2` VARCHAR(128) NOT NULL DEFAULT '',
    `dimMeta` JSON NULL,
    `impressions` BIGINT NOT NULL DEFAULT 0,
    `clicksAll` BIGINT NOT NULL DEFAULT 0,
    `spend` DECIMAL(18, 4) NOT NULL DEFAULT 0,
    `purchases` INTEGER NOT NULL DEFAULT 0,
    `purchaseConvValue` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `roas` DECIMAL(10, 4) NULL,
    `fetchedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `MetaBreakdownDaily_tenantId_breakdownType_date_idx`(`tenantId`, `breakdownType`, `date`),
    UNIQUE INDEX `MetaBreakdownDaily_tenantId_date_breakdownType_dim1_dim2_key`(`tenantId`, `date`, `breakdownType`, `dim1`, `dim2`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GoogleDailyMetric` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `impressions` BIGINT NOT NULL DEFAULT 0,
    `clicks` BIGINT NOT NULL DEFAULT 0,
    `cost` DECIMAL(18, 4) NOT NULL DEFAULT 0,
    `totalConvValue` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `purchases` INTEGER NOT NULL DEFAULT 0,
    `addsToCart` INTEGER NOT NULL DEFAULT 0,
    `beginsCheckout` INTEGER NOT NULL DEFAULT 0,
    `avgCpc` DECIMAL(10, 4) NULL,
    `ctr` DECIMAL(10, 6) NULL,
    `fetchedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `GoogleDailyMetric_tenantId_date_idx`(`tenantId`, `date`),
    UNIQUE INDEX `GoogleDailyMetric_tenantId_date_key`(`tenantId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GoogleCampaignTypeDaily` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `campaignType` VARCHAR(191) NOT NULL,
    `clicks` BIGINT NOT NULL DEFAULT 0,
    `cost` DECIMAL(18, 4) NOT NULL DEFAULT 0,
    `purchases` INTEGER NOT NULL DEFAULT 0,
    `totalConvValue` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `roas` DECIMAL(10, 4) NULL,
    `fetchedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `GoogleCampaignTypeDaily_tenantId_date_idx`(`tenantId`, `date`),
    UNIQUE INDEX `GoogleCampaignTypeDaily_tenantId_date_campaignType_key`(`tenantId`, `date`, `campaignType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GoogleBreakdownDaily` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `breakdownType` VARCHAR(191) NOT NULL,
    `dim1` VARCHAR(255) NOT NULL,
    `dim2` VARCHAR(128) NOT NULL DEFAULT '',
    `dimMeta` JSON NULL,
    `clicks` BIGINT NOT NULL DEFAULT 0,
    `cost` DECIMAL(18, 4) NOT NULL DEFAULT 0,
    `purchases` INTEGER NOT NULL DEFAULT 0,
    `totalConvValue` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `allConvValue` DECIMAL(18, 2) NULL,
    `fetchedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `GoogleBreakdownDaily_tenantId_breakdownType_date_idx`(`tenantId`, `breakdownType`, `date`),
    UNIQUE INDEX `GoogleBreakdownDaily_tenantId_date_breakdownType_dim1_dim2_key`(`tenantId`, `date`, `breakdownType`, `dim1`, `dim2`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ShopifyDailyMetric` ADD CONSTRAINT `ShopifyDailyMetric_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MetaCampaignDaily` ADD CONSTRAINT `MetaCampaignDaily_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MetaAdDaily` ADD CONSTRAINT `MetaAdDaily_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MetaBreakdownDaily` ADD CONSTRAINT `MetaBreakdownDaily_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GoogleDailyMetric` ADD CONSTRAINT `GoogleDailyMetric_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GoogleCampaignTypeDaily` ADD CONSTRAINT `GoogleCampaignTypeDaily_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GoogleBreakdownDaily` ADD CONSTRAINT `GoogleBreakdownDaily_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
