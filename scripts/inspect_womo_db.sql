SELECT 'womo_mshop GoogleDailyMetric' AS section;
SELECT COUNT(*) AS rows_n, MIN(date) AS first_d, MAX(date) AS last_d
FROM womo_mshop.GoogleDailyMetric;

SELECT 'womo_mshop distinct customers' AS section;
SELECT customerId, customerName, tenantId, COUNT(*) AS rows_n
FROM womo_mshop.GoogleDailyMetric
GROUP BY customerId, customerName, tenantId;

SELECT 'Reverse: tenniix_mshop tenantId distribution' AS section;
SELECT tenantId, COUNT(*) AS rows_n FROM tenniix_mshop.GoogleDailyMetric GROUP BY tenantId;
