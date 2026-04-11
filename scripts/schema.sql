-- ============================================================
-- MacDaly.com — MySQL Schema Migration
-- Phase 1: Admin Dashboard PHP/MySQL Backend
--
-- Run this in GoDaddy cPanel > phpMyAdmin
-- against your newly provisioned database.
-- ============================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;

-- ------------------------------------------------------------
-- Table: admins
-- Stores admin user accounts. Passwords use PHP bcrypt hashing.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `admins` (
    `id`              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `username`        VARCHAR(50)  NOT NULL UNIQUE,
    `password_hash`   VARCHAR(255) NOT NULL,
    `failed_attempts` TINYINT UNSIGNED NOT NULL DEFAULT 0,
    `locked_until`    DATETIME NULL DEFAULT NULL,
    `last_login_at`   DATETIME NULL DEFAULT NULL,
    `created_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table: messages
-- Contact form submissions from the public-facing site.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `messages` (
    `id`            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `sender_name`   VARCHAR(100) NOT NULL,
    `sender_email`  VARCHAR(150) NOT NULL,
    `body`          TEXT NOT NULL,
    `status`        ENUM('unread','read','archived','deleted') NOT NULL DEFAULT 'unread',
    `ip_address`    VARCHAR(45) NULL DEFAULT NULL,
    `user_agent`    VARCHAR(255) NULL DEFAULT NULL,
    `created_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_status`     (`status`),
    INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table: error_logs
-- Application-level error events logged by PHP API scripts.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `error_logs` (
    `id`          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `level`       ENUM('debug','info','warning','error','critical') NOT NULL DEFAULT 'error',
    `message`     TEXT NOT NULL,
    `context`     JSON NULL DEFAULT NULL,
    `source`      VARCHAR(100) NULL DEFAULT NULL,
    `timestamp`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_level`     (`level`),
    INDEX `idx_timestamp` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table: sessions
-- PHP session data for admin authentication persistence.
-- (Optional — only needed if you switch from file-based sessions)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sessions` (
    `session_id`    VARCHAR(128) NOT NULL PRIMARY KEY,
    `admin_id`      INT UNSIGNED NOT NULL,
    `expires_at`    DATETIME NOT NULL,
    `created_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`admin_id`) REFERENCES `admins`(`id`) ON DELETE CASCADE,
    INDEX `idx_expires_at` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET foreign_key_checks = 1;
