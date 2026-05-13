-- Add 5 new shops as Tenants in base DB, grant access to 3 active users.
-- (Run AFTER creating the 5 MySQL databases that match dbName.)
USE makcom_ads;

INSERT INTO Tenant (id, name, slug, dbName, status, createdAt, updatedAt) VALUES
('cb22f0c3ab846d88b351c5c9e', 'WOMO Lighting Fixtures Online', 'womo',    'womo_mshop',    'active', NOW(3), NOW(3)),
('c0eca1a414a7bac3035e7f049', 'WOMO UK',                       'womo-uk', 'womo_uk_mshop', 'active', NOW(3), NOW(3)),
('c8e2c16baf6dcd8fc52257702', 'WOMO DE',                       'womo-de', 'womo_de_mshop', 'active', NOW(3), NOW(3)),
('c01db8cc4b3e22daa2145911f', 'WOMO FR',                       'womo-fr', 'womo_fr_mshop', 'active', NOW(3), NOW(3)),
('c0c293f75a079208efa3cc56a', 'WOMO ES',                       'womo-es', 'womo_es_mshop', 'active', NOW(3), NOW(3));

-- Grant OWNER access to 3 active users for each new tenant.
-- Existing users: admin-3zbffdbh@tenniix.local, li781biao@gmail.com, yangzhenmax@gmail.com
INSERT INTO TenantUser (id, tenantId, userId, role, createdAt) VALUES
-- womo
('cfdcc71177fb958acf47a7d27', 'cb22f0c3ab846d88b351c5c9e', 'c63b346bca1497d42723fa1c3', 'OWNER', NOW(3)),
('c651c7fb272292d25458d1ec3', 'cb22f0c3ab846d88b351c5c9e', 'cmogsd46r0000mw01m6pp91bl', 'OWNER', NOW(3)),
('cd4977a2dac3c9de0dd0340df', 'cb22f0c3ab846d88b351c5c9e', 'cmp0m0fnj0000lc0189n8sfcs', 'OWNER', NOW(3)),
-- womo-uk
('cd748312414fe226d533d6c5c', 'c0eca1a414a7bac3035e7f049', 'c63b346bca1497d42723fa1c3', 'OWNER', NOW(3)),
('cd6fab869e071366655fc3725', 'c0eca1a414a7bac3035e7f049', 'cmogsd46r0000mw01m6pp91bl', 'OWNER', NOW(3)),
('c5c175c0ba4bd2d827c5a4b10', 'c0eca1a414a7bac3035e7f049', 'cmp0m0fnj0000lc0189n8sfcs', 'OWNER', NOW(3)),
-- womo-de
('c3e1610c9c1783d6601bfc4bc', 'c8e2c16baf6dcd8fc52257702', 'c63b346bca1497d42723fa1c3', 'OWNER', NOW(3)),
('c32fd81d3355aec75638e9fd1', 'c8e2c16baf6dcd8fc52257702', 'cmogsd46r0000mw01m6pp91bl', 'OWNER', NOW(3)),
('ccd97c2c892cbc5b405aaa302', 'c8e2c16baf6dcd8fc52257702', 'cmp0m0fnj0000lc0189n8sfcs', 'OWNER', NOW(3)),
-- womo-fr
('c28a0b95c864a5fa3bb4d6932', 'c01db8cc4b3e22daa2145911f', 'c63b346bca1497d42723fa1c3', 'OWNER', NOW(3)),
('c399ff57ee8ae30ec3af837b3', 'c01db8cc4b3e22daa2145911f', 'cmogsd46r0000mw01m6pp91bl', 'OWNER', NOW(3)),
('c2b2e6611e06b2909c63f126d', 'c01db8cc4b3e22daa2145911f', 'cmp0m0fnj0000lc0189n8sfcs', 'OWNER', NOW(3)),
-- womo-es
('c707f60020bc768e21315275e', 'c0c293f75a079208efa3cc56a', 'c63b346bca1497d42723fa1c3', 'OWNER', NOW(3)),
('ca129495a62be3b827ab9f7bb', 'c0c293f75a079208efa3cc56a', 'cmogsd46r0000mw01m6pp91bl', 'OWNER', NOW(3)),
('ce38a16e870f79ad222ea8c08', 'c0c293f75a079208efa3cc56a', 'cmp0m0fnj0000lc0189n8sfcs', 'OWNER', NOW(3));

-- Show result
SELECT t.slug, t.name, t.dbName, COUNT(tu.id) AS member_count
FROM Tenant t
LEFT JOIN TenantUser tu ON tu.tenantId = t.id
GROUP BY t.id
ORDER BY t.createdAt;
