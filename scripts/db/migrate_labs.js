const path = require("path");
const mysql = require(path.resolve(__dirname, "../../packages/api/node_modules/mysql2/promise"));
require(path.resolve(__dirname, "../../packages/api/node_modules/dotenv")).config({
  path: path.resolve(__dirname, "../../packages/api/.env"),
});

const labsData = [
  [
    1,
    "Power Systems and High Voltage Laboratory",
    "Block C",
    "Ground Floor",
    "Covers high-voltage engineering and electrical power-system experiments. The department describes facilities for generating and measuring AC, DC and impulse voltages, along with partial-discharge and corona studies.",
    "High-voltage testing, insulation breakdown, surge-voltage measurement and power-system studies."
  ],
  [
    2,
    "Electric Machines and Power Electronics Laboratory",
    "Block C",
    "1st Floor",
    "Studies electrical machines, motor drives and power-electronic converters.",
    "AC and DC motor testing, torque and speed measurements, rectifiers, converters, inverter-based drives and motor control."
  ],
  [
    3,
    "Electronics and Measurement Laboratory",
    "Block A",
    "2nd Floor",
    "Supports analog and digital electronics, electrical measurements and instrumentation.",
    "Oscilloscopes, logic analysers, function generators, DC power supplies, FPGA development kits and electronic circuit testing."
  ],
  [
    4,
    "Communication and Systems Engineering Laboratory",
    "Block B",
    "1st Floor",
    "Supports practical learning in communication engineering and related systems.",
    "Communication-system experiments and signal-related studies."
  ],
  [
    5,
    "Information Engineering Laboratory",
    "Block C",
    "4th Floor",
    "The department describes networking facilities developed in collaboration with Cisco Networking Academy.",
    "Router and switch configuration, VLANs, trunking, routing and digital communication-related practicals."
  ],
  [
    6,
    "24 × 7 Undergraduate Development Project Laboratory",
    "Block D",
    "4th Floor",
    "A project workspace for undergraduate development and final-year projects. The website describes 16 workstations, soldering facilities, and cutting and drilling stations.",
    "16 workstations, soldering facilities, cutting and drilling stations, rapid prototyping and project development."
  ]
];

async function runMigration(name, config) {
  console.log(`\n========================================`);
  console.log(`Migrating ${name}...`);
  console.log(`========================================`);
  const conn = await mysql.createConnection(config);

  try {
    await conn.query("SET FOREIGN_KEY_CHECKS = 0");

    // Add description & facilities columns if missing
    const [cols] = await conn.query("SHOW COLUMNS FROM labs LIKE 'description'");
    if (cols.length === 0) {
      await conn.query("ALTER TABLE labs ADD COLUMN description TEXT");
      await conn.query("ALTER TABLE labs ADD COLUMN facilities TEXT");
      console.log("Added description and facilities columns to labs table.");
    }

    // Clear old labs and insert 6 official ones
    await conn.query("DELETE FROM labs");
    await conn.query("ALTER TABLE labs AUTO_INCREMENT = 1");

    for (const lab of labsData) {
      await conn.query(
        "INSERT INTO labs (id, name, location, floor, description, facilities) VALUES (?, ?, ?, ?, ?, ?)",
        lab
      );
    }
    console.log("Inserted 6 official laboratories into labs table.");

    // Update inventory items to map cleanly to the 6 laboratories
    await conn.query("UPDATE inventory_items SET lab_id = 1 WHERE elabs_tag LIKE 'ELABS-PS-%' OR elabs_tag LIKE 'ELABS-RE-%'");
    await conn.query("UPDATE inventory_items SET lab_id = 2 WHERE elabs_tag LIKE 'ELABS-CS-%' OR elabs_tag LIKE 'ELABS-EE-%'");
    await conn.query("UPDATE inventory_items SET lab_id = 3 WHERE elabs_tag LIKE 'ELABS-EL-%'");
    await conn.query("UPDATE inventory_items SET lab_id = 4 WHERE elabs_tag LIKE 'ELABS-CM-%' OR elabs_tag LIKE 'ELABS-TC-%'");
    await conn.query("UPDATE inventory_items SET lab_id = 5 WHERE elabs_tag LIKE 'ELABS-NS-%' OR elabs_tag LIKE 'ELABS-SW-%'");
    await conn.query("UPDATE inventory_items SET lab_id = 6 WHERE elabs_tag LIKE 'ELABS-MP-%' OR elabs_tag LIKE 'ELABS-UR-%'");

    // Fallbacks
    await conn.query("UPDATE inventory_items SET lab_id = 3 WHERE lab_id NOT IN (1, 2, 3, 4, 5, 6)");
    await conn.query("UPDATE attendance_records SET lab_id = 3 WHERE lab_id NOT IN (1, 2, 3, 4, 5, 6)");
    await conn.query("UPDATE barcode_events SET lab_id = 3 WHERE lab_id NOT IN (1, 2, 3, 4, 5, 6)");
    await conn.query("UPDATE borrow_transactions SET lab_id = 3 WHERE lab_id NOT IN (1, 2, 3, 4, 5, 6)");
    await conn.query("UPDATE module_labs SET lab_id = 3 WHERE lab_id NOT IN (1, 2, 3, 4, 5, 6)");
    await conn.query("UPDATE submissions SET lab_id = 3 WHERE lab_id NOT IN (1, 2, 3, 4, 5, 6)");

    await conn.query("SET FOREIGN_KEY_CHECKS = 1");

    const [labs] = await conn.query("SELECT id, name, location, floor FROM labs ORDER BY id");
    console.log("Current Labs in DB:");
    console.table(labs);

    const [counts] = await conn.query(`
      SELECT l.id, l.name, COUNT(i.id) AS totalItems
      FROM labs l
      LEFT JOIN inventory_items i ON i.lab_id = l.id
      GROUP BY l.id, l.name
      ORDER BY l.id
    `);
    console.log("Item count per lab:");
    console.table(counts);

    console.log(`[SUCCESS] ${name} migrated cleanly!`);
  } finally {
    await conn.end();
  }
}

async function main() {
  // 1. Local MariaDB
  const localConfig = {
    host: process.env.MYSQL_HOST || "127.0.0.1",
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "root",
    database: process.env.MYSQL_DATABASE || "elabs",
  };
  await runMigration("Local MariaDB", localConfig);

  // 2. Remote TiDB Cloud
  const tidbConfig = {
    host: "gateway01.ap-northeast-1.prod.aws.tidbcloud.com",
    port: 4000,
    user: "2ffmxJwqJzvLcyd.root",
    password: "FRQ8ZiNDyQDSBLkR",
    database: "elabs",
    ssl: { rejectUnauthorized: false }
  };
  await runMigration("Remote TiDB Cloud", tidbConfig);

  console.log("\nALL DATABASES SUCCESSFULLY MIGRATED TO THE 6 OFFICIAL LABORATORIES!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
