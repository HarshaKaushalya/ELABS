USE elabs;

-- ============================================================
-- SEMESTER GROUP MEMBERSHIP
-- Which semester group a student belongs to
-- (semesters table already exists: 1st–8th Sem + R&D)
-- ============================================================

CREATE TABLE IF NOT EXISTS user_semester_groups (
  user_id   BIGINT NOT NULL,
  semester_id INT NOT NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, semester_id),
  FOREIGN KEY (user_id)    REFERENCES users(id)     ON DELETE CASCADE,
  FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE
);

-- ============================================================
-- LAB SESSIONS
-- Specific lab sessions within a module (Lab 1, Lab 2, …)
-- ============================================================

CREATE TABLE IF NOT EXISTS lab_sessions (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  module_id     INT          NOT NULL,
  title         VARCHAR(200) NOT NULL,
  description   TEXT         NULL,
  scheduled_date DATE        NULL,
  duration_hours DECIMAL(4,1) DEFAULT 3.0,
  status        ENUM('UPCOMING','ONGOING','COMPLETED') NOT NULL DEFAULT 'UPCOMING',
  document_url  VARCHAR(500) NULL,
  created_by    BIGINT       NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (module_id)  REFERENCES modules(id)  ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)    ON DELETE SET NULL
);

-- ============================================================
-- LAB SESSION COMPLETIONS
-- Tracks whether a student has attended + submitted report
-- "Done" = attended AND report_submitted
-- ============================================================

CREATE TABLE IF NOT EXISTS lab_session_completions (
  session_id        INT    NOT NULL,
  student_id        BIGINT NOT NULL,
  attended          BOOLEAN DEFAULT FALSE,
  report_submitted  BOOLEAN DEFAULT FALSE,
  completed_at      TIMESTAMP NULL,
  PRIMARY KEY (session_id, student_id),
  FOREIGN KEY (session_id) REFERENCES lab_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id)        ON DELETE CASCADE
);

-- ============================================================
-- BORROW TRANSACTIONS — add optional lab_session link
-- ============================================================

SET @col_exists := (
  SELECT COUNT(1)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name   = 'borrow_transactions'
    AND column_name  = 'lab_session_id'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE borrow_transactions ADD COLUMN lab_session_id INT NULL AFTER purpose',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
