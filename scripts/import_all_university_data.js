const path = require("path");
const XLSX = require("xlsx");
const mysql = require(path.resolve(__dirname, "../packages/api/node_modules/mysql2/promise"));
const bcrypt = require(path.resolve(__dirname, "../packages/api/node_modules/bcrypt"));

// Database targets: 1) Local MariaDB, 2) TiDB Cloud Serverless
const DB_TARGETS = [
  {
    name: "Local MariaDB",
    config: {
      host: "localhost",
      port: 3306,
      user: "root",
      password: "root",
      database: "elabs",
    }
  },
  {
    name: "TiDB Cloud Serverless",
    config: {
      host: "gateway01.ap-northeast-1.prod.aws.tidbcloud.com",
      port: 4000,
      user: "2ffmxJwqJzvLcyd.root",
      password: "FRQ8ZiNDyQDSBLkR",
      database: "elabs",
      ssl: { rejectUnauthorized: false }
    }
  }
];

function generateEmail(regNo) {
  const match = regNo.match(/EG\/(\d{2,4})\/(\d{4})/i);
  if (!match) return regNo.toLowerCase().replace(/[^a-z0-9]/g, "") + "@engug.ruh.ac.lk";
  const year = match[1].slice(-2);
  const num = match[2];
  return `eg${year}${num}@engug.ruh.ac.lk`;
}

function parseStudentsFromSheet(filename, sheetName, defaultDept) {
  const wb = XLSX.readFile(filename);
  const ws = wb.Sheets[sheetName];
  if (!ws) return [];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
  const list = [];
  let currentGroup = "";

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;

    // Detect group code (e.g. EE01, CE01, RE01, ME01, PSA01)
    for (let c = 0; c < row.length; c++) {
      const val = String(row[c] || "").trim();
      if (/^[A-Z]{2,4}\d{2}$/i.test(val)) {
        currentGroup = val;
      }
    }

    // Detect Reg. No (e.g. EG/2022/4904)
    let regNo = null;
    let name = null;
    for (let c = 0; c < row.length; c++) {
      const val = String(row[c] || "").trim();
      if (/^EG\/\d{4}\/\d{4}$/i.test(val)) {
        regNo = val;
        // Search next non-empty string in row for full name
        for (let k = c + 1; k < row.length; k++) {
          const item = String(row[k] || "").trim();
          if (item && !/^[A-Z]{2,4}\d{2}$/i.test(item) && !/^\d+$/.test(item)) {
            name = item;
            break;
          }
        }
      }
    }

    if (regNo) {
      list.push({
        regNo,
        name: name || regNo,
        group: currentGroup,
        dept: defaultDept,
        source: `${filename} [${sheetName}]`
      });
    }
  }
  return list;
}

function parseAllStudents() {
  console.log("Parsing students from workbooks...");
  const eie5 = parseStudentsFromSheet("sheet2.xlsx", "Group list - EIE", "Electrical and Information Engineering");
  const com5 = parseStudentsFromSheet("sheet2.xlsx", "Group list - COM", "Computer Engineering");
  const eie6 = parseStudentsFromSheet("sheet1.xlsx", "Group list - EIE", "Electrical and Information Engineering");
  const psa5 = parseStudentsFromSheet("sheet2.xlsx", "Group list - EE5213 - EIE", "Electrical and Information Engineering");
  const re6  = parseStudentsFromSheet("sheet1.xlsx", "EE6309 Group list", "Electrical and Information Engineering");
  const me6  = parseStudentsFromSheet("sheet1.xlsx", "EE6211 Group list", "Electrical and Information Engineering");

  const studentMap = new Map();

  for (const s of [...com5, ...eie5, ...eie6, ...psa5, ...re6, ...me6]) {
    const reg = s.regNo;
    if (!studentMap.has(reg)) {
      studentMap.set(reg, {
        regNo: reg,
        name: s.name,
        dept: s.dept,
        email: generateEmail(reg),
        groups: [s.group].filter(Boolean),
        semesters: s.dept.includes("Electrical") ? [5, 6] : [5]
      });
    } else {
      const existing = studentMap.get(reg);
      if (s.name && s.name.length > existing.name.length && !existing.name.includes(".")) {
        // prefer fuller name if available
        existing.name = s.name;
      } else if (s.name && existing.name === existing.regNo) {
        existing.name = s.name;
      }
      if (s.group && !existing.groups.includes(s.group)) {
        existing.groups.push(s.group);
      }
    }
  }

  const students = Array.from(studentMap.values());
  console.log(`Parsed total ${students.length} unique students.`);
  return students;
}

function parseAllLabs() {
  return [
    // Semester 5 Modules & Practicals
    {
      moduleCode: "EE5305",
      moduleName: "Power Systems",
      semesterId: 5,
      coordinator: "Dr. Iromi Ranaweera",
      numStudents: 75,
      practicals: [
        { labNo: "Lab 1", title: "Measurement of Earth Resistance", status: "Working", sessions: 6 },
        { labNo: "Lab 2", title: "Load flow analysis", status: "Working", sessions: 1 },
        { labNo: "Lab 3", title: "Symmetrical faults and symmetrical components", status: "Working", sessions: 6 }
      ]
    },
    {
      moduleCode: "EE5201",
      moduleName: "Communication Systems",
      semesterId: 5,
      coordinator: "Dr. Thilina Weerasinghe",
      numStudents: 75,
      practicals: [
        { labNo: "Lab 1", title: "Transmission Line", status: "Working", sessions: 6 },
        { labNo: "Lab 2", title: "Measurements of Impedance and Impedance Matching", status: "Working", sessions: 6 }
      ]
    },
    {
      moduleCode: "EE5304",
      moduleName: "Power Electronics",
      semesterId: 5,
      coordinator: "Dr. Chandana Perera",
      numStudents: 75,
      practicals: [
        { labNo: "Lab 1", title: "Study on Single-Phase Thyristor Bridge Circuit", status: "Working", sessions: 6 },
        { labNo: "Lab 2", title: "Study on Three-Phase Thyristor Bridge Circuit", status: "Working", sessions: 6 },
        { labNo: "Lab 3", title: "Study on Single-Phase AC Voltage Controller", status: "Working", sessions: 6 },
        { labNo: "Lab 4", title: "Computer simulation on power electronic circuits", status: "Working", sessions: 1 }
      ]
    },
    {
      moduleCode: "EE5213",
      moduleName: "Power System Analysis (TE)",
      semesterId: 5,
      coordinator: "Dr. Anuradha Mudalige",
      numStudents: 54,
      practicals: [
        { labNo: "Lab 1", title: "Transmission line modelling", status: "Working", sessions: 6 },
        { labNo: "Lab 2", title: "Power system control (frequency, voltage) - simulation", status: "Working", sessions: 1 }
      ]
    },

    // Semester 6 Modules & Practicals
    {
      moduleCode: "EE6207",
      moduleName: "Digital Signal Processing",
      semesterId: 6,
      coordinator: "Dr. Kaveen Liyanage",
      numStudents: 75,
      practicals: [
        { labNo: "Lab 1", title: "Introduction to Complex Exponentials: Multipath", status: "Working", sessions: 1 },
        { labNo: "Lab 2", title: "Spectrograms: Harmonic Lines & Chirp Aliasing", status: "Working", sessions: 1 },
        { labNo: "Lab 3", title: "Filter Design & Frequency Analysis", status: "Working", sessions: 1 },
        { labNo: "Lab 4", title: "Real-time DSP Applications & Audio Effects", status: "Working", sessions: 1 }
      ]
    },
    {
      moduleCode: "EE6301",
      moduleName: "Computer Networks",
      semesterId: 6,
      coordinator: "Mr. T.N. Weerasinghe",
      numStudents: 75,
      practicals: [
        { labNo: "Lab 1", title: "Configuring VLANs and Trunking", status: "Working", sessions: 6 },
        { labNo: "Lab 2", title: "Configuring routing in a Network", status: "Working", sessions: 6 }
      ]
    },
    {
      moduleCode: "EE6302",
      moduleName: "Control System Design",
      semesterId: 6,
      coordinator: "Dr. K.M.I.U. Ranaweera",
      numStudents: 75,
      practicals: [
        { labNo: "Lab 1", title: "Closed loop control system", status: "Working", sessions: 6 },
        { labNo: "Lab 2", title: "Stability and effect of loop gain", status: "Working", sessions: 6 },
        { labNo: "Lab 3", title: "Root-locus design", status: "Working", sessions: 6 },
        { labNo: "Lab 4", title: "PI, PD and PID control", status: "Working", sessions: 6 }
      ]
    },
    {
      moduleCode: "EE6309",
      moduleName: "Renewable Energy System (TE)",
      semesterId: 6,
      coordinator: "Mr. Anuradha Mudalige",
      numStudents: 54,
      practicals: [
        { labNo: "Lab 1", title: "Wind Power System", status: "Working", sessions: 4 },
        { labNo: "Lab 2", title: "Solar Energy System", status: "Working", sessions: 4 },
        { labNo: "Lab 3", title: "Solar Thermal System", status: "Working", sessions: 4 },
        { labNo: "Lab 4", title: "Study on Fuel Cell Trainer", status: "Working", sessions: 4 }
      ]
    },
    {
      moduleCode: "EE6211",
      moduleName: "Wireless and Mobile Communications (TE)",
      semesterId: 6,
      coordinator: "Dr. W.N.B.A.G. Priyankara",
      numStudents: 24,
      practicals: [
        { labNo: "Lab 1", title: "Microwave Radio Link Investigations", status: "Working", sessions: 1 }
      ]
    }
  ];
}

async function syncTarget(target, students, modulesData, defaultPasswordHash) {
  console.log(`\n==================================================`);
  console.log(`Syncing Target Database: ${target.name}...`);
  console.log(`==================================================`);

  let conn;
  try {
    conn = await mysql.createConnection(target.config);
    console.log(`Connected to ${target.name} successfully.`);
  } catch (err) {
    console.error(`Failed to connect to ${target.name}:`, err.message);
    return;
  }

  try {
    // 1. Sync Modules
    console.log("Upserting modules...");
    for (const m of modulesData) {
      const [existing] = await conn.query("SELECT id FROM modules WHERE code = ?", [m.moduleCode]);
      if (existing.length > 0) {
        await conn.query(
          "UPDATE modules SET name = ?, semester_id = ?, coordinator_name = ?, num_students = ? WHERE code = ?",
          [m.moduleName, m.semesterId, m.coordinator, m.numStudents, m.moduleCode]
        );
      } else {
        await conn.query(
          "INSERT INTO modules (code, name, semester_id, coordinator_name, num_students) VALUES (?, ?, ?, ?, ?)",
          [m.moduleCode, m.moduleName, m.semesterId, m.coordinator, m.numStudents]
        );
      }

      // Upsert Practicals
      for (let i = 0; i < m.practicals.length; i++) {
        const p = m.practicals[i];
        const [pExist] = await conn.query(
          "SELECT id FROM module_practicals WHERE module_code = ? AND lab_number = ?",
          [m.moduleCode, p.labNo]
        );
        if (pExist.length > 0) {
          await conn.query(
            "UPDATE module_practicals SET lab_title = ?, equip_status = ?, num_sessions = ?, sort_order = ? WHERE id = ?",
            [p.title, p.status, p.sessions, i + 1, pExist[0].id]
          );
        } else {
          await conn.query(
            "INSERT INTO module_practicals (module_code, lab_number, lab_title, equip_status, num_sessions, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
            [m.moduleCode, p.labNo, p.title, p.status, p.sessions, i + 1]
          );
        }
      }
    }
    console.log(`Modules and practicals synced on ${target.name}.`);

    // 2. Sync Students
    console.log(`Importing ${students.length} students into ${target.name}...`);
    let insertedUsers = 0;
    let updatedUsers = 0;

    for (const s of students) {
      const primaryGroup = s.groups[0] || (s.dept.includes("Electrical") ? "EE01" : "CE01");
      const [userRows] = await conn.query("SELECT id FROM users WHERE email = ? OR index_no = ?", [s.email, s.regNo]);

      let userId;
      if (userRows.length > 0) {
        userId = userRows[0].id;
        await conn.query(
          "UPDATE users SET full_name = ?, index_no = ?, is_active = 1 WHERE id = ?",
          [s.name, s.regNo, userId]
        );
        updatedUsers++;
      } else {
        const [res] = await conn.query(
          `INSERT INTO users (index_no, full_name, email, password_hash, is_active, must_change_password, country, city, timezone)
           VALUES (?, ?, ?, ?, 1, 1, 'Sri Lanka', 'Galle', 'Asia/Colombo')`,
          [s.regNo, s.name, s.email, defaultPasswordHash]
        );
        userId = res.insertId;
        insertedUsers++;
      }

      // Ensure STUDENT role (role_id = 4)
      await conn.query("INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, 4)", [userId]);

      // Ensure student_profiles
      const [profRows] = await conn.query("SELECT user_id FROM student_profiles WHERE user_id = ?", [userId]);
      if (profRows.length > 0) {
        await conn.query(
          "UPDATE student_profiles SET reg_number = ?, group_code = ?, department = ?, semester = ? WHERE user_id = ?",
          [s.regNo, primaryGroup, s.dept, s.semesters[0], userId]
        );
      } else {
        await conn.query(
          `INSERT INTO student_profiles (user_id, reg_number, group_code, semester, department, must_change_password)
           VALUES (?, ?, ?, ?, ?, 1)`,
          [userId, s.regNo, primaryGroup, s.semesters[0], s.dept]
        );
      }

      // Ensure user_semester_groups
      for (const semId of s.semesters) {
        await conn.query("INSERT IGNORE INTO user_semester_groups (user_id, semester_id) VALUES (?, ?)", [userId, semId]);
      }
    }

    console.log(`Student sync complete on ${target.name}: ${insertedUsers} new inserted, ${updatedUsers} existing updated.`);

  } catch (err) {
    console.error(`Error during sync on ${target.name}:`, err);
  } finally {
    await conn.end();
  }
}

async function main() {
  console.log("Generating default bcrypt password hash for 'Student123!'...");
  const defaultPasswordHash = await bcrypt.hash("Student123!", 10);

  const students = parseAllStudents();
  const modulesData = parseAllLabs();

  for (const target of DB_TARGETS) {
    await syncTarget(target, students, modulesData, defaultPasswordHash);
  }

  console.log("\nALL UNIVERSITY DATA SUCCESSFULLY IMPORTED AND SYNCHRONIZED!");
}

main().catch(console.error);
