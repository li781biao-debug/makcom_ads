-- Create a dashboard login + grant access to the tenniix tenant.
USE makcom_ads;

INSERT INTO User (id, email, passwordHash, name, createdAt, updatedAt)
VALUES (
  'c63b346bca1497d42723fa1c3',
  'admin-3zbffdbh@tenniix.local',
  '$2b$10$tZNQDCOu/0K1hAQUeugRCudVfJaqlfeecDyz5pdhW2.zOW13jeBpW',
  'Tenniix Admin',
  NOW(3), NOW(3)
)
ON DUPLICATE KEY UPDATE
  passwordHash = VALUES(passwordHash),
  name = VALUES(name),
  updatedAt = NOW(3);

INSERT INTO TenantUser (id, tenantId, userId, role, createdAt)
VALUES (
  'c21ef690abd402002ed936bff',
  'cmogsd46v0001mw016lgb3dzz',
  'c63b346bca1497d42723fa1c3',
  'OWNER',
  NOW(3)
)
ON DUPLICATE KEY UPDATE role = VALUES(role);

SELECT u.id, u.email, u.name, t.slug AS tenant, tu.role
FROM User u
JOIN TenantUser tu ON tu.userId = u.id
JOIN Tenant t ON t.id = tu.tenantId
WHERE u.email = 'admin-3zbffdbh@tenniix.local';
