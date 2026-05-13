-- Project groups: aggregate views across multiple project tenants.

CREATE TABLE `ProjectGroup` (
  `id`        VARCHAR(191) NOT NULL,
  `name`      VARCHAR(191) NOT NULL,
  `slug`      VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `ProjectGroup_slug_key` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ProjectGroupMember` (
  `id`        VARCHAR(191) NOT NULL,
  `groupId`   VARCHAR(191) NOT NULL,
  `tenantId`  VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `pgm_group_tenant` (`groupId`, `tenantId`),
  INDEX       `pgm_tenant` (`tenantId`),
  CONSTRAINT `pgm_group_fk`  FOREIGN KEY (`groupId`)  REFERENCES `ProjectGroup`(`id`) ON DELETE CASCADE,
  CONSTRAINT `pgm_tenant_fk` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`)       ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
