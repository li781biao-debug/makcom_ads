-- Delete the 5/8 rows that were misrouted from 5/9 due to the TZ bug.
-- Easy heuristic: 5/8 rows fetched on 5/11 or later are the contaminated ones.
USE tenniix_mshop;

SELECT 'BEFORE' AS phase, date, COUNT(*) AS rows_n, ROUND(SUM(spend),2) AS spend, MAX(fetchedAt) AS last_fetched
FROM MetaCampaignDaily WHERE date = '2026-05-08' GROUP BY date;

DELETE FROM MetaCampaignDaily   WHERE date = '2026-05-08' AND fetchedAt > '2026-05-11';
DELETE FROM MetaAdDaily         WHERE date = '2026-05-08' AND fetchedAt > '2026-05-11';
DELETE FROM MetaBreakdownDaily  WHERE date = '2026-05-08' AND fetchedAt > '2026-05-11';

SELECT 'AFTER' AS phase, date, COUNT(*) AS rows_n
FROM MetaCampaignDaily WHERE date = '2026-05-08' GROUP BY date;
