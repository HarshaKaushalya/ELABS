/**
 * Seed script: inserts 75 Semester 6 students with properly bcrypt-hashed passwords.
 * Run once: node packages/api/scripts/seed/insert_students.js
 * Reads students from the generated SQL data and inserts them via the DB connection.
 */

const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");
const path = require("path");

// Load .env from packages/api
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const students = [
  { reg: "EG/2022/4904", name: "Zaheer A.J.M.", group: "EE01" },
  { reg: "EG/2022/4905", name: "Aasif A.K.M.", group: "EE01" },
  { reg: "EG/2022/4907", name: "Abdullah A.R.", group: "EE01" },
  { reg: "EG/2022/4912", name: "Abeysinghe A.M.P.M.B.", group: "EE01" },
  { reg: "EG/2022/4914", name: "Abeysundara R.L.", group: "EE01" },
  { reg: "EG/2022/4916", name: "Adhikari A.M.I.S.", group: "EE01" },
  { reg: "EG/2022/4928", name: "Aluvihare S.D", group: "EE02" },
  { reg: "EG/2022/4929", name: "Amarakoon A.V.G.U.T.", group: "EE02" },
  { reg: "EG/2022/4942", name: "Aslam M.H.M.", group: "EE02" },
  { reg: "EG/2022/4944", name: "Atapattu G.T.", group: "EE02" },
  { reg: "EG/2022/4953", name: "Bandara M.G.N.M.", group: "EE02" },
  { reg: "EG/2022/4983", name: "Dassanayaka D.M.P.S.P.", group: "EE02" },
  { reg: "EG/2022/4985", name: "De Mal W.G.S.", group: "EE03" },
  { reg: "EG/2022/4992", name: "Devinda A.P.P.", group: "EE03" },
  { reg: "EG/2022/5003", name: "Dilhara K.K.V.R.", group: "EE03" },
  { reg: "EG/2022/5024", name: "Dulanjana K.A.P.", group: "EE03" },
  { reg: "EG/2022/5025", name: "Dulanjith D.M.K.S.", group: "EE03" },
  { reg: "EG/2022/5026", name: "Edirinayake E.M.G.I.U.", group: "EE03" },
  { reg: "EG/2022/5033", name: "Fernando T.H.T.", group: "EE04" },
  { reg: "EG/2022/5034", name: "Fernando H.D.S.D.", group: "EE04" },
  { reg: "EG/2022/5035", name: "Fernando K.S.P.", group: "EE04" },
  { reg: "EG/2022/5038", name: "Fernando M.A.P.", group: "EE04" },
  { reg: "EG/2022/5044", name: "Gamage W.A.I.A.", group: "EE04" },
  { reg: "EG/2022/5045", name: "Gamage D.L.S.D.", group: "EE04" },
  { reg: "EG/2022/5055", name: "Gunathilaka G.M.K.I.", group: "EE05" },
  { reg: "EG/2022/5058", name: "Gunathilaka W.H.T.S.", group: "EE05" },
  { reg: "EG/2022/5059", name: "Gunawardana M.M.S.H.", group: "EE05" },
  { reg: "EG/2022/5062", name: "Gunwardena G.M.H.V.", group: "EE05" },
  { reg: "EG/2022/5064", name: "Herath H.M.N.U.", group: "EE05" },
  { reg: "EG/2022/5067", name: "Herath H.M.S.C.", group: "EE05" },
  { reg: "EG/2022/5071", name: "Illangarathne M.A.S.M.", group: "EE06" },
  { reg: "EG/2022/5075", name: "Jayaratne H.M.N.C.", group: "EE06" },
  { reg: "EG/2022/5083", name: "Jayawardena S.A.S.P.", group: "EE06" },
  { reg: "EG/2022/5086", name: "Jayawardena R.M.N.M.", group: "EE06" },
  { reg: "EG/2022/5089", name: "Jayaweera J.M.D.H.", group: "EE06" },
  { reg: "EG/2022/5093", name: "Jayantha B.Y.", group: "EE06" },
  { reg: "EG/2022/5099", name: "Karunarathna K.M.A.J.", group: "EE07" },
  { reg: "EG/2022/5101", name: "Karunarathna M.G.L.R.", group: "EE07" },
  { reg: "EG/2022/5103", name: "Karunarathna M.G.S.S.", group: "EE07" },
  { reg: "EG/2022/5108", name: "Karunarathna W.S.N.", group: "EE07" },
  { reg: "EG/2022/5113", name: "Jayawickrama J.A.N.D.", group: "EE07" },
  { reg: "EG/2022/5118", name: "Kalhara C.K.", group: "EE07" },
  { reg: "EG/2022/5122", name: "Kapuwatta K.G.S.A.", group: "EE08" },
  { reg: "EG/2022/5126", name: "Kariyawasam K.H.A.S.", group: "EE08" },
  { reg: "EG/2022/5130", name: "Karunaratna K.A.D.S.", group: "EE08" },
  { reg: "EG/2022/5137", name: "Kavindya K.W.L.A.", group: "EE08" },
  { reg: "EG/2022/5141", name: "Keerthiratna K.G.R.B.", group: "EE08" },
  { reg: "EG/2022/5146", name: "Kishon J.B.", group: "EE08" },
  { reg: "EG/2022/5150", name: "Kodithuwakku K.A.P.U.", group: "EE09" },
  { reg: "EG/2022/5155", name: "Koshitha W.H.P.", group: "EE09" },
  { reg: "EG/2022/5163", name: "Liyanage P.M.T.N.", group: "EE09" },
  { reg: "EG/2022/5167", name: "Liyanage U.A.D.S.", group: "EE09" },
  { reg: "EG/2022/5170", name: "Liyanawaduge I.", group: "EE09" },
  { reg: "EG/2022/5175", name: "Madhushankha D.P.R.", group: "EE09" },
  { reg: "EG/2022/5180", name: "Mahagama M.G.S.C.", group: "EE10" },
  { reg: "EG/2022/5183", name: "Madushan D.", group: "EE10" },
  { reg: "EG/2022/5185", name: "Malshan J.K.S.I.", group: "EE10" },
  { reg: "EG/2022/5186", name: "Manodya G.P.", group: "EE10" },
  { reg: "EG/2022/5187", name: "Manthreerathnasekara H.A.S.S.", group: "EE10" },
  { reg: "EG/2022/5189", name: "Mathusalan J.", group: "EE10" },
  { reg: "EG/2022/5197", name: "Mihindukula M.P.N.S.", group: "EE11" },
  { reg: "EG/2022/5205", name: "Nandasena N.G.L.T.", group: "EE11" },
  { reg: "EG/2022/5210", name: "Naranpanawe N.P.S.M.", group: "EE11" },
  { reg: "EG/2022/5215", name: "Nimsara T.A.D.M.", group: "EE11" },
  { reg: "EG/2022/5219", name: "Nishantha H.M.G.S.", group: "EE11" },
  { reg: "EG/2022/5223", name: "Perera A.M.S.D.", group: "EE11" },
  { reg: "EG/2022/5232", name: "Perera K.G.N.N.", group: "EE12" },
  { reg: "EG/2022/5237", name: "Prasad T.P.S.", group: "EE12" },
  { reg: "EG/2022/5240", name: "Ranasinghe R.M.C.M.", group: "EE12" },
  { reg: "EG/2022/5247", name: "Rathnayaka R.M.I.T.", group: "EE12" },
  { reg: "EG/2022/5280", name: "Senevirathna H.M.S.S.", group: "EE12" },
  { reg: "EG/2022/5421", name: "Wijerathna S.S.M.", group: "EE12" },
  { reg: "EG/2022/5424", name: "Wijesinghe D.Y.C.", group: "EE12" },
  { reg: "EG/2022/5442", name: "Premarathna H.B.T.D.", group: "EE12" },
  { reg: "EG/2022/5443", name: "Jayathilaka W.M.T.K.", group: "EE12" },
  { reg: "EG/2022/5450", name: "Edirisooriya E.M.H.B.", group: "EE12" },
];

async function main() {
  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || "localhost",
    port: parseInt(process.env.MYSQL_PORT || "3306"),
    user: process.env.MYSQL_USER || "elabs",
    password: process.env.MYSQL_PASSWORD || "elabs_password",
    database: process.env.MYSQL_DATABASE || "elabs",
    namedPlaceholders: true,
    multipleStatements: true,
  });

  // Ensure tables exist
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password TINYINT(1) DEFAULT 0;
  `).catch(() => {});

  await pool.query(`
    CREATE TABLE IF NOT EXISTS student_profiles (
      user_id      BIGINT NOT NULL PRIMARY KEY,
      reg_number   VARCHAR(30) NOT NULL UNIQUE,
      group_code   VARCHAR(20),
      semester     INT DEFAULT 6,
      department   VARCHAR(80) DEFAULT 'Electrical and Information Engineering',
      must_change_password TINYINT(1) DEFAULT 1,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Ensure messages/notifications tables exist
  await pool.query(`
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
    CREATE TABLE IF NOT EXISTS message_recipients (
      message_id   BIGINT NOT NULL,
      user_id      BIGINT NOT NULL,
      is_read      TINYINT(1) DEFAULT 0,
      read_at      DATETIME NULL,
      PRIMARY KEY (message_id, user_id),
      FOREIGN KEY (message_id) REFERENCES broadcast_messages(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
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
  `).catch((e) => console.warn("Tables may already exist:", e.message));

  // Add indexes if missing
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);`).catch(() => {});
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read);`).catch(() => {});
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_timetable_group ON timetable_slots(group_code);`).catch(() => {});

  // Ensure timetable_slots exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS timetable_slots (
      id           BIGINT AUTO_INCREMENT PRIMARY KEY,
      session_date DATE NOT NULL,
      time_slot    VARCHAR(30) NOT NULL,
      module_code  VARCHAR(20) NOT NULL,
      lab_label    VARCHAR(20) NOT NULL,
      group_code   VARCHAR(20) NOT NULL,
      academic_year VARCHAR(20) DEFAULT '2025/2026'
    );
  `).catch(() => {});

  const pwHash = await bcrypt.hash("elabs2024", 10);
  console.log("Password hash generated");

  let inserted = 0;
  let skipped = 0;

  for (const s of students) {
    const regNum = s.reg.replace("EG/2022/", "");
    const emailPart = regNum.replace("/", "-").toLowerCase();
    const email = `eg${emailPart}@eng.ruh.ac.lk`;

    try {
      // Insert user
      const [result] = await pool.query(
        `INSERT IGNORE INTO users (index_no, full_name, email, password_hash, must_change_password, is_active)
         VALUES (:reg, :name, :email, :hash, 1, 1)`,
        { reg: s.reg, name: s.name, email, hash: pwHash }
      );

      let userId;
      if (result.affectedRows === 0) {
        // Already exists — get their id
        const [rows] = await pool.query(
          `SELECT id FROM users WHERE index_no = :reg`,
          { reg: s.reg }
        );
        userId = rows[0]?.id;
        skipped++;
      } else {
        userId = result.insertId;
        inserted++;
      }

      if (!userId) continue;

      // Assign STUDENT role
      await pool.query(
        `INSERT IGNORE INTO user_roles (user_id, role_id)
         SELECT :uid, id FROM roles WHERE name = 'STUDENT' LIMIT 1`,
        { uid: userId }
      );

      // Create student profile
      await pool.query(
        `INSERT INTO student_profiles (user_id, reg_number, group_code, semester, must_change_password)
         VALUES (:uid, :reg, :group, 6, 1)
         ON DUPLICATE KEY UPDATE group_code = :group`,
        { uid: userId, reg: s.reg, group: s.group }
      );

    } catch (err) {
      console.error(`Error inserting ${s.reg}:`, err.message);
    }
  }

  // Insert modules
  const modules = [
    { code: "EE6207", name: "Digital Signal Processing" },
    { code: "EE6301", name: "Computer Network" },
    { code: "EE6302", name: "Control System Design" },
    { code: "EE6309", name: "Renewable Energy System (TE)" },
    { code: "EE6210", name: "Wireless and Mobile Communications (TE)" },
  ];
  await pool.query(`INSERT IGNORE INTO semesters (id, name, level) VALUES (6, 'Semester 6', 6)`).catch(() => {});
  for (const m of modules) {
    await pool.query(
      `INSERT IGNORE INTO modules (code, name, semester_id) VALUES (:code, :name, 6)`,
      m
    ).catch(() => {});
  }

  // Insert timetable
  const timetable = [
    { date: "2026-05-06", time: "08.30AM - 11.30AM", module: "EE6302", lab: "Lab1", groups: ["EE07","EE08"] },
    { date: "2026-05-08", time: "1.30PM - 4.30PM",   module: "EE6301", lab: "Lab1", groups: ["EE01","EE02"] },
    { date: "2026-05-08", time: "1.30PM - 4.30PM",   module: "EE6301", lab: "Lab2", groups: ["EE01","EE02"] },
    { date: "2026-05-08", time: "1.30PM - 4.30PM",   module: "EE6302", lab: "Lab1", groups: ["EE05","EE06"] },
    { date: "2026-05-11", time: "2.30PM - 4.30PM",   module: "EE6302", lab: "Lab1", groups: ["EE11","EE12"] },
    { date: "2026-05-13", time: "08.30AM - 11.30AM", module: "EE6301", lab: "Lab1", groups: ["EE03","EE04"] },
    { date: "2026-05-13", time: "08.30AM - 11.30AM", module: "EE6301", lab: "Lab2", groups: ["EE03","EE04"] },
    { date: "2026-05-13", time: "08.30AM - 11.30AM", module: "EE6302", lab: "Lab1", groups: ["EE09","EE10"] },
    { date: "2026-05-15", time: "1.30PM - 4.30PM",   module: "EE6302", lab: "Lab1", groups: ["EE03","EE04"] },
    { date: "2026-05-18", time: "2.30PM - 4.30PM",   module: "EE6302", lab: "Lab1", groups: ["EE01","EE02"] },
    { date: "2026-05-20", time: "08.30AM - 11.30AM", module: "EE6301", lab: "Lab1", groups: ["EE05","EE06"] },
    { date: "2026-05-20", time: "08.30AM - 11.30AM", module: "EE6301", lab: "Lab2", groups: ["EE05","EE06"] },
    { date: "2026-05-20", time: "08.30AM - 11.30AM", module: "EE6302", lab: "Lab2", groups: ["EE07","EE08"] },
    { date: "2026-05-20", time: "08.30AM - 11.30AM", module: "EE6309", lab: "Lab1", groups: ["RE01","RE02","R03"] },
    { date: "2026-05-22", time: "1.30PM - 4.30PM",   module: "EE6301", lab: "Lab1", groups: ["EE09","EE10"] },
    { date: "2026-05-22", time: "1.30PM - 4.30PM",   module: "EE6301", lab: "Lab2", groups: ["EE09","EE10"] },
    { date: "2026-05-22", time: "1.30PM - 4.30PM",   module: "EE6302", lab: "Lab2", groups: ["EE05","EE06"] },
    { date: "2026-05-22", time: "1.30PM - 4.30PM",   module: "EE6309", lab: "Lab1", groups: ["RE06","RE10","RE11"] },
    { date: "2026-05-27", time: "08.30AM - 11.30AM", module: "EE6301", lab: "Lab1", groups: ["EE11","EE12"] },
    { date: "2026-05-27", time: "08.30AM - 11.30AM", module: "EE6301", lab: "Lab2", groups: ["EE11","EE12"] },
    { date: "2026-05-27", time: "08.30AM - 11.30AM", module: "EE6302", lab: "Lab2", groups: ["EE03","EE04"] },
    { date: "2026-06-03", time: "08.30AM - 11.30AM", module: "EE6301", lab: "Lab1", groups: ["EE07","EE08"] },
    { date: "2026-06-03", time: "08.30AM - 11.30AM", module: "EE6301", lab: "Lab2", groups: ["EE07","EE08"] },
    { date: "2026-06-03", time: "08.30AM - 11.30AM", module: "EE6302", lab: "Lab2", groups: ["EE09","EE10"] },
    { date: "2026-06-05", time: "1.30PM - 4.30PM",   module: "EE6309", lab: "Lab1", groups: ["RE04","RE05","RE06"] },
    { date: "2026-06-10", time: "08.30AM - 11.30AM", module: "EE6302", lab: "Lab2", groups: ["EE11","EE12"] },
    { date: "2026-06-12", time: "1.30PM - 4.30PM",   module: "EE6302", lab: "Lab2", groups: ["EE01","EE02"] },
    { date: "2026-06-24", time: "08.30AM - 11.30AM", module: "EE6302", lab: "Lab3", groups: ["EE03","EE04"] },
    { date: "2026-06-24", time: "08.30AM - 11.30AM", module: "EE6309", lab: "Lab1", groups: ["RE05","REE07","RE08"] },
    { date: "2026-06-26", time: "1.30PM - 4.30PM",   module: "EE6302", lab: "Lab3", groups: ["EE01","EE02"] },
    { date: "2026-06-26", time: "1.30PM - 4.30PM",   module: "EE6309", lab: "Lab1", groups: ["RE04","RE09"] },
    { date: "2026-07-01", time: "08.30AM - 11.30AM", module: "EE6302", lab: "Lab3", groups: ["EE11","EE12"] },
    { date: "2026-07-03", time: "1.30PM - 4.30PM",   module: "EE6302", lab: "Lab3", groups: ["EE09","EE10"] },
    { date: "2026-07-08", time: "08.30AM - 11.30AM", module: "EE6302", lab: "Lab3", groups: ["EE07","EE08"] },
    { date: "2026-07-10", time: "1.30PM - 4.30PM",   module: "EE6302", lab: "Lab3", groups: ["EE05","EE06"] },
  ];

  await pool.query(`DELETE FROM timetable_slots WHERE academic_year = '2025/2026'`).catch(() => {});
  for (const e of timetable) {
    for (const grp of e.groups) {
      await pool.query(
        `INSERT INTO timetable_slots (session_date, time_slot, module_code, lab_label, group_code, academic_year)
         VALUES (:date, :time, :module, :lab, :group, '2025/2026')`,
        { date: e.date, time: e.time, module: e.module, lab: e.lab, group: grp }
      ).catch((err) => console.warn("timetable insert warn:", err.message));
    }
  }

  await pool.end();

  console.log(`\n[SUCCESS] Done!`);
  console.log(`   Inserted: ${inserted} new students`);
  console.log(`   Skipped (already existed): ${skipped}`);
  console.log(`   Timetable entries seeded: ${timetable.reduce((s, e) => s + e.groups.length, 0)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
