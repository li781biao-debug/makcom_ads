-- One-shot: fix rows where cost was stored as raw cost_micros instead of dollars.
-- Heuristic: any cost > 1,000,000 for a daily aggregate is implausibly large in
-- USD (would be $1M+/day for the row) and is almost certainly micros. Divide by 1e6.
USE tenniix_mshop;

SELECT 'BEFORE -- GoogleDailyMetric rows with cost > 1e6' AS section;
SELECT date, cost FROM GoogleDailyMetric WHERE cost > 1000000 ORDER BY date;

UPDATE GoogleDailyMetric        SET cost = cost / 1000000 WHERE cost > 1000000;
UPDATE GoogleCampaignTypeDaily  SET cost = cost / 1000000 WHERE cost > 1000000;
UPDATE GoogleBreakdownDaily     SET cost = cost / 1000000 WHERE cost > 1000000;

SELECT 'AFTER -- GoogleDailyMetric all rows' AS section;
SELECT date, cost FROM GoogleDailyMetric ORDER BY date DESC;

SELECT 'AFTER -- GoogleCampaignTypeDaily summary' AS section;
SELECT date, MIN(cost) AS min_c, MAX(cost) AS max_c FROM GoogleCampaignTypeDaily GROUP BY date ORDER BY date DESC;
