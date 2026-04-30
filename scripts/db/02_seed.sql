USE elabs;

INSERT IGNORE INTO roles (name, description) VALUES
('SYSTEM_ADMIN','Full system access'),
('LECTURER','Course and grading access'),
('TECHNICIAN','Inventory and attendance operations'),
('STUDENT','Student access');

INSERT IGNORE INTO permissions (code, description) VALUES
('admin:manage','Admin management'),
('courses:manage','Create/manage courses'),
('grading:manage','Grade quizzes/reports'),
('inventory:manage','Create/update inventory'),
('inventory:borrow','Borrow/return operations'),
('attendance:scan','Scan entry/exit'),
('chat:use','Use AI assistant');

-- role_permissions mapping (keep it simple v1)
-- SYSTEM_ADMIN: all
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.name='SYSTEM_ADMIN';

-- LECTURER
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p
WHERE r.name='LECTURER' AND p.code IN ('courses:manage','grading:manage','chat:use');

-- TECHNICIAN
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p
WHERE r.name='TECHNICIAN' AND p.code IN ('inventory:manage','inventory:borrow','attendance:scan','chat:use');

-- STUDENT
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p
WHERE r.name='STUDENT' AND p.code IN ('chat:use');

-- NOTE: users inserted by API seed script because we need bcrypt hashes.

INSERT IGNORE INTO labs (name, location, floor) VALUES
('Undergraduate Research Laboratory','Block A','3'),
('Electronics Laboratory','Block B','2'),
('Power Systems Laboratory','Block C','1'),
('Communication Laboratory','Block B','1'),
('Biomedical Laboratory','Block A','2'),
('Software Laboratory','Block D','4');

-- demo items (barcode values = elabs_tag)
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-PS-0001', 'Digital Multimeter', 'Measurement', 'UT61E', 'SN-PS-01', 'AVAILABLE'
FROM labs l WHERE l.name='Power Systems Laboratory';

INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-EL-0001', 'Oscilloscope', 'Measurement', 'DS1054Z', 'SN-EL-01', 'AVAILABLE'
FROM labs l WHERE l.name='Electronics Laboratory';
