USE tenniix_mshop;
SELECT MIN(fetchedAt) AS first_fetched, MAX(fetchedAt) AS last_fetched, COUNT(*) AS rows_n
FROM MetaCampaignDaily WHERE date='2026-05-09';
