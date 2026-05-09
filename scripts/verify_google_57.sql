SELECT date, impressions, clicks, ROUND(cost,2) AS cost,
       ROUND(totalConvValue,2) AS conv_value,
       purchases, addsToCart, beginsCheckout,
       fetchedAt
FROM tenniix_mshop.GoogleDailyMetric
WHERE date >= '2026-05-05'
ORDER BY date DESC;
