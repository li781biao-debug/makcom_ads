-- ===== Meta domain objects =====

CREATE TABLE `MetaConnection` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `makeConnectionRef` VARCHAR(191) NOT NULL,
    `fbUserId` VARCHAR(191) NULL,
    `fbUserName` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `connectedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastUsedAt` DATETIME(3) NULL,

    INDEX `MetaConnection_tenantId_idx`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AdAccount` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `metaConnectionId` VARCHAR(191) NOT NULL,
    `actId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `currency` VARCHAR(191) NULL,
    `timezoneName` VARCHAR(191) NULL,
    `status` INTEGER NULL,
    `syncedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AdAccount_metaConnectionId_idx`(`metaConnectionId`),
    UNIQUE INDEX `AdAccount_tenantId_actId_key`(`tenantId`, `actId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Campaign` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `adAccountId` VARCHAR(191) NOT NULL,
    `metaCampaignId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `objective` VARCHAR(191) NULL,
    `status` VARCHAR(191) NULL,
    `dailyBudget` INTEGER NULL,
    `lifetimeBudget` INTEGER NULL,
    `syncedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Campaign_tenantId_idx`(`tenantId`),
    UNIQUE INDEX `Campaign_adAccountId_metaCampaignId_key`(`adAccountId`, `metaCampaignId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AdSet` (
    `id` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NOT NULL,
    `metaAdSetId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NULL,
    `dailyBudget` INTEGER NULL,
    `billingEvent` VARCHAR(191) NULL,
    `optimizationGoal` VARCHAR(191) NULL,
    `syncedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `AdSet_campaignId_metaAdSetId_key`(`campaignId`, `metaAdSetId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Ad` (
    `id` VARCHAR(191) NOT NULL,
    `adSetId` VARCHAR(191) NOT NULL,
    `metaAdId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NULL,
    `creativeId` VARCHAR(191) NULL,
    `syncedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Ad_adSetId_metaAdId_key`(`adSetId`, `metaAdId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Creative` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `metaCreativeId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `objectStorySpec` JSON NULL,
    `thumbnailUrl` VARCHAR(191) NULL,
    `syncedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Creative_tenantId_metaCreativeId_key`(`tenantId`, `metaCreativeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Asset` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `type` ENUM('IMAGE', 'VIDEO') NOT NULL,
    `metaRef` VARCHAR(191) NOT NULL,
    `filename` VARCHAR(191) NULL,
    `previewUrl` VARCHAR(191) NULL,
    `sizeBytes` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Asset_tenantId_type_idx`(`tenantId`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `InsightCache` (
    `id` VARCHAR(191) NOT NULL,
    `adAccountId` VARCHAR(191) NOT NULL,
    `level` VARCHAR(191) NOT NULL,
    `dateRange` VARCHAR(191) NOT NULL,
    `breakdowns` VARCHAR(191) NULL,
    `data` JSON NOT NULL,
    `fetchedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `InsightCache_fetchedAt_idx`(`fetchedAt`),
    UNIQUE INDEX `InsightCache_adAccountId_level_dateRange_breakdowns_key`(`adAccountId`, `level`, `dateRange`, `breakdowns`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ===== BI fact tables =====

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

-- ===== Foreign keys =====

ALTER TABLE `AdAccount` ADD CONSTRAINT `AdAccount_metaConnectionId_fkey` FOREIGN KEY (`metaConnectionId`) REFERENCES `MetaConnection`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Campaign` ADD CONSTRAINT `Campaign_adAccountId_fkey` FOREIGN KEY (`adAccountId`) REFERENCES `AdAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `AdSet` ADD CONSTRAINT `AdSet_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `Campaign`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Ad` ADD CONSTRAINT `Ad_adSetId_fkey` FOREIGN KEY (`adSetId`) REFERENCES `AdSet`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Ad` ADD CONSTRAINT `Ad_creativeId_fkey` FOREIGN KEY (`creativeId`) REFERENCES `Creative`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `InsightCache` ADD CONSTRAINT `InsightCache_adAccountId_fkey` FOREIGN KEY (`adAccountId`) REFERENCES `AdAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
