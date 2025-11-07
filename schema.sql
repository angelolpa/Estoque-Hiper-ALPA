-- Arquivo: schema.sql
-- Descrição: Define a estrutura completa do banco de dados para a aplicação StockFlow.

-- Certifique-se de ter um banco de dados criado antes de executar este script.
-- Ex: CREATE DATABASE contagemEletro;
--     USE contagemEletro;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

--
-- Tabela: products
-- Armazena os produtos principais.
--
DROP TABLE IF EXISTS `products`;
CREATE TABLE `products` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `system_id` varchar(100) NOT NULL,
  `sql_server_id` varchar(100) DEFAULT NULL,
  `image_id` varchar(100) DEFAULT NULL,
  `image_url` varchar(2048) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `system_id` (`system_id`),
  KEY `sql_server_id` (`sql_server_id`),
  KEY `image_id` (`image_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Tabela: barcodes
-- Armazena todos os códigos de barras associados a um produto.
--
DROP TABLE IF EXISTS `barcodes`;
CREATE TABLE `barcodes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `product_id` int NOT NULL,
  `barcode` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `barcode` (`barcode`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `barcodes_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


--
-- Tabela: scans
-- Registra cada leitura de código de barras (entrada ou saída).
--
DROP TABLE IF EXISTS `scans`;
CREATE TABLE `scans` (
  `id` int NOT NULL AUTO_INCREMENT,
  `barcode` varchar(255) NOT NULL,
  `type` enum('entry','exit') NOT NULL,
  `scanned_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `barcode` (`barcode`),
  CONSTRAINT `scans_ibfk_1` FOREIGN KEY (`barcode`) REFERENCES `barcodes` (`barcode`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SET FOREIGN_KEY_CHECKS = 1;

