import { pool } from "./src/db/mysql";

async function migrate() {
  console.log("Running assessment system migration...");

  // assignments
  await pool.query(`
    CREATE TABLE IF NOT EXISTS assignments (
      id            BIGINT AUTO_INCREMENT PRIMARY KEY,
      module_id     BIGINT NOT NULL,
      title         VARCHAR(255) NOT NULL,
      type          ENUM('REPORT','PRE_LAB','OTHER') NOT NULL DEFAULT 'REPORT',
      description   TEXT,
      opened_at     DATETIME,
      due_at        DATETIME,
      max_score     DECIMAL(6,2) DEFAULT 100,
      created_by    BIGINT NOT NULL,
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      KEY idx_asgn_module (module_id)
    )
  `);
  console.log("✓ assignments table");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS assignment_submissions (
      id              BIGINT AUTO_INCREMENT PRIMARY KEY,
      assignment_id   BIGINT NOT NULL,
      student_id      BIGINT NOT NULL,
      file_url        VARCHAR(600),
      file_name       VARCHAR(255),
      submitted_at    DATETIME DEFAULT NOW(),
      score           DECIMAL(6,2),
      graded_by       BIGINT,
      graded_at       DATETIME,
      feedback        TEXT,
      UNIQUE KEY uq_sub (assignment_id, student_id),
      KEY idx_sub_assignment (assignment_id),
      KEY idx_sub_student (student_id)
    )
  `);
  console.log("✓ assignment_submissions table");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS quizzes (
      id              BIGINT AUTO_INCREMENT PRIMARY KEY,
      module_id       BIGINT NOT NULL,
      title           VARCHAR(255) NOT NULL,
      description     TEXT,
      time_limit_mins INT DEFAULT 30,
      opened_at       DATETIME,
      closed_at       DATETIME,
      max_attempts    INT DEFAULT 1,
      shuffle_questions TINYINT(1) DEFAULT 1,
      created_by      BIGINT NOT NULL,
      created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      KEY idx_quiz_module (module_id)
    )
  `);
  console.log("✓ quizzes table");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS quiz_questions (
      id              BIGINT AUTO_INCREMENT PRIMARY KEY,
      quiz_id         BIGINT NOT NULL,
      question_text   TEXT NOT NULL,
      type            ENUM('MCQ','SHORT') NOT NULL DEFAULT 'MCQ',
      options         JSON,
      correct_answer  VARCHAR(2000),
      points          DECIMAL(6,2) DEFAULT 1,
      sort_order      INT DEFAULT 0,
      KEY idx_qq_quiz (quiz_id)
    )
  `);
  console.log("✓ quiz_questions table");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS quiz_attempts (
      id              BIGINT AUTO_INCREMENT PRIMARY KEY,
      quiz_id         BIGINT NOT NULL,
      student_id      BIGINT NOT NULL,
      started_at      DATETIME DEFAULT NOW(),
      submitted_at    DATETIME,
      score           DECIMAL(6,2),
      max_score       DECIMAL(6,2),
      attempt_number  INT DEFAULT 1,
      KEY idx_qa_quiz (quiz_id),
      KEY idx_qa_student (student_id)
    )
  `);
  console.log("✓ quiz_attempts table");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS quiz_answers (
      id              BIGINT AUTO_INCREMENT PRIMARY KEY,
      attempt_id      BIGINT NOT NULL,
      question_id     BIGINT NOT NULL,
      answer_text     VARCHAR(2000),
      is_correct      TINYINT(1),
      points_awarded  DECIMAL(6,2) DEFAULT 0,
      KEY idx_ans_attempt (attempt_id)
    )
  `);
  console.log("✓ quiz_answers table");

  // ── Seed demo data ──────────────────────────────────────────────────────────
  // Get module ID for EE6301
  const [mods] = await pool.query("SELECT id FROM modules WHERE code = 'EE6301' LIMIT 1") as any;
  const modId = mods[0]?.id;
  if (!modId) { console.log("Module EE6301 not found, skipping demo seed"); await pool.end(); process.exit(0); }

  // Get admin user id (created_by)
  const [admins] = await pool.query("SELECT id FROM users WHERE email = 'admin@elabs.local' LIMIT 1") as any;
  const adminId = admins[0]?.id ?? 1;

  // Check if demo quiz already exists
  const [existing] = await pool.query("SELECT id FROM quizzes WHERE module_id = :modId LIMIT 1", { modId }) as any;
  if (!existing[0]) {
    // Create demo assignments
    await pool.query(`
      INSERT INTO assignments (module_id, title, type, description, opened_at, due_at, max_score, created_by)
      VALUES
        (:modId, 'Lab 1 Report — VLAN Configuration', 'REPORT',
         'Submit a detailed lab report on your VLAN and Trunking configuration exercise. Include screenshots of your configuration, results, and analysis.',
         DATE_SUB(NOW(), INTERVAL 7 DAY), DATE_ADD(NOW(), INTERVAL 7 DAY), 100, :adminId),
        (:modId, 'Pre-Lab 2 — Routing Protocols', 'PRE_LAB',
         'Complete the pre-lab worksheet for Routing in a Network. Answer questions on RIP, OSPF, and static routing. Submit before attending the lab.',
         DATE_SUB(NOW(), INTERVAL 3 DAY), DATE_ADD(NOW(), INTERVAL 2 DAY), 20, :adminId),
        (:modId, 'Lab 2 Report — Routing in a Network', 'REPORT',
         'Submit your completed lab report for the routing experiment. Include your network topology diagrams, routing tables, and observations.',
         NOW(), DATE_ADD(NOW(), INTERVAL 14 DAY), 100, :adminId)
    `, { modId, adminId });
    console.log("✓ Demo assignments seeded for EE6301");

    // Create demo quiz
    const [qResult] = await pool.query(`
      INSERT INTO quizzes (module_id, title, description, time_limit_mins, opened_at, closed_at, max_attempts, shuffle_questions, created_by)
      VALUES (:modId, 'Quiz 1 — Computer Networking Fundamentals', 
              'This quiz covers OSI model, IP addressing, subnetting, routing protocols, and basic network troubleshooting concepts covered in weeks 1-3.',
              20, DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL 7 DAY), 2, 1, :adminId)
    `, { modId, adminId }) as any;
    const quizId = qResult.insertId;

    const questions = [
      {
        text: "Which layer of the OSI model is responsible for logical addressing and routing of packets?",
        options: ["Data Link Layer", "Network Layer", "Transport Layer", "Session Layer"],
        answer: "1",
        points: 2,
      },
      {
        text: "What is the default subnet mask for a Class B IP address?",
        options: ["255.0.0.0", "255.255.0.0", "255.255.255.0", "255.255.255.128"],
        answer: "1",
        points: 2,
      },
      {
        text: "Which routing protocol uses the Dijkstra's Shortest Path First algorithm?",
        options: ["RIP", "BGP", "OSPF", "EIGRP"],
        answer: "2",
        points: 3,
      },
      {
        text: "What does VLAN stand for?",
        options: ["Virtual Local Area Network", "Variable Length Access Node", "Verified LAN", "Virtual Link Access Network"],
        answer: "0",
        points: 2,
      },
      {
        text: "Which port does HTTP use by default?",
        options: ["21", "22", "80", "443"],
        answer: "2",
        points: 1,
      },
      {
        text: "In subnetting, how many usable hosts are available in a /28 network?",
        options: ["14", "16", "30", "254"],
        answer: "0",
        points: 3,
      },
      {
        text: "What is the purpose of the ARP protocol?",
        options: ["To assign IP addresses dynamically", "To map IP addresses to MAC addresses", "To resolve domain names to IP addresses", "To encrypt network traffic"],
        answer: "1",
        points: 2,
      },
      {
        text: "Which Cisco IOS command shows the routing table?",
        options: ["show ip route", "show arp", "show interfaces", "show ip protocols"],
        answer: "0",
        points: 2,
      },
      {
        text: "What is the maximum number of VLANs supported by the IEEE 802.1Q standard?",
        options: ["256", "1024", "4094", "65535"],
        answer: "2",
        points: 3,
      },
      {
        text: "Which protocol is used to prevent switching loops in a network?",
        options: ["RIP", "STP", "OSPF", "DHCP"],
        answer: "1",
        points: 2,
      },
    ];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      await pool.query(`
        INSERT INTO quiz_questions (quiz_id, question_text, type, options, correct_answer, points, sort_order)
        VALUES (:quizId, :text, 'MCQ', :options, :answer, :points, :order)
      `, {
        quizId,
        text: q.text,
        options: JSON.stringify(q.options),
        answer: q.answer,
        points: q.points,
        order: i,
      });
    }
    console.log(`✓ Demo quiz seeded for EE6301 with ${questions.length} questions (Quiz ID: ${quizId})`);
  } else {
    console.log("Demo quiz already exists, skipping seed");
  }

  console.log("\n✅ Migration complete!");
  process.exit(0);
}

migrate().catch(err => { console.error("Migration failed:", err); process.exit(1); });
