USE tenniix_mshop;

SELECT 'Top 7 ads on 5/9 (by spend)' AS section;
SELECT
  adName,
  adId,
  LEFT(IFNULL(adCreativeImageUrl, '<NULL>'), 60) AS img_url,
  ROUND(spend,2) AS spend,
  websitePurchases AS purchases,
  fetchedAt
FROM MetaAdDaily
WHERE date='2026-05-09'
ORDER BY spend DESC
LIMIT 7;

SELECT 'How many ads have image URL?' AS section;
SELECT
  COUNT(*) AS total_ads,
  SUM(CASE WHEN adCreativeImageUrl IS NULL THEN 1 ELSE 0 END) AS img_null,
  SUM(CASE WHEN adCreativeImageUrl = '' THEN 1 ELSE 0 END) AS img_empty,
  SUM(CASE WHEN adCreativeImageUrl LIKE 'http%' THEN 1 ELSE 0 END) AS img_http
FROM MetaAdDaily
WHERE date='2026-05-09';

SELECT 'Date coverage in DB (to explain missing deltas)' AS section;
SELECT date, COUNT(*) AS rows_n
FROM MetaAdDaily
GROUP BY date
ORDER BY date DESC;
