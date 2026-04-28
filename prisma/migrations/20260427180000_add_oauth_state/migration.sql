-- CreateTable
CREATE TABLE `OAuthState` (
    `state` VARCHAR(96) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `purpose` VARCHAR(191) NOT NULL DEFAULT 'meta_connect',
    `used` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NOT NULL,

    INDEX `OAuthState_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`state`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
