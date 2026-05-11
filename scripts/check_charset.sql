USE tenniix_mshop;
SELECT TABLE_NAME, TABLE_COLLATION
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'tenniix_mshop'
  AND TABLE_NAME IN ('MetaBreakdownDaily', 'GoogleBreakdownDaily');
SHOW VARIABLES LIKE 'innodb_large_prefix';
SHOW VARIABLES LIKE 'innodb_file_format';
SHOW VARIABLES LIKE 'innodb_default_row_format';
