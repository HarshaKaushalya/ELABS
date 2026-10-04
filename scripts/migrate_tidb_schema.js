const path = require("path");
const mysql = require(path.resolve(__dirname, "../packages/api/node_modules/mysql2/promise"));

async function run() {
  const conn = await mysql.createConnection({
    host: "gateway01.ap-northeast-1.prod.aws.tidbcloud.com",
    port: 4000,
    user: "2ffmxJwqJzvLcyd.root",
    password: "FRQ8ZiNDyQDSBLkR",
    database: "elabs",
    ssl: { rejectUnauthorized: false }
  });

  console.log("Connected to TiDB Cloud.");

  try {
    await conn.query("ALTER TABLE modules ADD COLUMN coordinator_name varchar(150), ADD COLUMN num_students int(11) DEFAULT 75");
    console.log("modules columns added");
  } catch (e) { console.log("modules notice:", e.message); }

  try {
    await conn.query("ALTER TABLE users ADD COLUMN must_change_password tinyint(1) DEFAULT 0");
    console.log("users must_change_password added");
  } catch (e) { console.log("users notice:", e.message); }

  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS student_profiles (
        user_id bigint(20) NOT NULL,
        reg_number varchar(30) NOT NULL,
        group_code varchar(20) DEFAULT NULL,
        semester int(11) DEFAULT 6,
        department varchar(80) DEFAULT 'Electrical and Information Engineering',
        must_change_password tinyint(1) DEFAULT 1,
        PRIMARY KEY (user_id),
        UNIQUE KEY reg_number (reg_number)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("student_profiles created");
  } catch (e) { console.log("student_profiles notice:", e.message); }

  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS module_practicals (
        id bigint(20) NOT NULL AUTO_INCREMENT,
        module_code varchar(20) NOT NULL,
        lab_number varchar(20) NOT NULL,
        lab_title varchar(255) DEFAULT NULL,
        equip_status enum('Working','Not Working','Under Maintenance') DEFAULT 'Working',
        num_sessions int(11) DEFAULT 0,
        notes text DEFAULT NULL,
        sort_order int(11) DEFAULT 0,
        PRIMARY KEY (id),
        UNIQUE KEY uq_module_lab (module_code, lab_number)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("module_practicals created");
  } catch (e) { console.log("module_practicals notice:", e.message); }

  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS user_semester_groups (
        user_id bigint(20) NOT NULL,
        semester_id int(11) NOT NULL,
        joined_at timestamp DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, semester_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("user_semester_groups created");
  } catch (e) { console.log("user_semester_groups notice:", e.message); }

  await conn.end();
  console.log("TiDB schema migration complete.");
}

run().catch(console.error);
