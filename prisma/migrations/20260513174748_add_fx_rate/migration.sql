-- Static FX rates used at insert time to normalise inbound money fields to USD.

CREATE TABLE `FxRate` (
  `currency`  VARCHAR(8)      NOT NULL,
  `rateToUsd` DECIMAL(20, 10) NOT NULL DEFAULT '1.0',
  `updatedAt` DATETIME(3)     NOT NULL,
  PRIMARY KEY (`currency`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `FxRate` (`currency`, `rateToUsd`, `updatedAt`) VALUES
  ('USD', 1.0000000000, NOW(3)),
  ('GBP', 1.2700000000, NOW(3)),
  ('EUR', 1.0800000000, NOW(3)),
  ('CNY', 0.1400000000, NOW(3));
