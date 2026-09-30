USE elabs;

-- AUTH / RBAC

CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id INT NOT NULL,
  permission_id INT NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS users (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  index_no VARCHAR(20) UNIQUE, -- e.g., EG/2022/5401 (nullable for staff)
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  country VARCHAR(80),
  city VARCHAR(80),
  timezone VARCHAR(40) DEFAULT 'Asia/Colombo',
  password_hash VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id BIGINT NOT NULL,
  role_id INT NOT NULL,
  PRIMARY KEY (user_id, role_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- MySQL-safe conditional index creation
SET @idx_refresh_tokens_user_exists := (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'refresh_tokens'
    AND index_name = 'idx_refresh_tokens_user'
);
SET @sql := IF(
  @idx_refresh_tokens_user_exists = 0,
  'CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_refresh_tokens_expires_exists := (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'refresh_tokens'
    AND index_name = 'idx_refresh_tokens_expires'
);
SET @sql := IF(
  @idx_refresh_tokens_expires_exists = 0,
  'CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- AUDIT (minimal v1)
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  actor_user_id BIGINT NULL,
  action VARCHAR(80) NOT NULL,
  entity VARCHAR(80) NULL,
  entity_id VARCHAR(80) NULL,
  meta JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- INVENTORY

CREATE TABLE IF NOT EXISTS labs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  location VARCHAR(120),
  floor VARCHAR(40),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory_items (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  lab_id INT NOT NULL,
  elabs_tag VARCHAR(40) NOT NULL UNIQUE,   -- your own code (barcode value)
  name VARCHAR(140) NOT NULL,
  category VARCHAR(80),
  model VARCHAR(80),
  serial_no VARCHAR(80),
  condition_note VARCHAR(255),
  status ENUM('AVAILABLE','BORROWED','MAINTENANCE','OUT_OF_SERVICE') NOT NULL DEFAULT 'AVAILABLE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES labs(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS maintenance_records (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  item_id BIGINT NOT NULL,
  type ENUM('CALIBRATION','REPAIR','INSPECTION') NOT NULL,
  status ENUM('OPEN','DONE') NOT NULL DEFAULT 'OPEN',
  due_date DATE NULL,
  notes VARCHAR(500) NULL,
  created_by BIGINT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (item_id) REFERENCES inventory_items(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- BORROWING

CREATE TABLE IF NOT EXISTS borrow_transactions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  lab_id INT NOT NULL,
  borrower_type ENUM('STUDENT','GROUP') NOT NULL,
  borrower_user_id BIGINT NULL,
  borrower_group_code VARCHAR(40) NULL, -- keep group simple v1 (later link to groups table)
  issued_by_user_id BIGINT NOT NULL,    -- technician/instructor/admin
  purpose VARCHAR(200) NULL,
  due_at DATETIME NULL,
  returned_at DATETIME NULL,
  status ENUM('BORROWED','RETURNED','OVERDUE') NOT NULL DEFAULT 'BORROWED',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES labs(id) ON DELETE RESTRICT,
  FOREIGN KEY (borrower_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (issued_by_user_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS borrow_transaction_items (
  transaction_id BIGINT NOT NULL,
  item_id BIGINT NOT NULL,
  condition_out VARCHAR(255) NULL,
  condition_in VARCHAR(255) NULL,
  PRIMARY KEY (transaction_id, item_id),
  FOREIGN KEY (transaction_id) REFERENCES borrow_transactions(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES inventory_items(id) ON DELETE RESTRICT
);

-- BARCODE EVENTS (audit stream)
CREATE TABLE IF NOT EXISTS barcode_events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  event_type ENUM('BORROW_SCAN','RETURN_SCAN','ITEM_REGISTER') NOT NULL,
  lab_id INT NOT NULL,
  item_id BIGINT NULL,
  elabs_tag VARCHAR(40) NOT NULL,
  actor_user_id BIGINT NULL,
  meta JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES labs(id) ON DELETE RESTRICT,
  FOREIGN KEY (item_id) REFERENCES inventory_items(id) ON DELETE SET NULL,
  FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ACADEMIC STRUCTURE

CREATE TABLE IF NOT EXISTS semesters (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  level INT NOT NULL
);

CREATE TABLE IF NOT EXISTS modules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  semester_id INT NOT NULL,
  FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE RESTRICT
);

-- Link labs to modules
-- Link labs to modules
CREATE TABLE IF NOT EXISTS module_labs (
  module_id INT NOT NULL,
  lab_id INT NOT NULL,
  PRIMARY KEY (module_id, lab_id),
  FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,
  FOREIGN KEY (lab_id) REFERENCES labs(id) ON DELETE CASCADE
);

-- Student Module Enrollments
CREATE TABLE IF NOT EXISTS module_enrollments (
  module_id INT NOT NULL,
  student_id BIGINT NOT NULL,
  enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (module_id, student_id),
  FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

-- SUBMISSIONS

CREATE TABLE IF NOT EXISTS submissions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  type ENUM('PRELAB','REPORT','QUIZ') NOT NULL,
  lab_id INT NOT NULL,
  student_id BIGINT NOT NULL,
  file_url VARCHAR(255),
  marks DECIMAL(5,2),
  graded_by_id BIGINT,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES labs(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (graded_by_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ATTENDANCE (COMPUTER VISION)

CREATE TABLE IF NOT EXISTS attendance_records (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  lab_id INT NOT NULL,
  student_id BIGINT NOT NULL,
  entry_time DATETIME NOT NULL,
  exit_time DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES labs(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);
