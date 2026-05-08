-- Switch root@'%' to mysql_native_password so older GUI clients can connect.
-- Keep the same password.
ALTER USER 'root'@'%'         IDENTIFIED WITH mysql_native_password BY '4079f473a4b2f7a8f07673c19d49fd57';
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '4079f473a4b2f7a8f07673c19d49fd57';
FLUSH PRIVILEGES;
SELECT user, host, plugin FROM mysql.user WHERE user = 'root';
