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
WHERE r.name='LECTURER' AND p.code IN ('courses:manage','grading:manage','chat:use','inventory:borrow');

-- TECHNICIAN
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p
WHERE r.name='TECHNICIAN' AND p.code IN ('inventory:manage','inventory:borrow','attendance:scan','chat:use');

-- STUDENT
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p
WHERE r.name='STUDENT' AND p.code IN ('chat:use','inventory:borrow');

-- NOTE: users inserted by API seed script because we need bcrypt hashes.

INSERT IGNORE INTO labs (id, name, location, floor, description, facilities) VALUES
(1, 'Power Systems and High Voltage Laboratory', 'Block C', 'Ground Floor', 'Covers high-voltage engineering and electrical power-system experiments. The department describes facilities for generating and measuring AC, DC and impulse voltages, along with partial-discharge and corona studies.', 'High-voltage testing, insulation breakdown, surge-voltage measurement and power-system studies.'),
(2, 'Electric Machines and Power Electronics Laboratory', 'Block C', '1st Floor', 'Studies electrical machines, motor drives and power-electronic converters.', 'AC and DC motor testing, torque and speed measurements, rectifiers, converters, inverter-based drives and motor control.'),
(3, 'Electronics and Measurement Laboratory', 'Block A', '2nd Floor', 'Supports analog and digital electronics, electrical measurements and instrumentation.', 'Oscilloscopes, logic analysers, function generators, DC power supplies, FPGA development kits and electronic circuit testing.'),
(4, 'Communication and Systems Engineering Laboratory', 'Block B', '1st Floor', 'Supports practical learning in communication engineering and related systems.', 'Communication-system experiments and signal-related studies.'),
(5, 'Information Engineering Laboratory', 'Block C', '4th Floor', 'The department describes networking facilities developed in collaboration with Cisco Networking Academy.', 'Router and switch configuration, VLANs, trunking, routing and digital communication-related practicals.'),
(6, '24 × 7 Undergraduate Development Project Laboratory', 'Block D', '4th Floor', 'A project workspace for undergraduate development and final-year projects. The website describes 16 workstations, soldering facilities, and cutting and drilling stations.', '16 workstations, soldering facilities, cutting and drilling stations, rapid prototyping and project development.');

-- demo items (barcode values = elabs_tag)
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-PS-0001', 'Digital Multimeter', 'Measurement', 'UT61E', 'SN-PS-01', 'AVAILABLE'
FROM labs l WHERE l.name='Power Systems and High Voltage Laboratory';

INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-EL-0001', 'Oscilloscope', 'Measurement', 'DS1054Z', 'SN-EL-01', 'AVAILABLE'
FROM labs l WHERE l.name='Electronics and Measurement Laboratory';
