UPDATE makcom_ads.Tenant SET status = 'archived' WHERE slug = 'metry';
SELECT name, slug, dbName, status FROM makcom_ads.Tenant ORDER BY status, createdAt;
