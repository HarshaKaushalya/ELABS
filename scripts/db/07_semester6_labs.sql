-- Migration: Add coordinator fields and module practicals table
USE elabs;

-- Add coordinator_name to modules
SET @col = (SELECT COUNT(1) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='elabs' AND TABLE_NAME='modules' AND COLUMN_NAME='coordinator_name');
SET @sql = IF(@col=0, 'ALTER TABLE modules ADD COLUMN coordinator_name VARCHAR(150) NULL', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Add num_students to modules
SET @col2 = (SELECT COUNT(1) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='elabs' AND TABLE_NAME='modules' AND COLUMN_NAME='num_students');
SET @sql2 = IF(@col2=0, 'ALTER TABLE modules ADD COLUMN num_students INT DEFAULT 75', 'SELECT 1');
PREPARE s2 FROM @sql2; EXECUTE s2; DEALLOCATE PREPARE s2;

-- Add semester_coordinator to semesters table
SET @col3 = (SELECT COUNT(1) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='elabs' AND TABLE_NAME='semesters' AND COLUMN_NAME='coordinator_name');
SET @sql3 = IF(@col3=0, 'ALTER TABLE semesters ADD COLUMN coordinator_name VARCHAR(150) NULL', 'SELECT 1');
PREPARE s3 FROM @sql3; EXECUTE s3; DEALLOCATE PREPARE s3;

-- Create module_practicals table
CREATE TABLE IF NOT EXISTS module_practicals (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  module_code   VARCHAR(20) NOT NULL,
  lab_number    VARCHAR(20) NOT NULL,
  lab_title     VARCHAR(255) NULL,
  equip_status  ENUM('Working','Not Working','Under Maintenance') DEFAULT 'Working',
  num_sessions  INT DEFAULT 0,
  notes         TEXT NULL,
  sort_order    INT DEFAULT 0,
  UNIQUE KEY uq_module_lab (module_code, lab_number)
);

-- ==============================
-- Seed Semester 6 Coordinator
-- ==============================
UPDATE semesters SET coordinator_name = 'Ms. P.K.S. Diddeni' WHERE level = 6;

-- ==============================
-- Seed Module Coordinators (Semester 6 real data)
-- ==============================
UPDATE modules SET coordinator_name = 'Dr. Kaveen Liyanage',        num_students = 75 WHERE code = 'EE6207';
UPDATE modules SET coordinator_name = 'Mr. T.N. Weerasinghe',       num_students = 75 WHERE code = 'EE6301';
UPDATE modules SET coordinator_name = 'Dr. K.M.I.U. Ranaweera',     num_students = 75 WHERE code = 'EE6302';
UPDATE modules SET coordinator_name = 'Mr. Anuradha Mudalige',       num_students = 75 WHERE code = 'EE6309';
UPDATE modules SET coordinator_name = 'Dr. W.N.B.A.G. Priyankara',  num_students = 75 WHERE code = 'EE6210';

-- ==============================
-- Seed Module Practicals (from List of Practical doc)
-- ==============================

-- EE6207 Digital Signal Processing (lab titles not specified in document)
INSERT INTO module_practicals (module_code, lab_number, lab_title, equip_status, num_sessions, sort_order) VALUES
('EE6207', 'Lab 1', NULL,           'Working', 0, 1),
('EE6207', 'Lab 2', NULL,           'Working', 0, 2),
('EE6207', 'Lab 3', NULL,           'Working', 0, 3),
('EE6207', 'Lab 4', NULL,           'Working', 0, 4)
ON DUPLICATE KEY UPDATE equip_status=VALUES(equip_status), sort_order=VALUES(sort_order);

-- EE6301 Computer Network
INSERT INTO module_practicals (module_code, lab_number, lab_title, equip_status, num_sessions, sort_order) VALUES
('EE6301', 'Lab 1', 'Configuring VLANs and Trunking',    'Working', 6, 1),
('EE6301', 'Lab 2', 'Configuring routing in a Network',  'Working', 6, 2)
ON DUPLICATE KEY UPDATE lab_title=VALUES(lab_title), equip_status=VALUES(equip_status), num_sessions=VALUES(num_sessions), sort_order=VALUES(sort_order);

-- EE6302 Control System Design
INSERT INTO module_practicals (module_code, lab_number, lab_title, equip_status, num_sessions, sort_order) VALUES
('EE6302', 'Lab 1', 'Closed loop control system',         'Working', 6, 1),
('EE6302', 'Lab 2', 'Stability and effect of loop gain',  'Working', 6, 2),
('EE6302', 'Lab 3', 'Root-locus design',                  'Working', 6, 3),
('EE6302', 'Lab 4', 'PI, PD and PID control',             'Working', 6, 4)
ON DUPLICATE KEY UPDATE lab_title=VALUES(lab_title), equip_status=VALUES(equip_status), num_sessions=VALUES(num_sessions), sort_order=VALUES(sort_order);

-- EE6309 Renewable Energy System (TE)
INSERT INTO module_practicals (module_code, lab_number, lab_title, equip_status, num_sessions, sort_order) VALUES
('EE6309', 'Lab 1', 'Wind Power System',         'Working',     0, 1),
('EE6309', 'Lab 2', 'Solar Energy System',        'Working',     0, 2),
('EE6309', 'Lab 3', 'Solar Thermal System',       'Working',     0, 3),
('EE6309', 'Lab 4', 'Study on Fuel Cell Trainer', 'Not Working', 0, 4)
ON DUPLICATE KEY UPDATE lab_title=VALUES(lab_title), equip_status=VALUES(equip_status), sort_order=VALUES(sort_order);

-- EE6210 Wireless and Mobile Communications (TE) - no labs listed yet
-- (left empty until coordinator provides list)

SELECT 'Semester 6 labs migration complete' AS status;
SELECT code, coordinator_name, num_students FROM modules WHERE semester_id = 6;
SELECT module_code, lab_number, lab_title, equip_status, num_sessions FROM module_practicals ORDER BY module_code, sort_order;
