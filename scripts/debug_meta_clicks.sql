USE tenniix_mshop;

-- Per-campaign breakdown for 5/9
SELECT '=== Per-campaign clicks vs UI ===' AS section;
SELECT
  campaignId,
  campaignName,
  ROUND(spend, 2)    AS spend,
  clicksAll          AS clicks,
  impressions,
  ROUND(spend/NULLIF(clicksAll,0), 2) AS cpc
FROM MetaCampaignDaily
WHERE date = '2026-05-09'
ORDER BY clicksAll DESC;

-- Check for duplicate (date, campaignId) — should be 0
SELECT '=== Duplicate detection ===' AS section;
SELECT campaignId, COUNT(*) AS rows_n
FROM MetaCampaignDaily
WHERE date = '2026-05-09'
GROUP BY campaignId
HAVING COUNT(*) > 1;

-- Compare to bundle: campaign_id 120233005420610275 should have 788 clicks / 746 spend
SELECT '=== Bundle vs DB for campaign 120233005420610275 ===' AS section;
SELECT campaignId, campaignName, spend, clicksAll AS clicks, impressions, fetchedAt
FROM MetaCampaignDaily
WHERE campaignId = '120233005420610275' AND date = '2026-05-09';
