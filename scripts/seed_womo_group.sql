-- Seed the WOMO 合计 group + add 5 WOMO tenants as members.
USE makcom_ads;

INSERT INTO ProjectGroup (id, name, slug, createdAt, updatedAt) VALUES
  ('cg_womo_all', 'WOMO 全部门店', 'womo-all', NOW(3), NOW(3));

INSERT INTO ProjectGroupMember (id, groupId, tenantId, createdAt)
SELECT CONCAT('cgm_womo_', t.slug), 'cg_womo_all', t.id, NOW(3)
FROM Tenant t
WHERE t.slug IN ('womo', 'womo-uk', 'womo-de', 'womo-fr', 'womo-es');

SELECT g.slug AS group_slug, g.name AS group_name, COUNT(m.id) AS member_count
FROM ProjectGroup g
LEFT JOIN ProjectGroupMember m ON m.groupId = g.id
GROUP BY g.id;

SELECT t.slug AS tenant_slug, t.name AS tenant_name
FROM ProjectGroupMember m
JOIN Tenant t ON t.id = m.tenantId
WHERE m.groupId = 'cg_womo_all'
ORDER BY t.createdAt;
