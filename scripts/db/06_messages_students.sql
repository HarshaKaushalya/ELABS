-- Run via: docker exec elabs-mysql mysql -u root -proot elabs < migrate.sql
USE elabs;

-- Add must_change_password to users (only if not exists)
SET @col_exists = (
  SELECT COUNT(1) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA='elabs' AND TABLE_NAME='users' AND COLUMN_NAME='must_change_password'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE users ADD COLUMN must_change_password TINYINT(1) DEFAULT 0',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- student_profiles
CREATE TABLE IF NOT EXISTS student_profiles (
  user_id      BIGINT NOT NULL PRIMARY KEY,
  reg_number   VARCHAR(30) NOT NULL UNIQUE,
  group_code   VARCHAR(20),
  semester     INT DEFAULT 6,
  department   VARCHAR(80) DEFAULT 'Electrical and Information Engineering',
  must_change_password TINYINT(1) DEFAULT 1,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- broadcast_messages
CREATE TABLE IF NOT EXISTS broadcast_messages (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  sender_id    BIGINT NOT NULL,
  subject      VARCHAR(255),
  body         TEXT NOT NULL,
  target_type  ENUM('ALL','GROUP','USER') NOT NULL DEFAULT 'ALL',
  target_group VARCHAR(20) NULL,
  target_user  BIGINT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);

-- message_recipients
CREATE TABLE IF NOT EXISTS message_recipients (
  message_id   BIGINT NOT NULL,
  user_id      BIGINT NOT NULL,
  is_read      TINYINT(1) DEFAULT 0,
  read_at      DATETIME NULL,
  PRIMARY KEY (message_id, user_id),
  FOREIGN KEY (message_id) REFERENCES broadcast_messages(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- notifications
CREATE TABLE IF NOT EXISTS notifications (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id      BIGINT NOT NULL,
  type         ENUM('BORROW_APPROVED','BORROW_OVERDUE','BORROW_RETURNED','LAB_REMINDER','FIRE_ALERT','BROADCAST','SYSTEM') NOT NULL,
  title        VARCHAR(255) NOT NULL,
  body         TEXT,
  is_read      TINYINT(1) DEFAULT 0,
  read_at      DATETIME NULL,
  meta         JSON NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- timetable_slots
CREATE TABLE IF NOT EXISTS timetable_slots (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  session_date DATE NOT NULL,
  time_slot    VARCHAR(30) NOT NULL,
  module_code  VARCHAR(20) NOT NULL,
  lab_label    VARCHAR(20) NOT NULL,
  group_code   VARCHAR(20) NOT NULL,
  academic_year VARCHAR(20) DEFAULT '2025/2026'
);

SELECT 'Migration complete' AS status;
