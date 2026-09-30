USE elabs;

INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-SW-0001', 'Development Laptop', 'Computing', 'ThinkPad T14', 'SN-SW-01', 'AVAILABLE'
FROM labs l WHERE l.name='Software Laboratory';
