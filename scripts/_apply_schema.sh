#!/bin/bash
# Dump tenniix_mshop schema (no data), then apply to all 5 WOMO databases.
set -e
PW='4079f473a4b2f7a8f07673c19d49fd57'

echo '=== dumping tenniix_mshop schema ==='
docker compose -f /opt/makcom_ads/docker-compose.yml exec -T \
  -e MYSQL_PWD="$PW" mysql sh -c \
  "mysqldump --no-data --skip-add-drop-table --skip-comments tenniix_mshop > /tmp/project_schema.sql && wc -l /tmp/project_schema.sql"

echo '=== applying schema to each new DB ==='
for DB in womo_mshop womo_uk_mshop womo_de_mshop womo_fr_mshop womo_es_mshop; do
  echo "  -- $DB --"
  docker compose -f /opt/makcom_ads/docker-compose.yml exec -T \
    -e MYSQL_PWD="$PW" mysql sh -c "mysql -uroot $DB < /tmp/project_schema.sql"
done

echo '=== verify ==='
docker compose -f /opt/makcom_ads/docker-compose.yml exec -T \
  -e MYSQL_PWD="$PW" mysql sh -c \
  "mysql -uroot -B -e \"SELECT table_schema, COUNT(*) AS tables FROM information_schema.tables WHERE table_schema LIKE 'womo%' GROUP BY table_schema;\""
