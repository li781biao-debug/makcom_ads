-- Wipe all existing users + tenant memberships + access requests,
-- then bootstrap a single SUPER_ADMIN account.
USE makcom_ads;

-- Disable FK checks temporarily so we can drop User rows that have memberships.
SET FOREIGN_KEY_CHECKS = 0;

DELETE FROM ProjectAccessRequest;
DELETE FROM TenantUser;
DELETE FROM User;

SET FOREIGN_KEY_CHECKS = 1;

-- Bootstrap super admin (password = vBrCoKMY876wHmJA, hashed via bcrypt cost 10)
INSERT INTO User (id, email, passwordHash, name, role, createdAt, updatedAt)
VALUES (
  'c4e26ba56e932bd26fba71998',
  'admin@metraxis.me',
  '$2b$10$5VPtAhpJYuqMNtg2xi1wpelc/BJM521JkyfquWy/pSjbpxJjQ3SLG',
  '超级管理员',
  'SUPER_ADMIN',
  NOW(3),
  NOW(3)
);

SELECT id, email, role, name FROM User;
SELECT 'TenantUser rows:' AS info, COUNT(*) AS n FROM TenantUser;
SELECT 'ProjectAccessRequest rows:' AS info, COUNT(*) AS n FROM ProjectAccessRequest;
