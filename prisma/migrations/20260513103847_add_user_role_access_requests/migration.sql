-- Add role to User + new ProjectAccessRequest table for the access-request flow.

ALTER TABLE `User`
  ADD COLUMN `role` VARCHAR(32) NOT NULL DEFAULT 'USER';

CREATE TABLE `ProjectAccessRequest` (
  `id`          VARCHAR(191) NOT NULL,
  `userId`      VARCHAR(191) NOT NULL,
  `tenantId`    VARCHAR(191) NOT NULL,
  `status`      VARCHAR(32)  NOT NULL DEFAULT 'pending',
  `message`     TEXT NULL,
  `reviewNote`  TEXT NULL,
  `requestedAt` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `reviewedAt`  DATETIME(3)  NULL,
  `reviewerId`  VARCHAR(191) NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `par_user_tenant` (`userId`, `tenantId`),
  INDEX `par_status_at` (`status`, `requestedAt`),
  INDEX `par_tenant_status` (`tenantId`, `status`),
  INDEX `par_reviewer` (`reviewerId`),
  CONSTRAINT `par_user_fk`     FOREIGN KEY (`userId`)     REFERENCES `User`(`id`)   ON DELETE CASCADE,
  CONSTRAINT `par_tenant_fk`   FOREIGN KEY (`tenantId`)   REFERENCES `Tenant`(`id`) ON DELETE CASCADE,
  CONSTRAINT `par_reviewer_fk` FOREIGN KEY (`reviewerId`) REFERENCES `User`(`id`)   ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
