USE elabs;

-- Semester 6
INSERT IGNORE INTO semesters (id, name, level) VALUES (6, 'Semester 6', 6);

-- Modules
INSERT IGNORE INTO modules (code, name, semester_id) VALUES ('EE6207', 'Digital Signal processing', 6);
INSERT IGNORE INTO modules (code, name, semester_id) VALUES ('EE6301', 'Computer Network', 6);
INSERT IGNORE INTO modules (code, name, semester_id) VALUES ('EE6302', 'Control System Design', 6);
INSERT IGNORE INTO modules (code, name, semester_id) VALUES ('EE6309', 'Renewable Energy System (TE)', 6);
INSERT IGNORE INTO modules (code, name, semester_id) VALUES ('EE6210', 'Wireless and Mobile Communications (TE)', 6);

-- Student profiles table
CREATE TABLE IF NOT EXISTS student_profiles (
  user_id      BIGINT NOT NULL PRIMARY KEY,
  reg_number   VARCHAR(30) NOT NULL UNIQUE,
  group_code   VARCHAR(20),
  semester     INT DEFAULT 6,
  department   VARCHAR(80) DEFAULT 'Electrical and Information Engineering',
  must_change_password TINYINT(1) DEFAULT 1,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Add must_change_password column to users if missing
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password TINYINT(1) DEFAULT 0;

-- Timetable slots table
CREATE TABLE IF NOT EXISTS timetable_slots (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  session_date DATE NOT NULL,
  time_slot    VARCHAR(30) NOT NULL,
  module_code  VARCHAR(20) NOT NULL,
  lab_label    VARCHAR(20) NOT NULL,
  group_code   VARCHAR(20) NOT NULL,
  academic_year VARCHAR(20) DEFAULT '2025/2026',
  INDEX idx_timetable_group (group_code),
  INDEX idx_timetable_date  (session_date)
);

-- Messages table
CREATE TABLE IF NOT EXISTS broadcast_messages (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  sender_id    BIGINT NOT NULL,
  subject      VARCHAR(255),
  body         TEXT NOT NULL,
  target_type  ENUM('ALL','GROUP','USER') NOT NULL DEFAULT 'ALL',
  target_group VARCHAR(20) NULL,
  target_user  BIGINT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (target_user) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS message_recipients (
  message_id   BIGINT NOT NULL,
  user_id      BIGINT NOT NULL,
  is_read      TINYINT(1) DEFAULT 0,
  read_at      DATETIME NULL,
  PRIMARY KEY (message_id, user_id),
  FOREIGN KEY (message_id) REFERENCES broadcast_messages(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Notifications table
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
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notifications_user (user_id),
  INDEX idx_notifications_unread (user_id, is_read)
);

-- 75 Semester 6 EIE students (password = 'elabs2024', must change on first login)
-- NOTE: password_hash below is a placeholder. Run `node scripts/seed/hash_and_insert.js` to insert with real bcrypt hash.
-- Or use the Admin → Import Students UI which hashes properly.

-- EG/2022/4904 | Zaheer A.J.M. | EE01
SET @uid_4904 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/4904', 'Zaheer A.J.M.', 'eg4904@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_4904 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_4904, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_4904, 'EG/2022/4904', 'EE01', 6, 1
  WHERE @uid_4904 IS NOT NULL AND @uid_4904 > 0;

-- EG/2022/4905 | Aasif A.K.M. | EE01
SET @uid_4905 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/4905', 'Aasif A.K.M.', 'eg4905@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_4905 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_4905, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_4905, 'EG/2022/4905', 'EE01', 6, 1
  WHERE @uid_4905 IS NOT NULL AND @uid_4905 > 0;

-- EG/2022/4907 | Abdullah A.R. | EE01
SET @uid_4907 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/4907', 'Abdullah A.R.', 'eg4907@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_4907 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_4907, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_4907, 'EG/2022/4907', 'EE01', 6, 1
  WHERE @uid_4907 IS NOT NULL AND @uid_4907 > 0;

-- EG/2022/4912 | Abeysinghe A.M.P.M.B. | EE01
SET @uid_4912 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/4912', 'Abeysinghe A.M.P.M.B.', 'eg4912@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_4912 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_4912, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_4912, 'EG/2022/4912', 'EE01', 6, 1
  WHERE @uid_4912 IS NOT NULL AND @uid_4912 > 0;

-- EG/2022/4914 | Abeysundara R.L. | EE01
SET @uid_4914 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/4914', 'Abeysundara R.L.', 'eg4914@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_4914 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_4914, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_4914, 'EG/2022/4914', 'EE01', 6, 1
  WHERE @uid_4914 IS NOT NULL AND @uid_4914 > 0;

-- EG/2022/4916 | Adhikari A.M.I.S. | EE01
SET @uid_4916 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/4916', 'Adhikari A.M.I.S.', 'eg4916@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_4916 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_4916, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_4916, 'EG/2022/4916', 'EE01', 6, 1
  WHERE @uid_4916 IS NOT NULL AND @uid_4916 > 0;

-- EG/2022/4928 | Aluvihare S.D | EE02
SET @uid_4928 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/4928', 'Aluvihare S.D', 'eg4928@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_4928 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_4928, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_4928, 'EG/2022/4928', 'EE02', 6, 1
  WHERE @uid_4928 IS NOT NULL AND @uid_4928 > 0;

-- EG/2022/4929 | Amarakoon A.V.G.U.T. | EE02
SET @uid_4929 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/4929', 'Amarakoon A.V.G.U.T.', 'eg4929@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_4929 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_4929, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_4929, 'EG/2022/4929', 'EE02', 6, 1
  WHERE @uid_4929 IS NOT NULL AND @uid_4929 > 0;

-- EG/2022/4942 | Aslam M.H.M. | EE02
SET @uid_4942 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/4942', 'Aslam M.H.M.', 'eg4942@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_4942 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_4942, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_4942, 'EG/2022/4942', 'EE02', 6, 1
  WHERE @uid_4942 IS NOT NULL AND @uid_4942 > 0;

-- EG/2022/4944 | Atapattu G.T. | EE02
SET @uid_4944 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/4944', 'Atapattu G.T.', 'eg4944@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_4944 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_4944, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_4944, 'EG/2022/4944', 'EE02', 6, 1
  WHERE @uid_4944 IS NOT NULL AND @uid_4944 > 0;

-- EG/2022/4953 | Bandara M.G.N.M. | EE02
SET @uid_4953 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/4953', 'Bandara M.G.N.M.', 'eg4953@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_4953 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_4953, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_4953, 'EG/2022/4953', 'EE02', 6, 1
  WHERE @uid_4953 IS NOT NULL AND @uid_4953 > 0;

-- EG/2022/4983 | Dassanayaka D.M.P.S.P. | EE02
SET @uid_4983 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/4983', 'Dassanayaka D.M.P.S.P.', 'eg4983@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_4983 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_4983, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_4983, 'EG/2022/4983', 'EE02', 6, 1
  WHERE @uid_4983 IS NOT NULL AND @uid_4983 > 0;

-- EG/2022/4985 | De Mal W.G.S. | EE03
SET @uid_4985 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/4985', 'De Mal W.G.S.', 'eg4985@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_4985 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_4985, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_4985, 'EG/2022/4985', 'EE03', 6, 1
  WHERE @uid_4985 IS NOT NULL AND @uid_4985 > 0;

-- EG/2022/4992 | Devinda A.P.P. | EE03
SET @uid_4992 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/4992', 'Devinda A.P.P.', 'eg4992@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_4992 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_4992, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_4992, 'EG/2022/4992', 'EE03', 6, 1
  WHERE @uid_4992 IS NOT NULL AND @uid_4992 > 0;

-- EG/2022/5003 | Dilhara K.K.V.R. | EE03
SET @uid_5003 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/5003', 'Dilhara K.K.V.R.', 'eg5003@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_5003 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_5003, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_5003, 'EG/2022/5003', 'EE03', 6, 1
  WHERE @uid_5003 IS NOT NULL AND @uid_5003 > 0;

-- EG/2022/5024 | Dulanjana K.A.P. | EE03
SET @uid_5024 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/5024', 'Dulanjana K.A.P.', 'eg5024@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_5024 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_5024, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_5024, 'EG/2022/5024', 'EE03', 6, 1
  WHERE @uid_5024 IS NOT NULL AND @uid_5024 > 0;

-- EG/2022/5025 | Dulanjith D.M.K.S. | EE03
SET @uid_5025 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/5025', 'Dulanjith D.M.K.S.', 'eg5025@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_5025 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_5025, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_5025, 'EG/2022/5025', 'EE03', 6, 1
  WHERE @uid_5025 IS NOT NULL AND @uid_5025 > 0;

-- EG/2022/5026 | Edirinayaka E.M.G.I.U. | EE03
SET @uid_5026 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/5026', 'Edirinayaka E.M.G.I.U.', 'eg5026@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_5026 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_5026, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_5026, 'EG/2022/5026', 'EE03', 6, 1
  WHERE @uid_5026 IS NOT NULL AND @uid_5026 > 0;

-- EG/2022/5032 | Evans J.A.P. | EE04
SET @uid_5032 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/5032', 'Evans J.A.P.', 'eg5032@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_5032 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_5032, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_5032, 'EG/2022/5032', 'EE04', 6, 1
  WHERE @uid_5032 IS NOT NULL AND @uid_5032 > 0;

-- EG/2022/5033 | Fernando D.T.C.P. | EE04
SET @uid_5033 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/5033', 'Fernando D.T.C.P.', 'eg5033@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_5033 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_5033, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_5033, 'EG/2022/5033', 'EE04', 6, 1
  WHERE @uid_5033 IS NOT NULL AND @uid_5033 > 0;

-- EG/2022/5034 | Fernando H.D.S.D. | EE04
SET @uid_5034 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/5034', 'Fernando H.D.S.D.', 'eg5034@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_5034 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_5034, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_5034, 'EG/2022/5034', 'EE04', 6, 1
  WHERE @uid_5034 IS NOT NULL AND @uid_5034 > 0;

-- EG/2022/5045 | Gomes A.A.A.G. | EE04
SET @uid_5045 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/5045', 'Gomes A.A.A.G.', 'eg5045@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_5045 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_5045, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_5045, 'EG/2022/5045', 'EE04', 6, 1
  WHERE @uid_5045 IS NOT NULL AND @uid_5045 > 0;

-- EG/2022/5055 | Hamid K.K.J. | EE04
SET @uid_5055 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/5055', 'Hamid K.K.J.', 'eg5055@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_5055 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_5055, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_5055, 'EG/2022/5055', 'EE04', 6, 1
  WHERE @uid_5055 IS NOT NULL AND @uid_5055 > 0;

-- EG/2022/5064 | Herath H.M.N.B. | EE04
SET @uid_5064 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/5064', 'Herath H.M.N.B.', 'eg5064@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_5064 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_5064, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_5064, 'EG/2022/5064', 'EE04', 6, 1
  WHERE @uid_5064 IS NOT NULL AND @uid_5064 > 0;

-- EG/2022/5093 | Jayantha B.Y. | EE05
SET @uid_5093 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/5093', 'Jayantha B.Y.', 'eg5093@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_5093 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_5093, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_5093, 'EG/2022/5093', 'EE05', 6, 1
  WHERE @uid_5093 IS NOT NULL AND @uid_5093 > 0;

-- EG/2022/5101 | Jayasinghe H.P.A.U. | EE05
SET @uid_5101 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/5101', 'Jayasinghe H.P.A.U.', 'eg5101@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_5101 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_5101, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_5101, 'EG/2022/5101', 'EE05', 6, 1
  WHERE @uid_5101 IS NOT NULL AND @uid_5101 > 0;

-- EG/2022/5102 | Jayasinghe L.O.I.V. | EE05
SET @uid_5102 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/5102', 'Jayasinghe L.O.I.V.', 'eg5102@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_5102 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_5102, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_5102, 'EG/2022/5102', 'EE05', 6, 1
  WHERE @uid_5102 IS NOT NULL AND @uid_5102 > 0;

-- EG/2022/5113 | Jayawickrama J.A.N.D | EE05
SET @uid_5113 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/5113', 'Jayawickrama J.A.N.D', 'eg5113@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_5113 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_5113, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_5113, 'EG/2022/5113', 'EE05', 6, 1
  WHERE @uid_5113 IS NOT NULL AND @uid_5113 > 0;

-- EG/2022/5115 | Joseph S.K. | EE05
SET @uid_5115 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/5115', 'Joseph S.K.', 'eg5115@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_5115 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_5115, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_5115, 'EG/2022/5115', 'EE05', 6, 1
  WHERE @uid_5115 IS NOT NULL AND @uid_5115 > 0;

-- EG/2022/5117 | Kahatapitiya D.P. | EE05
SET @uid_5117 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/5117', 'Kahatapitiya D.P.', 'eg5117@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_5117 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_5117, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_5117, 'EG/2022/5117', 'EE05', 6, 1
  WHERE @uid_5117 IS NOT NULL AND @uid_5117 > 0;

-- EG/2022/5118 | Kalhara T.G.C.K. | EE06
SET @uid_5118 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/5118', 'Kalhara T.G.C.K.', 'eg5118@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_5118 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_5118, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_5118, 'EG/2022/5118', 'EE06', 6, 1
  WHERE @uid_5118 IS NOT NULL AND @uid_5118 > 0;

-- EG/2022/5137 | Kavindya K.W.L.A. | EE06
SET @uid_5137 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/5137', 'Kavindya K.W.L.A.', 'eg5137@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_5137 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_5137, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_5137, 'EG/2022/5137', 'EE06', 6, 1
  WHERE @uid_5137 IS NOT NULL AND @uid_5137 > 0;

-- EG/2022/5146 | Kishon J.B. | EE06
SET @uid_5146 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/5146', 'Kishon J.B.', 'eg5146@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_5146 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_5146, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_5146, 'EG/2022/5146', 'EE06', 6, 1
  WHERE @uid_5146 IS NOT NULL AND @uid_5146 > 0;

-- EG/2022/5170 | Liyanawaduge I.I. | EE06
SET @uid_5170 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/5170', 'Liyanawaduge I.I.', 'eg5170@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_5170 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_5170, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_5170, 'EG/2022/5170', 'EE06', 6, 1
  WHERE @uid_5170 IS NOT NULL AND @uid_5170 > 0;

-- EG/2022/5174 | Madhavika J.D.B. | EE06
SET @uid_5174 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/5174', 'Madhavika J.D.B.', 'eg5174@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_5174 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_5174, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_5174, 'EG/2022/5174', 'EE06', 6, 1
  WHERE @uid_5174 IS NOT NULL AND @uid_5174 > 0;

-- EG/2022/5180 | Madhushanka K.M.P. | EE06
SET @uid_5180 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/5180', 'Madhushanka K.M.P.', 'eg5180@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_5180 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_5180, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_5180, 'EG/2022/5180', 'EE06', 6, 1
  WHERE @uid_5180 IS NOT NULL AND @uid_5180 > 0;

-- EG/2022/5183 | Madushan M.A.D.B. | EE07
SET @uid_5183 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/5183', 'Madushan M.A.D.B.', 'eg5183@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_5183 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_5183, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_5183, 'EG/2022/5183', 'EE07', 6, 1
  WHERE @uid_5183 IS NOT NULL AND @uid_5183 > 0;

-- EG/2022/5185 | Malshan J.K.S.I. | EE07
SET @uid_5185 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/5185', 'Malshan J.K.S.I.', 'eg5185@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_5185 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_5185, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_5185, 'EG/2022/5185', 'EE07', 6, 1
  WHERE @uid_5185 IS NOT NULL AND @uid_5185 > 0;

-- EG/2022/5186 | Manodya G.P. | EE07
SET @uid_5186 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/5186', 'Manodya G.P.', 'eg5186@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_5186 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_5186, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_5186, 'EG/2022/5186', 'EE07', 6, 1
  WHERE @uid_5186 IS NOT NULL AND @uid_5186 > 0;

-- EG/2022/5187 | Manthreerathnasekara H.A.S.S. | EE07
SET @uid_5187 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/5187', 'Manthreerathnasekara H.A.S.S.', 'eg5187@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_5187 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_5187, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_5187, 'EG/2022/5187', 'EE07', 6, 1
  WHERE @uid_5187 IS NOT NULL AND @uid_5187 > 0;

-- EG/2022/5198 | Munasinhe M.A.B.M. | EE07
SET @uid_5198 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/5198', 'Munasinhe M.A.B.M.', 'eg5198@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_5198 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_5198, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_5198, 'EG/2022/5198', 'EE07', 6, 1
  WHERE @uid_5198 IS NOT NULL AND @uid_5198 > 0;

-- EG/2022/5207 | Nawarathna N.A.M.J.B. | EE07
SET @uid_5207 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/5207', 'Nawarathna N.A.M.J.B.', 'eg5207@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_5207 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_5207, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_5207, 'EG/2022/5207', 'EE07', 6, 1
  WHERE @uid_5207 IS NOT NULL AND @uid_5207 > 0;

-- EG/2022/5219 | Nipuni S.H.S. | EE08
SET @uid_5219 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/5219', 'Nipuni S.H.S.', 'eg5219@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_5219 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_5219, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_5219, 'EG/2022/5219', 'EE08', 6, 1
  WHERE @uid_5219 IS NOT NULL AND @uid_5219 > 0;

-- EG/2022/5229 | Pallegedara H.M.P.R.S.B. | EE08
SET @uid_5229 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/5229', 'Pallegedara H.M.P.R.S.B.', 'eg5229@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_5229 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_5229, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_5229, 'EG/2022/5229', 'EE08', 6, 1
  WHERE @uid_5229 IS NOT NULL AND @uid_5229 > 0;

-- EG/2022/5234 | Pathiraja W.A.L.V.P. | EE08
SET @uid_5234 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/5234', 'Pathiraja W.A.L.V.P.', 'eg5234@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_5234 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_5234, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_5234, 'EG/2022/5234', 'EE08', 6, 1
  WHERE @uid_5234 IS NOT NULL AND @uid_5234 > 0;

-- EG/2022/5239 | Perera M.T.J.P. | EE08
SET @uid_5239 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/5239', 'Perera M.T.J.P.', 'eg5239@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_5239 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_5239, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_5239, 'EG/2022/5239', 'EE08', 6, 1
  WHERE @uid_5239 IS NOT NULL AND @uid_5239 > 0;

-- EG/2022/5254 | Priyamal R.M.S. | EE08
SET @uid_5254 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/5254', 'Priyamal R.M.S.', 'eg5254@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_5254 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_5254, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_5254, 'EG/2022/5254', 'EE08', 6, 1
  WHERE @uid_5254 IS NOT NULL AND @uid_5254 > 0;

-- EG/2022/5263 | Rajanayake R.H.M.D.N.B. | EE08
SET @uid_5263 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/5263', 'Rajanayake R.H.M.D.N.B.', 'eg5263@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_5263 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_5263, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_5263, 'EG/2022/5263', 'EE08', 6, 1
  WHERE @uid_5263 IS NOT NULL AND @uid_5263 > 0;

-- EG/2022/5271 | Ranasinghe J.A.S.V. | EE09
SET @uid_5271 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/5271', 'Ranasinghe J.A.S.V.', 'eg5271@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_5271 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_5271, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_5271, 'EG/2022/5271', 'EE09', 6, 1
  WHERE @uid_5271 IS NOT NULL AND @uid_5271 > 0;

-- EG/2022/5275 | Ranasinghe S.M.T.V. | EE09
SET @uid_5275 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/5275', 'Ranasinghe S.M.T.V.', 'eg5275@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_5275 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_5275, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_5275, 'EG/2022/5275', 'EE09', 6, 1
  WHERE @uid_5275 IS NOT NULL AND @uid_5275 > 0;

-- EG/2022/5294 | Ridmi P.J.A. | EE09
SET @uid_5294 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/5294', 'Ridmi P.J.A.', 'eg5294@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_5294 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_5294, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_5294, 'EG/2022/5294', 'EE09', 6, 1
  WHERE @uid_5294 IS NOT NULL AND @uid_5294 > 0;

-- EG/2022/5295 | Rodrigo W.P.V. | EE09
SET @uid_5295 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/5295', 'Rodrigo W.P.V.', 'eg5295@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_5295 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_5295, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_5295, 'EG/2022/5295', 'EE09', 6, 1
  WHERE @uid_5295 IS NOT NULL AND @uid_5295 > 0;

-- EG/2022/5296 | Rodrigo W.S.G. | EE09
SET @uid_5296 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/5296', 'Rodrigo W.S.G.', 'eg5296@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_5296 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_5296, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_5296, 'EG/2022/5296', 'EE09', 6, 1
  WHERE @uid_5296 IS NOT NULL AND @uid_5296 > 0;

-- EG/2022/5297 | Rodrigo W.T.N. | EE09
SET @uid_5297 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/5297', 'Rodrigo W.T.N.', 'eg5297@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_5297 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_5297, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_5297, 'EG/2022/5297', 'EE09', 6, 1
  WHERE @uid_5297 IS NOT NULL AND @uid_5297 > 0;

-- EG/2022/5302 | Sahabandu K.L.T.L. | EE10
SET @uid_5302 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/5302', 'Sahabandu K.L.T.L.', 'eg5302@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_5302 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_5302, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_5302, 'EG/2022/5302', 'EE10', 6, 1
  WHERE @uid_5302 IS NOT NULL AND @uid_5302 > 0;

-- EG/2022/5305 | Sahipiramigan N. | EE10
SET @uid_5305 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/5305', 'Sahipiramigan N.', 'eg5305@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_5305 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_5305, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_5305, 'EG/2022/5305', 'EE10', 6, 1
  WHERE @uid_5305 IS NOT NULL AND @uid_5305 > 0;

-- EG/2022/5317 | Sandaruwan H.G.D. | EE10
SET @uid_5317 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/5317', 'Sandaruwan H.G.D.', 'eg5317@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_5317 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_5317, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_5317, 'EG/2022/5317', 'EE10', 6, 1
  WHERE @uid_5317 IS NOT NULL AND @uid_5317 > 0;

-- EG/2022/5337 | Sewmini P.H.I. | EE10
SET @uid_5337 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/5337', 'Sewmini P.H.I.', 'eg5337@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_5337 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_5337, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_5337, 'EG/2022/5337', 'EE10', 6, 1
  WHERE @uid_5337 IS NOT NULL AND @uid_5337 > 0;

-- EG/2022/5339 | Sewwandi I.P. | EE10
SET @uid_5339 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/5339', 'Sewwandi I.P.', 'eg5339@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_5339 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_5339, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_5339, 'EG/2022/5339', 'EE10', 6, 1
  WHERE @uid_5339 IS NOT NULL AND @uid_5339 > 0;

-- EG/2022/5343 | Sharoz R.A.W. | EE10
SET @uid_5343 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/5343', 'Sharoz R.A.W.', 'eg5343@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_5343 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_5343, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_5343, 'EG/2022/5343', 'EE10', 6, 1
  WHERE @uid_5343 IS NOT NULL AND @uid_5343 > 0;

-- EG/2022/5347 | Silva H.D.S.N. | EE10
SET @uid_5347 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/5347', 'Silva H.D.S.N.', 'eg5347@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_5347 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_5347, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_5347, 'EG/2022/5347', 'EE10', 6, 1
  WHERE @uid_5347 IS NOT NULL AND @uid_5347 > 0;

-- EG/2022/5357 | Sudasingha S.D.S.I. | EE11
SET @uid_5357 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/5357', 'Sudasingha S.D.S.I.', 'eg5357@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_5357 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_5357, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_5357, 'EG/2022/5357', 'EE11', 6, 1
  WHERE @uid_5357 IS NOT NULL AND @uid_5357 > 0;

-- EG/2022/5371 | Thilakarathne M.M.U.S. | EE11
SET @uid_5371 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/5371', 'Thilakarathne M.M.U.S.', 'eg5371@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_5371 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_5371, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_5371, 'EG/2022/5371', 'EE11', 6, 1
  WHERE @uid_5371 IS NOT NULL AND @uid_5371 > 0;

-- EG/2022/5380 | Vithana B.V.B. | EE11
SET @uid_5380 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/5380', 'Vithana B.V.B.', 'eg5380@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_5380 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_5380, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_5380, 'EG/2022/5380', 'EE11', 6, 1
  WHERE @uid_5380 IS NOT NULL AND @uid_5380 > 0;

-- EG/2022/5390 | Weerakoon A.D.N.L. | EE11
SET @uid_5390 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/5390', 'Weerakoon A.D.N.L.', 'eg5390@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_5390 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_5390, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_5390, 'EG/2022/5390', 'EE11', 6, 1
  WHERE @uid_5390 IS NOT NULL AND @uid_5390 > 0;

-- EG/2022/5399 | Weerasinghe N.M.P.M. | EE11
SET @uid_5399 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/5399', 'Weerasinghe N.M.P.M.', 'eg5399@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_5399 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_5399, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_5399, 'EG/2022/5399', 'EE11', 6, 1
  WHERE @uid_5399 IS NOT NULL AND @uid_5399 > 0;

-- EG/2022/5401 | Weerasinghe T.H.K. | EE11
SET @uid_5401 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/5401', 'Weerasinghe T.H.K.', 'eg5401@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_5401 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_5401, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_5401, 'EG/2022/5401', 'EE11', 6, 1
  WHERE @uid_5401 IS NOT NULL AND @uid_5401 > 0;

-- EG/2022/5412 | Wickramasingha N.G.A.W.R.O. | EE11
SET @uid_5412 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/5412', 'Wickramasingha N.G.A.W.R.O.', 'eg5412@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_5412 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_5412, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_5412, 'EG/2022/5412', 'EE11', 6, 1
  WHERE @uid_5412 IS NOT NULL AND @uid_5412 > 0;

-- EG/2022/5418 | Wijayarathna M.K.D.I.M. | EE12
SET @uid_5418 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/5418', 'Wijayarathna M.K.D.I.M.', 'eg5418@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_5418 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_5418, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_5418, 'EG/2022/5418', 'EE12', 6, 1
  WHERE @uid_5418 IS NOT NULL AND @uid_5418 > 0;

-- EG/2022/5419 | Wijayathilake A.C.M.G. | EE12
SET @uid_5419 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/5419', 'Wijayathilake A.C.M.G.', 'eg5419@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_5419 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_5419, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_5419, 'EG/2022/5419', 'EE12', 6, 1
  WHERE @uid_5419 IS NOT NULL AND @uid_5419 > 0;

-- EG/2022/5421 | Wijerathna S.S.M. | EE12
SET @uid_5421 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/5421', 'Wijerathna S.S.M.', 'eg5421@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_5421 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_5421, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_5421, 'EG/2022/5421', 'EE12', 6, 1
  WHERE @uid_5421 IS NOT NULL AND @uid_5421 > 0;

-- EG/2022/5424 | Wijesinghe D.Y.C. | EE12
SET @uid_5424 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/5424', 'Wijesinghe D.Y.C.', 'eg5424@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_5424 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_5424, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_5424, 'EG/2022/5424', 'EE12', 6, 1
  WHERE @uid_5424 IS NOT NULL AND @uid_5424 > 0;

-- EG/2022/5442 | Premarathna H.B.T.D. | EE12
SET @uid_5442 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/5442', 'Premarathna H.B.T.D.', 'eg5442@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_5442 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_5442, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_5442, 'EG/2022/5442', 'EE12', 6, 1
  WHERE @uid_5442 IS NOT NULL AND @uid_5442 > 0;

-- EG/2022/5443 | Jayathilaka W.M.T.K. | EE12
SET @uid_5443 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/5443', 'Jayathilaka W.M.T.K.', 'eg5443@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_5443 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_5443, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_5443, 'EG/2022/5443', 'EE12', 6, 1
  WHERE @uid_5443 IS NOT NULL AND @uid_5443 > 0;

-- EG/2022/5450 | Edirisooriya E.M.H.B. | EE12
SET @uid_5450 = NULL;
INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
  VALUES ('EG/2022/5450', 'Edirisooriya E.M.H.B.', 'eg5450@eng.ruh.ac.lk', 'PLACEHOLDER_HASH_elabs2024', 1, 1);
SET @uid_5450 = LAST_INSERT_ID();
INSERT IGNORE INTO user_roles (user_id, role_id)
  SELECT @uid_5450, id FROM roles WHERE name='STUDENT' LIMIT 1;
INSERT IGNORE INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
  SELECT @uid_5450, 'EG/2022/5450', 'EE12', 6, 1
  WHERE @uid_5450 IS NOT NULL AND @uid_5450 > 0;


-- Timetable schedule entries
DELETE FROM timetable_slots WHERE academic_year='2025/2026';
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-05-06', '08.30AM - 11.30AM', 'EE6302', 'Lab1', 'EE07', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-05-06', '08.30AM - 11.30AM', 'EE6302', 'Lab1', 'EE08', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-05-08', '1.30PM - 4.30PM', 'EE6301', 'Lab1', 'EE01', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-05-08', '1.30PM - 4.30PM', 'EE6301', 'Lab1', 'EE02', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-05-08', '1.30PM - 4.30PM', 'EE6301', 'Lab2', 'EE01', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-05-08', '1.30PM - 4.30PM', 'EE6301', 'Lab2', 'EE02', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-05-08', '1.30PM - 4.30PM', 'EE6302', 'Lab1', 'EE05', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-05-08', '1.30PM - 4.30PM', 'EE6302', 'Lab1', 'EE06', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-05-11', '2.30PM - 4.30PM', 'EE6302', 'Lab1', 'EE11', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-05-11', '2.30PM - 4.30PM', 'EE6302', 'Lab1', 'EE12', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-05-13', '08.30AM - 11.30AM', 'EE6301', 'Lab1', 'EE03', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-05-13', '08.30AM - 11.30AM', 'EE6301', 'Lab1', 'EE04', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-05-13', '08.30AM - 11.30AM', 'EE6301', 'Lab2', 'EE03', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-05-13', '08.30AM - 11.30AM', 'EE6301', 'Lab2', 'EE04', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-05-13', '08.30AM - 11.30AM', 'EE6302', 'Lab1', 'EE09', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-05-13', '08.30AM - 11.30AM', 'EE6302', 'Lab1', 'EE10', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-05-15', '1.30PM - 4.30PM', 'EE6302', 'Lab1', 'EE03', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-05-15', '1.30PM - 4.30PM', 'EE6302', 'Lab1', 'EE04', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-05-18', '2.30PM - 4.30PM', 'EE6302', 'Lab1', 'EE01', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-05-18', '2.30PM - 4.30PM', 'EE6302', 'Lab1', 'EE02', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-05-20', '08.30AM - 11.30AM', 'EE6301', 'Lab1', 'EE05', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-05-20', '08.30AM - 11.30AM', 'EE6301', 'Lab1', 'EE06', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-05-20', '08.30AM - 11.30AM', 'EE6301', 'Lab2', 'EE05', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-05-20', '08.30AM - 11.30AM', 'EE6301', 'Lab2', 'EE06', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-05-20', '08.30AM - 11.30AM', 'EE6302', 'Lab2', 'EE07', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-05-20', '08.30AM - 11.30AM', 'EE6302', 'Lab2', 'EE08', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-05-20', '08.30AM - 11.30AM', 'EE6309', 'Lab1', 'RE01', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-05-20', '08.30AM - 11.30AM', 'EE6309', 'Lab1', 'RE02', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-05-20', '08.30AM - 11.30AM', 'EE6309', 'Lab1', 'R03', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-05-22', '1.30PM - 4.30PM', 'EE6301', 'Lab1', 'EE09', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-05-22', '1.30PM - 4.30PM', 'EE6301', 'Lab1', 'EE10', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-05-22', '1.30PM - 4.30PM', 'EE6301', 'Lab2', 'EE09', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-05-22', '1.30PM - 4.30PM', 'EE6301', 'Lab2', 'EE10', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-05-22', '1.30PM - 4.30PM', 'EE6302', 'Lab2', 'EE05', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-05-22', '1.30PM - 4.30PM', 'EE6302', 'Lab2', 'EE06', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-05-22', '1.30PM - 4.30PM', 'EE6309', 'Lab1', 'RE06', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-05-22', '1.30PM - 4.30PM', 'EE6309', 'Lab1', 'RE10', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-05-22', '1.30PM - 4.30PM', 'EE6309', 'Lab1', 'RE11', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-05-27', '08.30AM - 11.30AM', 'EE6301', 'Lab1', 'EE11', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-05-27', '08.30AM - 11.30AM', 'EE6301', 'Lab1', 'EE12', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-05-27', '08.30AM - 11.30AM', 'EE6301', 'Lab2', 'EE11', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-05-27', '08.30AM - 11.30AM', 'EE6301', 'Lab2', 'EE12', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-05-27', '08.30AM - 11.30AM', 'EE6302', 'Lab2', 'EE03', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-05-27', '08.30AM - 11.30AM', 'EE6302', 'Lab2', 'EE04', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-06-03', '08.30AM - 11.30AM', 'EE6301', 'Lab1', 'EE07', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-06-03', '08.30AM - 11.30AM', 'EE6301', 'Lab1', 'EE08', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-06-03', '08.30AM - 11.30AM', 'EE6301', 'Lab2', 'EE07', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-06-03', '08.30AM - 11.30AM', 'EE6301', 'Lab2', 'EE08', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-06-03', '08.30AM - 11.30AM', 'EE6302', 'Lab2', 'EE09', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-06-03', '08.30AM - 11.30AM', 'EE6302', 'Lab2', 'EE10', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-06-05', '1.30PM - 4.30PM', 'EE6309', 'Lab2', 'RE04', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-06-05', '1.30PM - 4.30PM', 'EE6309', 'Lab2', 'RE05', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-06-05', '1.30PM - 4.30PM', 'EE6309', 'Lab2', 'RE06', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-06-10', '08.30AM - 11.30AM', 'EE6302', 'Lab2', 'EE11', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-06-10', '08.30AM - 11.30AM', 'EE6302', 'Lab2', 'EE12', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-06-12', '1.30PM - 4.30PM', 'EE6302', 'Lab2', 'EE01', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-06-12', '1.30PM - 4.30PM', 'EE6302', 'Lab2', 'EE02', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-06-24', '08.30AM - 11.30AM', 'EE6302', 'Lab 3', 'EE03', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-06-24', '08.30AM - 11.30AM', 'EE6302', 'Lab 3', 'EE04', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-06-24', '08.30AM - 11.30AM', 'EE6309', 'Lab1', 'RE05', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-06-24', '08.30AM - 11.30AM', 'EE6309', 'Lab1', 'REE07', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-06-24', '08.30AM - 11.30AM', 'EE6309', 'Lab1', 'RE08', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-06-26', '1.30PM - 4.30PM', 'EE6302', 'Lab 3', 'EE01', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-06-26', '1.30PM - 4.30PM', 'EE6302', 'Lab 3', 'EE02', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-06-26', '1.30PM - 4.30PM', 'EE6309', 'Lab1', 'RE04', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-06-26', '1.30PM - 4.30PM', 'EE6309', 'Lab1', 'RE09', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-06-26', '1.30PM - 4.30PM', 'EE6309', 'Lab1', '5180', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-06-29', '2.30PM - 4.30PM', 'EE6207', 'Lab1', 'Poson Poya Day (Holiday)', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-07-01', '08.30AM - 11.30AM', 'EE6302', 'Lab 3', 'EE11', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-07-01', '08.30AM - 11.30AM', 'EE6302', 'Lab 3', 'EE12', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-07-03', '1.30PM - 4.30PM', 'EE6302', 'Lab 3', 'EE09', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-07-03', '1.30PM - 4.30PM', 'EE6302', 'Lab 3', 'EE10', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-07-08', '08.30AM - 11.30AM', 'EE6302', 'Lab 3', 'EE07', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-07-08', '08.30AM - 11.30AM', 'EE6302', 'Lab 3', 'EE08', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-07-10', '1.30PM - 4.30PM', 'EE6302', 'Lab 3', 'EE05', '2025/2026');
INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
  VALUES ('2026-07-10', '1.30PM - 4.30PM', 'EE6302', 'Lab 3', 'EE06', '2025/2026');

-- End of Semester 6 seed