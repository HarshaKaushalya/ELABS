USE elabs;

-- ============================================================
-- SEMESTER GROUPS (reusing 'semesters' table)
-- ============================================================
INSERT IGNORE INTO semesters (name, level) VALUES
  ('1st Semester',  1),
  ('2nd Semester',  2),
  ('3rd Semester',  3),
  ('4th Semester',  4),
  ('5th Semester',  5),
  ('6th Semester',  6),
  ('7th Semester',  7),
  ('8th Semester',  8),
  ('R&D',           9);

-- ============================================================
-- LABS — Ensure all physical labs exist
-- ============================================================
INSERT IGNORE INTO labs (name, location, floor) VALUES
  ('Electronics Laboratory',          'Block A', '2'),
  ('Power Systems Laboratory',        'Block A', '1'),
  ('Communication Laboratory',        'Block B', '1'),
  ('Biomedical Laboratory',           'Block B', '2'),
  ('Software & Computing Laboratory', 'Block C', '3'),
  ('Circuit Design Laboratory',       'Block A', '3'),
  ('Microprocessor Laboratory',       'Block C', '2'),
  ('Renewable Energy Laboratory',     'Block D', '1'),
  ('Telecommunications Laboratory',   'Block B', '3'),
  ('Control Systems Laboratory',      'Block C', '1'),
  ('Undergraduate Research Lab',      'Block D', '4'),
  ('Network & Security Laboratory',   'Block C', '4');

-- ============================================================
-- MODULES — EE & Information Engineering
-- ============================================================

-- 1st Semester
INSERT IGNORE INTO modules (code, name, semester_id) SELECT 'EE101', 'Introduction to Electrical Engineering', id FROM semesters WHERE name = '1st Semester';
INSERT IGNORE INTO modules (code, name, semester_id) SELECT 'EE102', 'Basic Circuit Theory',                   id FROM semesters WHERE name = '1st Semester';
INSERT IGNORE INTO modules (code, name, semester_id) SELECT 'CS101', 'Introduction to Programming',            id FROM semesters WHERE name = '1st Semester';
INSERT IGNORE INTO modules (code, name, semester_id) SELECT 'MT101', 'Engineering Mathematics I',              id FROM semesters WHERE name = '1st Semester';

-- 2nd Semester
INSERT IGNORE INTO modules (code, name, semester_id) SELECT 'EE201', 'Electronics I',                         id FROM semesters WHERE name = '2nd Semester';
INSERT IGNORE INTO modules (code, name, semester_id) SELECT 'EE202', 'Network Analysis',                      id FROM semesters WHERE name = '2nd Semester';
INSERT IGNORE INTO modules (code, name, semester_id) SELECT 'CS201', 'Data Structures & Algorithms',          id FROM semesters WHERE name = '2nd Semester';
INSERT IGNORE INTO modules (code, name, semester_id) SELECT 'MT201', 'Engineering Mathematics II',             id FROM semesters WHERE name = '2nd Semester';

-- 3rd Semester
INSERT IGNORE INTO modules (code, name, semester_id) SELECT 'EE301', 'Electronics II',                        id FROM semesters WHERE name = '3rd Semester';
INSERT IGNORE INTO modules (code, name, semester_id) SELECT 'EE302', 'Digital Logic Design',                  id FROM semesters WHERE name = '3rd Semester';
INSERT IGNORE INTO modules (code, name, semester_id) SELECT 'EE303', 'Signals & Systems',                     id FROM semesters WHERE name = '3rd Semester';
INSERT IGNORE INTO modules (code, name, semester_id) SELECT 'CS301', 'Computer Architecture',                 id FROM semesters WHERE name = '3rd Semester';

-- 4th Semester
INSERT IGNORE INTO modules (code, name, semester_id) SELECT 'EE401', 'Microprocessors & Embedded Systems',    id FROM semesters WHERE name = '4th Semester';
INSERT IGNORE INTO modules (code, name, semester_id) SELECT 'EE402', 'Electromagnetic Fields & Waves',        id FROM semesters WHERE name = '4th Semester';
INSERT IGNORE INTO modules (code, name, semester_id) SELECT 'EE403', 'Power Electronics',                     id FROM semesters WHERE name = '4th Semester';
INSERT IGNORE INTO modules (code, name, semester_id) SELECT 'CS401', 'Database Systems',                      id FROM semesters WHERE name = '4th Semester';

-- 5th Semester
INSERT IGNORE INTO modules (code, name, semester_id) SELECT 'EE501', 'Control Systems',                       id FROM semesters WHERE name = '5th Semester';
INSERT IGNORE INTO modules (code, name, semester_id) SELECT 'EE502', 'Communication Systems',                 id FROM semesters WHERE name = '5th Semester';
INSERT IGNORE INTO modules (code, name, semester_id) SELECT 'EE503', 'Digital Signal Processing',             id FROM semesters WHERE name = '5th Semester';
INSERT IGNORE INTO modules (code, name, semester_id) SELECT 'CS501', 'Computer Networks',                     id FROM semesters WHERE name = '5th Semester';

-- 6th Semester
INSERT IGNORE INTO modules (code, name, semester_id) SELECT 'EE601', 'Renewable Energy Systems',              id FROM semesters WHERE name = '6th Semester';
INSERT IGNORE INTO modules (code, name, semester_id) SELECT 'EE602', 'Power Systems Analysis',                id FROM semesters WHERE name = '6th Semester';
INSERT IGNORE INTO modules (code, name, semester_id) SELECT 'EE603', 'Advanced Communication Systems',        id FROM semesters WHERE name = '6th Semester';
INSERT IGNORE INTO modules (code, name, semester_id) SELECT 'CS601', 'Network Security',                      id FROM semesters WHERE name = '6th Semester';
INSERT IGNORE INTO modules (code, name, semester_id) SELECT 'EE604', 'Instrumentation & Measurement',         id FROM semesters WHERE name = '6th Semester';
INSERT IGNORE INTO modules (code, name, semester_id) SELECT 'EE605', 'VLSI Design',                           id FROM semesters WHERE name = '6th Semester';

-- 7th Semester
INSERT IGNORE INTO modules (code, name, semester_id) SELECT 'EE701', 'Advanced Power Systems',                id FROM semesters WHERE name = '7th Semester';
INSERT IGNORE INTO modules (code, name, semester_id) SELECT 'EE702', 'Wireless Communications',               id FROM semesters WHERE name = '7th Semester';
INSERT IGNORE INTO modules (code, name, semester_id) SELECT 'EE703', 'Robotics & Automation',                 id FROM semesters WHERE name = '7th Semester';
INSERT IGNORE INTO modules (code, name, semester_id) SELECT 'CS701', 'Machine Learning for Engineers',        id FROM semesters WHERE name = '7th Semester';

-- 8th Semester
INSERT IGNORE INTO modules (code, name, semester_id) SELECT 'EE801', 'Final Year Project I',                  id FROM semesters WHERE name = '8th Semester';
INSERT IGNORE INTO modules (code, name, semester_id) SELECT 'EE802', 'Smart Grid Technologies',               id FROM semesters WHERE name = '8th Semester';
INSERT IGNORE INTO modules (code, name, semester_id) SELECT 'EE803', 'IoT & Edge Computing',                  id FROM semesters WHERE name = '8th Semester';

-- R&D
INSERT IGNORE INTO modules (code, name, semester_id) SELECT 'RD001', 'Independent Research Project',          id FROM semesters WHERE name = 'R&D';
INSERT IGNORE INTO modules (code, name, semester_id) SELECT 'RD002', 'Capstone Engineering Project',          id FROM semesters WHERE name = 'R&D';
INSERT IGNORE INTO modules (code, name, semester_id) SELECT 'RD003', 'Industrial Internship Project',         id FROM semesters WHERE name = 'R&D';

-- ============================================================
-- LAB SESSIONS — 6th Semester modules (full detail for demo)
-- ============================================================

-- EE601: Renewable Energy Systems
INSERT IGNORE INTO lab_sessions (module_id, title, description, scheduled_date, duration_hours, status)
SELECT m.id,
  'Lab 1: Solar Panel I-V Characteristics',
  'Measure and plot the I-V and P-V curves of a photovoltaic panel under varying irradiance conditions. Use the variable load and digital multimeters to capture data points.',
  '2025-01-15', 3.0, 'COMPLETED'
FROM modules m WHERE m.code = 'EE601';

INSERT IGNORE INTO lab_sessions (module_id, title, description, scheduled_date, duration_hours, status)
SELECT m.id,
  'Lab 2: Wind Turbine Power Coefficient',
  'Investigate the relationship between wind speed and power output. Plot the power coefficient Cp vs tip-speed ratio (TSR) curve for the laboratory wind turbine model.',
  '2025-01-29', 3.0, 'COMPLETED'
FROM modules m WHERE m.code = 'EE601';

INSERT IGNORE INTO lab_sessions (module_id, title, description, scheduled_date, duration_hours, status)
SELECT m.id,
  'Lab 3: DC-DC Converter for Energy Harvesting',
  'Design and test a buck-boost converter circuit to interface a solar panel with a battery storage system. Measure efficiency at different duty cycles.',
  '2025-02-12', 3.0, 'COMPLETED'
FROM modules m WHERE m.code = 'EE601';

INSERT IGNORE INTO lab_sessions (module_id, title, description, scheduled_date, duration_hours, status)
SELECT m.id,
  'Lab 4: Battery Energy Storage Systems',
  'Characterise lithium-ion battery cells using charge/discharge cycles. Calculate capacity fade and internal resistance using electrochemical impedance spectroscopy (EIS).',
  '2025-02-26', 3.0, 'UPCOMING'
FROM modules m WHERE m.code = 'EE601';

INSERT IGNORE INTO lab_sessions (module_id, title, description, scheduled_date, duration_hours, status)
SELECT m.id,
  'Lab 5: Grid-Tie Inverter Operation',
  'Commission a grid-tie inverter with a simulated PV array. Observe MPPT operation, anti-islanding protection, and power factor control using the power analyser.',
  '2025-03-12', 3.0, 'UPCOMING'
FROM modules m WHERE m.code = 'EE601';

-- EE602: Power Systems Analysis
INSERT IGNORE INTO lab_sessions (module_id, title, description, scheduled_date, duration_hours, status)
SELECT m.id, 'Lab 1: Power Factor Measurement & Correction',
  'Measure power factor of inductive and capacitive loads. Design and install capacitor banks to correct lagging power factor to near unity.',
  '2025-01-16', 3.0, 'COMPLETED' FROM modules m WHERE m.code = 'EE602';

INSERT IGNORE INTO lab_sessions (module_id, title, description, scheduled_date, duration_hours, status)
SELECT m.id, 'Lab 2: Transformer Characteristics',
  'Perform open-circuit and short-circuit tests on a single-phase transformer. Determine equivalent circuit parameters and calculate efficiency.',
  '2025-01-30', 3.0, 'COMPLETED' FROM modules m WHERE m.code = 'EE602';

INSERT IGNORE INTO lab_sessions (module_id, title, description, scheduled_date, duration_hours, status)
SELECT m.id, 'Lab 3: Three-Phase Power Measurement',
  'Use two-wattmeter and three-wattmeter methods to measure three-phase power. Compare balanced and unbalanced load conditions.',
  '2025-02-13', 3.0, 'UPCOMING' FROM modules m WHERE m.code = 'EE602';

INSERT IGNORE INTO lab_sessions (module_id, title, description, scheduled_date, duration_hours, status)
SELECT m.id, 'Lab 4: Synchronous Generator Load Characteristics',
  'Study the effect of varying field excitation on terminal voltage and power angle of a synchronous generator under different load conditions.',
  '2025-02-27', 3.0, 'UPCOMING' FROM modules m WHERE m.code = 'EE602';

-- EE603: Advanced Communication Systems
INSERT IGNORE INTO lab_sessions (module_id, title, description, scheduled_date, duration_hours, status)
SELECT m.id, 'Lab 1: AM & FM Modulation/Demodulation',
  'Generate AM and FM signals using signal generators. Demodulate using envelope detector and PLL respectively. Measure modulation index and frequency deviation.',
  '2025-01-17', 3.0, 'COMPLETED' FROM modules m WHERE m.code = 'EE603';

INSERT IGNORE INTO lab_sessions (module_id, title, description, scheduled_date, duration_hours, status)
SELECT m.id, 'Lab 2: Digital Modulation — ASK, FSK, PSK',
  'Implement and observe ASK, FSK, and BPSK digital modulation schemes. Measure BER performance under AWGN channel conditions using the vector signal analyser.',
  '2025-01-31', 3.0, 'COMPLETED' FROM modules m WHERE m.code = 'EE603';

INSERT IGNORE INTO lab_sessions (module_id, title, description, scheduled_date, duration_hours, status)
SELECT m.id, 'Lab 3: Spectrum Analysis & Channel Characterisation',
  'Use a spectrum analyser to measure occupied bandwidth, channel power, and adjacent channel leakage ratio (ACLR) for different modulation schemes.',
  '2025-02-14', 3.0, 'UPCOMING' FROM modules m WHERE m.code = 'EE603';

-- CS601: Network Security
INSERT IGNORE INTO lab_sessions (module_id, title, description, scheduled_date, duration_hours, status)
SELECT m.id, 'Lab 1: Network Scanning & Enumeration',
  'Use Nmap and Wireshark to perform network discovery and traffic analysis. Identify open ports, running services, and OS fingerprinting.',
  '2025-01-18', 3.0, 'COMPLETED' FROM modules m WHERE m.code = 'CS601';

INSERT IGNORE INTO lab_sessions (module_id, title, description, scheduled_date, duration_hours, status)
SELECT m.id, 'Lab 2: Firewall Configuration & Access Control Lists',
  'Configure iptables rules on a Linux gateway. Implement stateful packet inspection, DNAT, and SNAT. Test with controlled attack traffic.',
  '2025-02-01', 3.0, 'COMPLETED' FROM modules m WHERE m.code = 'CS601';

INSERT IGNORE INTO lab_sessions (module_id, title, description, scheduled_date, duration_hours, status)
SELECT m.id, 'Lab 3: VPN Setup & Encrypted Tunnels',
  'Set up an OpenVPN tunnel between two network nodes. Verify encryption, authentication, and compare throughput of plaintext vs encrypted channels.',
  '2025-02-15', 3.0, 'UPCOMING' FROM modules m WHERE m.code = 'CS601';

INSERT IGNORE INTO lab_sessions (module_id, title, description, scheduled_date, duration_hours, status)
SELECT m.id, 'Lab 4: Intrusion Detection Systems',
  'Deploy Snort IDS on a network segment. Write custom rules to detect port scans, DoS attacks, and protocol anomalies. Analyse generated alerts.',
  '2025-03-01', 3.0, 'UPCOMING' FROM modules m WHERE m.code = 'CS601';

-- EE604: Instrumentation & Measurement
INSERT IGNORE INTO lab_sessions (module_id, title, description, scheduled_date, duration_hours, status)
SELECT m.id, 'Lab 1: Sensor Calibration Techniques',
  'Calibrate temperature, pressure, and flow sensors against reference standards. Construct calibration curves and calculate measurement uncertainty.',
  '2025-01-19', 3.0, 'COMPLETED' FROM modules m WHERE m.code = 'EE604';

INSERT IGNORE INTO lab_sessions (module_id, title, description, scheduled_date, duration_hours, status)
SELECT m.id, 'Lab 2: Data Acquisition Systems (DAQ)',
  'Interface sensors to a National Instruments DAQ card. Program LabVIEW to acquire, display, and log real-time measurement data with appropriate filtering.',
  '2025-02-02', 3.0, 'COMPLETED' FROM modules m WHERE m.code = 'EE604';

INSERT IGNORE INTO lab_sessions (module_id, title, description, scheduled_date, duration_hours, status)
SELECT m.id, 'Lab 3: Oscilloscope Advanced Measurements',
  'Use advanced oscilloscope features: FFT analysis, protocol decoding (I2C/SPI/UART), and power measurements. Capture and analyse transient events.',
  '2025-02-16', 3.0, 'UPCOMING' FROM modules m WHERE m.code = 'EE604';

-- ============================================================
-- INVENTORY — Rich Equipment Dataset
-- ============================================================

-- ELECTRONICS LABORATORY
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-EL-0001', 'Digital Storage Oscilloscope',      'Measurement',  'Rigol DS1054Z',        'SN-EL-001', 'AVAILABLE' FROM labs l WHERE l.name = 'Electronics Laboratory';
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-EL-0002', 'Digital Storage Oscilloscope',      'Measurement',  'Rigol DS1054Z',        'SN-EL-002', 'AVAILABLE' FROM labs l WHERE l.name = 'Electronics Laboratory';
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-EL-0003', 'Digital Storage Oscilloscope',      'Measurement',  'Tektronix TDS2024C',   'SN-EL-003', 'AVAILABLE' FROM labs l WHERE l.name = 'Electronics Laboratory';
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-EL-0004', 'Digital Multimeter',                'Measurement',  'Fluke 87V',            'SN-EL-004', 'AVAILABLE' FROM labs l WHERE l.name = 'Electronics Laboratory';
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-EL-0005', 'Digital Multimeter',                'Measurement',  'UNI-T UT61E',          'SN-EL-005', 'AVAILABLE' FROM labs l WHERE l.name = 'Electronics Laboratory';
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-EL-0006', 'Digital Multimeter',                'Measurement',  'UNI-T UT61E',          'SN-EL-006', 'BORROWED'  FROM labs l WHERE l.name = 'Electronics Laboratory';
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-EL-0007', 'Function / Signal Generator',       'Signal Source', 'Rigol DG1022Z',       'SN-EL-007', 'AVAILABLE' FROM labs l WHERE l.name = 'Electronics Laboratory';
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-EL-0008', 'Function / Signal Generator',       'Signal Source', 'Rigol DG1022Z',       'SN-EL-008', 'AVAILABLE' FROM labs l WHERE l.name = 'Electronics Laboratory';
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-EL-0009', 'DC Power Supply (Triple Output)',    'Power Supply',  'Rigol DP832',         'SN-EL-009', 'AVAILABLE' FROM labs l WHERE l.name = 'Electronics Laboratory';
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-EL-0010', 'DC Power Supply (Triple Output)',    'Power Supply',  'Rigol DP832',         'SN-EL-010', 'AVAILABLE' FROM labs l WHERE l.name = 'Electronics Laboratory';
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-EL-0011', 'DC Power Supply (Triple Output)',    'Power Supply',  'Rigol DP832',         'SN-EL-011', 'MAINTENANCE' FROM labs l WHERE l.name = 'Electronics Laboratory';
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-EL-0012', 'LCR Meter',                         'Measurement',   'Hioki IM3523',        'SN-EL-012', 'AVAILABLE' FROM labs l WHERE l.name = 'Electronics Laboratory';
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-EL-0013', 'Soldering Station',                  'Assembly',      'Hakko FX-951',        'SN-EL-013', 'AVAILABLE' FROM labs l WHERE l.name = 'Electronics Laboratory';
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-EL-0014', 'Soldering Station',                  'Assembly',      'Hakko FX-951',        'SN-EL-014', 'AVAILABLE' FROM labs l WHERE l.name = 'Electronics Laboratory';
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-EL-0015', 'Breadboard (830 tie-points)',        'Component',     'Generic',             'SN-EL-015', 'AVAILABLE' FROM labs l WHERE l.name = 'Electronics Laboratory';

-- POWER SYSTEMS LABORATORY
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-PS-0001', 'Digital Multimeter',                 'Measurement',  'Fluke 175',            'SN-PS-001', 'AVAILABLE' FROM labs l WHERE l.name = 'Power Systems Laboratory';
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-PS-0002', 'Clamp Meter',                        'Measurement',  'Fluke 376 FC',         'SN-PS-002', 'AVAILABLE' FROM labs l WHERE l.name = 'Power Systems Laboratory';
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-PS-0003', 'Clamp Meter',                        'Measurement',  'Fluke 376 FC',         'SN-PS-003', 'AVAILABLE' FROM labs l WHERE l.name = 'Power Systems Laboratory';
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-PS-0004', 'Power Quality Analyser',             'Analysis',     'Fluke 435-II',         'SN-PS-004', 'AVAILABLE' FROM labs l WHERE l.name = 'Power Systems Laboratory';
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-PS-0005', 'High Voltage Probe',                 'Probe',        'Tektronix P6139A',     'SN-PS-005', 'AVAILABLE' FROM labs l WHERE l.name = 'Power Systems Laboratory';
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-PS-0006', 'Oscilloscope (100MHz)',              'Measurement',  'Tektronix TDS2024C',   'SN-PS-006', 'OUT_OF_SERVICE' FROM labs l WHERE l.name = 'Power Systems Laboratory';
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-PS-0007', 'Variac (Variable Auto-Transformer)', 'Power Control', 'Powerstat 116',       'SN-PS-007', 'AVAILABLE' FROM labs l WHERE l.name = 'Power Systems Laboratory';
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-PS-0008', 'Variac (Variable Auto-Transformer)', 'Power Control', 'Powerstat 116',       'SN-PS-008', 'AVAILABLE' FROM labs l WHERE l.name = 'Power Systems Laboratory';
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-PS-0009', 'Single-Phase Transformer (1 kVA)',   'Component',     'In-House Built',      'SN-PS-009', 'AVAILABLE' FROM labs l WHERE l.name = 'Power Systems Laboratory';
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-PS-0010', 'Capacitor Bank (Power Factor Corr)', 'Component',     'In-House Built',      'SN-PS-010', 'AVAILABLE' FROM labs l WHERE l.name = 'Power Systems Laboratory';

-- COMMUNICATION LABORATORY
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-CM-0001', 'Spectrum Analyser',                  'RF Instrument', 'Rohde & Schwarz FSH8','SN-CM-001', 'AVAILABLE' FROM labs l WHERE l.name = 'Communication Laboratory';
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-CM-0002', 'RF Signal Generator',                'Signal Source', 'Keysight N5181A',     'SN-CM-002', 'BORROWED'  FROM labs l WHERE l.name = 'Communication Laboratory';
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-CM-0003', 'Vector Signal Analyser',             'Analysis',      'Keysight MXA N9020A', 'SN-CM-003', 'AVAILABLE' FROM labs l WHERE l.name = 'Communication Laboratory';
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-CM-0004', 'Software Defined Radio (SDR)',        'RF Instrument', 'USRP B210',           'SN-CM-004', 'AVAILABLE' FROM labs l WHERE l.name = 'Communication Laboratory';
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-CM-0005', 'Antenna (Yagi 2.4 GHz)',             'RF Antenna',    'Taoglas YS.08.0101',  'SN-CM-005', 'AVAILABLE' FROM labs l WHERE l.name = 'Communication Laboratory';
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-CM-0006', 'AM/FM Training Board',               'Training Kit',  'Scientech ST2101',    'SN-CM-006', 'AVAILABLE' FROM labs l WHERE l.name = 'Communication Laboratory';

-- SOFTWARE & COMPUTING LABORATORY
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-SW-0001', 'Raspberry Pi 4 Kit (8GB)',           'Computing',     'Raspberry Pi 4B',     'SN-SW-001', 'BORROWED'  FROM labs l WHERE l.name = 'Software & Computing Laboratory';
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-SW-0002', 'Raspberry Pi 4 Kit (8GB)',           'Computing',     'Raspberry Pi 4B',     'SN-SW-002', 'AVAILABLE' FROM labs l WHERE l.name = 'Software & Computing Laboratory';
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-SW-0003', 'Raspberry Pi 4 Kit (8GB)',           'Computing',     'Raspberry Pi 4B',     'SN-SW-003', 'AVAILABLE' FROM labs l WHERE l.name = 'Software & Computing Laboratory';
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-SW-0004', 'Arduino UNO Starter Kit',            'Microcontroller','Arduino UNO R3',     'SN-SW-004', 'AVAILABLE' FROM labs l WHERE l.name = 'Software & Computing Laboratory';
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-SW-0005', 'Arduino UNO Starter Kit',            'Microcontroller','Arduino UNO R3',     'SN-SW-005', 'AVAILABLE' FROM labs l WHERE l.name = 'Software & Computing Laboratory';
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-SW-0006', 'Arduino Mega 2560',                  'Microcontroller','Arduino Mega 2560',  'SN-SW-006', 'AVAILABLE' FROM labs l WHERE l.name = 'Software & Computing Laboratory';
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-SW-0007', 'USB Logic Analyser (24 MHz)',        'Debug Tool',    'Saleae Logic 8',      'SN-SW-007', 'AVAILABLE' FROM labs l WHERE l.name = 'Software & Computing Laboratory';
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-SW-0008', 'FPGA Development Board',             'Computing',     'Xilinx Basys 3',      'SN-SW-008', 'AVAILABLE' FROM labs l WHERE l.name = 'Software & Computing Laboratory';
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-SW-0009', 'FPGA Development Board',             'Computing',     'Xilinx Basys 3',      'SN-SW-009', 'BORROWED'  FROM labs l WHERE l.name = 'Software & Computing Laboratory';

-- MICROPROCESSOR LABORATORY
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-MP-0001', 'ARM Cortex-M4 Dev Board',           'Microcontroller','STM32F4 Discovery',  'SN-MP-001', 'AVAILABLE' FROM labs l WHERE l.name = 'Microprocessor Laboratory';
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-MP-0002', 'ARM Cortex-M4 Dev Board',           'Microcontroller','STM32F4 Discovery',  'SN-MP-002', 'AVAILABLE' FROM labs l WHERE l.name = 'Microprocessor Laboratory';
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-MP-0003', 'JTAG/SWD Debugger',                 'Debug Tool',    'Segger J-Link',       'SN-MP-003', 'AVAILABLE' FROM labs l WHERE l.name = 'Microprocessor Laboratory';
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-MP-0004', '8051 Microcontroller Training Board','Training Kit',  'Mazidi 8051 Kit',     'SN-MP-004', 'AVAILABLE' FROM labs l WHERE l.name = 'Microprocessor Laboratory';
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-MP-0005', 'ESP32 Development Board',           'Microcontroller','Espressif ESP32',     'SN-MP-005', 'AVAILABLE' FROM labs l WHERE l.name = 'Microprocessor Laboratory';

-- RENEWABLE ENERGY LABORATORY
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-RE-0001', 'PV Panel (10W Mono)',                'Solar',         'Sunpower SPR-10',     'SN-RE-001', 'AVAILABLE' FROM labs l WHERE l.name = 'Renewable Energy Laboratory';
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-RE-0002', 'PV Panel (10W Mono)',                'Solar',         'Sunpower SPR-10',     'SN-RE-002', 'AVAILABLE' FROM labs l WHERE l.name = 'Renewable Energy Laboratory';
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-RE-0003', 'Solar Irradiance Meter',            'Measurement',   'TES 1333R',           'SN-RE-003', 'AVAILABLE' FROM labs l WHERE l.name = 'Renewable Energy Laboratory';
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-RE-0004', 'MPPT Solar Charge Controller',      'Power Control', 'Victron BlueSolar',   'SN-RE-004', 'AVAILABLE' FROM labs l WHERE l.name = 'Renewable Energy Laboratory';
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-RE-0005', 'Grid-Tie Inverter (250W)',           'Power',         'SMA Sunny Boy',       'SN-RE-005', 'AVAILABLE' FROM labs l WHERE l.name = 'Renewable Energy Laboratory';
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-RE-0006', 'Li-ion Battery Pack (24V 20Ah)',     'Energy Storage','Pylontech US2000',    'SN-RE-006', 'AVAILABLE' FROM labs l WHERE l.name = 'Renewable Energy Laboratory';
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-RE-0007', 'DC Electronic Load',                 'Measurement',   'BK Precision 8510',  'SN-RE-007', 'AVAILABLE' FROM labs l WHERE l.name = 'Renewable Energy Laboratory';

-- NETWORK & SECURITY LABORATORY
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-NS-0001', 'Cisco Catalyst 2960 Switch',        'Networking',    'Cisco WS-C2960-24TT', 'SN-NS-001', 'AVAILABLE' FROM labs l WHERE l.name = 'Network & Security Laboratory';
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-NS-0002', 'Cisco Catalyst 2960 Switch',        'Networking',    'Cisco WS-C2960-24TT', 'SN-NS-002', 'AVAILABLE' FROM labs l WHERE l.name = 'Network & Security Laboratory';
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-NS-0003', 'Cisco 1941 Router',                 'Networking',    'Cisco CISCO1941/K9',  'SN-NS-003', 'AVAILABLE' FROM labs l WHERE l.name = 'Network & Security Laboratory';
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-NS-0004', 'Network Packet Analyser (Laptop)',  'Computing',     'Lenovo ThinkPad E15', 'SN-NS-004', 'BORROWED'  FROM labs l WHERE l.name = 'Network & Security Laboratory';
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-NS-0005', 'Wireless Access Point',             'Networking',    'Ubiquiti UAP-AC-PRO', 'SN-NS-005', 'AVAILABLE' FROM labs l WHERE l.name = 'Network & Security Laboratory';
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-NS-0006', 'Network Cable Tester',              'Test Tool',     'Fluke MicroScanner',  'SN-NS-006', 'AVAILABLE' FROM labs l WHERE l.name = 'Network & Security Laboratory';

-- CONTROL SYSTEMS LABORATORY
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-CS-0001', 'PID Controller Trainer',            'Training Kit',  'Feedback 33-110',     'SN-CS-001', 'AVAILABLE' FROM labs l WHERE l.name = 'Control Systems Laboratory';
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-CS-0002', 'DC Motor Speed Control Kit',        'Training Kit',  'TQ Educational TM100','SN-CS-002', 'AVAILABLE' FROM labs l WHERE l.name = 'Control Systems Laboratory';
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-CS-0003', 'Data Acquisition Card (USB)',       'DAQ',           'NI USB-6008',         'SN-CS-003', 'AVAILABLE' FROM labs l WHERE l.name = 'Control Systems Laboratory';
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-CS-0004', 'Data Acquisition Card (USB)',       'DAQ',           'NI USB-6008',         'SN-CS-004', 'AVAILABLE' FROM labs l WHERE l.name = 'Control Systems Laboratory';

-- UNDERGRADUATE RESEARCH LAB
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-UR-0001', '3D Printer',                        'Fabrication',   'Prusa i3 MK3S+',      'SN-UR-001', 'AVAILABLE' FROM labs l WHERE l.name = 'Undergraduate Research Lab';
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-UR-0002', 'Benchtop CNC Router',               'Fabrication',   'Sienci LongMill',     'SN-UR-002', 'AVAILABLE' FROM labs l WHERE l.name = 'Undergraduate Research Lab';
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-UR-0003', 'Mixed-Signal Oscilloscope',         'Measurement',   'Tektronix MDO3104',   'SN-UR-003', 'AVAILABLE' FROM labs l WHERE l.name = 'Undergraduate Research Lab';
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-UR-0004', 'Arbitrary Waveform Generator',      'Signal Source', 'Keysight 33600A',     'SN-UR-004', 'AVAILABLE' FROM labs l WHERE l.name = 'Undergraduate Research Lab';
INSERT IGNORE INTO inventory_items (lab_id, elabs_tag, name, category, model, serial_no, status)
SELECT l.id, 'ELABS-UR-0005', 'Drone Development Kit',             'Computing',     'DJI RoboMaster TT',   'SN-UR-005', 'AVAILABLE' FROM labs l WHERE l.name = 'Undergraduate Research Lab';
