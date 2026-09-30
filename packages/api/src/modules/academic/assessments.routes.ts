/**
 * Assessment routes: Assignments + Quizzes + Submissions
 * Mounted at: /academic (via app.ts, already registered)
 */
import { Router } from "express";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import { AuthedRequest, requireAuth } from "../auth/auth.middleware";
import { requirePermission } from "../../rbac/requirePermission";
import { pool } from "../../db/mysql";

const router = Router();

// ─── File Upload Setup ────────────────────────────────────────────────────────
const uploadDir = path.join(process.cwd(), "uploads", "submissions");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename:    (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    const allowed = [".pdf", ".doc", ".docx", ".zip", ".png", ".jpg", ".jpeg"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error(`File type ${ext} not allowed`));
  },
});

// ─── Helper: check if user is admin/lecturer ──────────────────────────────────
async function isInstructor(userId: number): Promise<boolean> {
  const [rows] = await pool.query(
    `SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id
     WHERE ur.user_id = :userId AND r.name IN ('SYSTEM_ADMIN','LECTURER','LAB_INSTRUCTOR')
     LIMIT 1`,
    { userId }
  ) as any;
  return (rows as any[]).length > 0;
}

// ============================================================
// ASSIGNMENTS
// ============================================================

/** GET /academic/modules/:id/assignments */
router.get("/modules/:id/assignments", requireAuth, async (req: AuthedRequest, res) => {
  const moduleId = Number(req.params.id);
  const userId = req.user!.id;
  try {
    const [rows] = await pool.query(`
      SELECT a.id, a.title, a.type, a.description, a.opened_at AS openedAt,
             a.due_at AS dueAt, a.max_score AS maxScore, a.created_at AS createdAt,
             sub.id AS submissionId, sub.submitted_at AS submittedAt,
             sub.score, sub.file_name AS fileName, sub.file_url AS fileUrl,
             sub.graded_at AS gradedAt, sub.feedback
      FROM assignments a
      LEFT JOIN assignment_submissions sub ON sub.assignment_id = a.id AND sub.student_id = :userId
      WHERE a.module_id = :moduleId
      ORDER BY a.due_at ASC, a.created_at DESC
    `, { moduleId, userId });
    res.json({ assignments: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/** POST /academic/modules/:id/assignments — instructor creates assignment */
router.post("/modules/:id/assignments", requireAuth, requirePermission("admin:manage"), async (req: AuthedRequest, res) => {
  const moduleId = Number(req.params.id);
  try {
    const body = z.object({
      title:       z.string().min(1).max(255),
      type:        z.enum(["REPORT", "PRE_LAB", "OTHER"]).default("REPORT"),
      description: z.string().max(5000).optional(),
      openedAt:    z.string().optional(),
      dueAt:       z.string().optional(),
      maxScore:    z.number().min(0).max(1000).default(100),
    }).parse(req.body);

    const [result] = await pool.query(`
      INSERT INTO assignments (module_id, title, type, description, opened_at, due_at, max_score, created_by)
      VALUES (:moduleId, :title, :type, :description, :openedAt, :dueAt, :maxScore, :createdBy)
    `, {
      moduleId,
      title:       body.title,
      type:        body.type,
      description: body.description ?? null,
      openedAt:    body.openedAt ?? null,
      dueAt:       body.dueAt ?? null,
      maxScore:    body.maxScore,
      createdBy:   req.user!.id,
    }) as any;
    res.json({ id: result.insertId, moduleId, ...body });
  } catch (err) {
    res.status(400).json({ error: "Invalid request" });
  }
});

/** PATCH /academic/assignments/:id — update assignment */
router.patch("/assignments/:id", requireAuth, requirePermission("admin:manage"), async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  try {
    const body = z.object({
      title:       z.string().max(255).optional(),
      type:        z.enum(["REPORT", "PRE_LAB", "OTHER"]).optional(),
      description: z.string().max(5000).optional(),
      openedAt:    z.string().nullable().optional(),
      dueAt:       z.string().nullable().optional(),
      maxScore:    z.number().optional(),
    }).parse(req.body);

    await pool.query(`
      UPDATE assignments SET
        title       = COALESCE(:title, title),
        type        = COALESCE(:type, type),
        description = COALESCE(:description, description),
        opened_at   = COALESCE(:openedAt, opened_at),
        due_at      = COALESCE(:dueAt, due_at),
        max_score   = COALESCE(:maxScore, max_score)
      WHERE id = :id
    `, {
      id,
      title:       body.title ?? null,
      type:        body.type ?? null,
      description: body.description ?? null,
      openedAt:    body.openedAt ?? null,
      dueAt:       body.dueAt ?? null,
      maxScore:    body.maxScore ?? null,
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: "Invalid request" });
  }
});

/** DELETE /academic/assignments/:id */
router.delete("/assignments/:id", requireAuth, requirePermission("admin:manage"), async (req, res) => {
  const id = Number(req.params.id);
  await pool.query("DELETE FROM assignments WHERE id = :id", { id });
  res.json({ ok: true });
});

/** POST /academic/assignments/:id/submit — student submits file */
router.post("/assignments/:id/submit", requireAuth, upload.single("file"), async (req: AuthedRequest, res) => {
  const assignmentId = Number(req.params.id);
  const studentId = req.user!.id;
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const fileUrl = `/uploads/submissions/${req.file.filename}`;
    await pool.query(`
      INSERT INTO assignment_submissions (assignment_id, student_id, file_url, file_name, submitted_at)
      VALUES (:assignmentId, :studentId, :fileUrl, :fileName, NOW())
      ON DUPLICATE KEY UPDATE
        file_url     = VALUES(file_url),
        file_name    = VALUES(file_name),
        submitted_at = NOW(),
        score        = NULL,
        graded_by    = NULL,
        graded_at    = NULL,
        feedback     = NULL
    `, { assignmentId, studentId, fileUrl, fileName: req.file.originalname });
    res.json({ ok: true, fileUrl, fileName: req.file.originalname });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Submission failed" });
  }
});

/** GET /academic/assignments/:id/submissions — all submissions (instructor) */
router.get("/assignments/:id/submissions", requireAuth, async (req: AuthedRequest, res) => {
  const instructor = await isInstructor(req.user!.id);
  if (!instructor) return res.status(403).json({ error: "Forbidden" });
  const assignmentId = Number(req.params.id);
  try {
    const [asgn] = await pool.query(
      "SELECT id, title, type, max_score AS maxScore, due_at AS dueAt FROM assignments WHERE id = :id",
      { id: assignmentId }
    ) as any;
    const assignment = asgn[0];
    if (!assignment) return res.status(404).json({ error: "Assignment not found" });

    const [subs] = await pool.query(`
      SELECT s.id, s.submitted_at AS submittedAt, s.file_url AS fileUrl,
             s.file_name AS fileName, s.score, s.graded_at AS gradedAt,
             s.feedback,
             u.id AS studentId, u.full_name AS studentName, u.email AS studentEmail,
             sp.reg_number AS regNumber, sp.group_code AS groupCode
      FROM assignment_submissions s
      JOIN users u ON u.id = s.student_id
      LEFT JOIN student_profiles sp ON sp.user_id = u.id
      WHERE s.assignment_id = :assignmentId
      ORDER BY sp.group_code ASC, u.full_name ASC
    `, { assignmentId });
    res.json({ assignment, submissions: subs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/** PATCH /academic/submissions/:id/grade — grade a submission */
router.patch("/submissions/:id/grade", requireAuth, async (req: AuthedRequest, res) => {
  const instructor = await isInstructor(req.user!.id);
  if (!instructor) return res.status(403).json({ error: "Forbidden" });
  const id = Number(req.params.id);
  try {
    const body = z.object({
      score:    z.number().min(0).max(1000),
      feedback: z.string().max(2000).optional(),
    }).parse(req.body);
    await pool.query(`
      UPDATE assignment_submissions
      SET score = :score, feedback = :feedback, graded_by = :gradedBy, graded_at = NOW()
      WHERE id = :id
    `, { id, score: body.score, feedback: body.feedback ?? null, gradedBy: req.user!.id });
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: "Invalid request" });
  }
});

/** GET /academic/assignments/:id/export — Excel export of submissions */
router.get("/assignments/:id/export", requireAuth, async (req: AuthedRequest, res) => {
  const instructor = await isInstructor(req.user!.id);
  if (!instructor) return res.status(403).json({ error: "Forbidden" });
  const assignmentId = Number(req.params.id);
  try {
    const { default: XLSX } = await import("xlsx");
    const [asgn] = await pool.query(
      "SELECT title FROM assignments WHERE id = :id",
      { id: assignmentId }
    ) as any;
    const assignment = asgn[0];
    if (!assignment) return res.status(404).json({ error: "Not found" });

    const [subs] = await pool.query(`
      SELECT u.full_name AS Name, u.email AS Email,
             sp.reg_number AS 'Reg. No.', sp.group_code AS 'Group',
             s.submitted_at AS 'Submitted At', s.score AS Score,
             s.graded_at AS 'Graded At', s.feedback AS Feedback
      FROM assignment_submissions s
      JOIN users u ON u.id = s.student_id
      LEFT JOIN student_profiles sp ON sp.user_id = u.id
      WHERE s.assignment_id = :assignmentId
      ORDER BY sp.group_code, u.full_name
    `, { assignmentId }) as any;

    const ws = XLSX.utils.json_to_sheet(subs);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Submissions");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${assignment.title.replace(/[^a-z0-9]/gi, "_")}_submissions.xlsx"`);
    res.send(buf);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Export failed" });
  }
});

// ============================================================
// QUIZZES
// ============================================================

/** GET /academic/modules/:id/quizzes */
router.get("/modules/:id/quizzes", requireAuth, async (req: AuthedRequest, res) => {
  const moduleId = Number(req.params.id);
  const userId = req.user!.id;
  try {
    const [quizzes] = await pool.query(`
      SELECT q.id, q.title, q.description, q.time_limit_mins AS timeLimitMins,
             q.opened_at AS openedAt, q.closed_at AS closedAt,
             q.max_attempts AS maxAttempts, q.created_at AS createdAt,
             COUNT(DISTINCT qq.id) AS questionCount,
             SUM(COALESCE(qq.points, 0)) AS totalPoints,
             qa.id AS attemptId, qa.submitted_at AS attemptSubmittedAt,
             qa.score AS attemptScore, qa.max_score AS attemptMaxScore,
             qa.attempt_number AS attemptNumber
      FROM quizzes q
      LEFT JOIN quiz_questions qq ON qq.quiz_id = q.id
      LEFT JOIN quiz_attempts qa ON qa.quiz_id = q.id AND qa.student_id = :userId
        AND qa.attempt_number = (
          SELECT MAX(qa2.attempt_number) FROM quiz_attempts qa2
          WHERE qa2.quiz_id = q.id AND qa2.student_id = :userId
        )
      WHERE q.module_id = :moduleId
      GROUP BY q.id, qa.id
      ORDER BY q.opened_at DESC
    `, { moduleId, userId });
    res.json({ quizzes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/** POST /academic/modules/:id/quizzes — instructor creates quiz with questions */
router.post("/modules/:id/quizzes", requireAuth, requirePermission("admin:manage"), async (req: AuthedRequest, res) => {
  const moduleId = Number(req.params.id);
  try {
    const body = z.object({
      title:          z.string().min(1).max(255),
      description:    z.string().max(5000).optional(),
      timeLimitMins:  z.number().min(1).max(300).default(30),
      openedAt:       z.string().optional(),
      closedAt:       z.string().optional(),
      maxAttempts:    z.number().min(1).max(10).default(1),
      shuffleQuestions: z.boolean().default(true),
      questions: z.array(z.object({
        questionText: z.string().min(1),
        type:         z.enum(["MCQ", "SHORT"]).default("MCQ"),
        options:      z.array(z.string()).optional(),
        correctAnswer: z.string(),
        points:       z.number().min(0.5).default(1),
        sortOrder:    z.number().default(0),
      })).min(1),
    }).parse(req.body);

    const [qResult] = await pool.query(`
      INSERT INTO quizzes (module_id, title, description, time_limit_mins, opened_at, closed_at, max_attempts, shuffle_questions, created_by)
      VALUES (:moduleId, :title, :description, :timeLimitMins, :openedAt, :closedAt, :maxAttempts, :shuffle, :createdBy)
    `, {
      moduleId, title: body.title, description: body.description ?? null,
      timeLimitMins: body.timeLimitMins, openedAt: body.openedAt ?? null,
      closedAt: body.closedAt ?? null, maxAttempts: body.maxAttempts,
      shuffle: body.shuffleQuestions ? 1 : 0, createdBy: req.user!.id,
    }) as any;
    const quizId = qResult.insertId;

    for (const [i, q] of body.questions.entries()) {
      await pool.query(`
        INSERT INTO quiz_questions (quiz_id, question_text, type, options, correct_answer, points, sort_order)
        VALUES (:quizId, :text, :type, :options, :answer, :points, :order)
      `, {
        quizId, text: q.questionText, type: q.type,
        options: q.options ? JSON.stringify(q.options) : null,
        answer: q.correctAnswer, points: q.points, order: q.sortOrder ?? i,
      });
    }
    res.json({ id: quizId, moduleId, title: body.title, questionCount: body.questions.length });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Invalid request" });
  }
});

/** GET /academic/quizzes/:id — quiz detail */
router.get("/quizzes/:id", requireAuth, async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const userId = req.user!.id;
  try {
    const [quizRows] = await pool.query(`
      SELECT q.id, q.title, q.description, q.time_limit_mins AS timeLimitMins,
             q.opened_at AS openedAt, q.closed_at AS closedAt,
             q.max_attempts AS maxAttempts, q.shuffle_questions AS shuffleQuestions,
             q.module_id AS moduleId, m.code AS moduleCode, m.name AS moduleName
      FROM quizzes q JOIN modules m ON m.id = q.module_id
      WHERE q.id = :id
    `, { id }) as any;
    const quiz = quizRows[0];
    if (!quiz) return res.status(404).json({ error: "Quiz not found" });

    const instructor = await isInstructor(userId);
    const [questions] = await pool.query(`
      SELECT id, question_text AS questionText, type, options,
             ${instructor ? "correct_answer AS correctAnswer," : ""} points, sort_order AS sortOrder
      FROM quiz_questions WHERE quiz_id = :id ORDER BY sort_order ASC
    `, { id }) as any;

    // Parse options JSON
    const qs = (questions as any[]).map(q => {
      let opts = q.options;
      if (typeof opts === "string") {
        try {
          opts = JSON.parse(opts);
        } catch {
          opts = null;
        }
      }
      return {
        ...q,
        options: opts,
      };
    });

    // Attempts info for this student
    const [attempts] = await pool.query(`
      SELECT id, started_at AS startedAt, submitted_at AS submittedAt,
             score, max_score AS maxScore, attempt_number AS attemptNumber
      FROM quiz_attempts WHERE quiz_id = :id AND student_id = :userId ORDER BY attempt_number DESC
    `, { id, userId }) as any;

    res.json({ quiz, questions: qs, attempts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/** POST /academic/quizzes/:id/start — start an attempt */
router.post("/quizzes/:id/start", requireAuth, async (req: AuthedRequest, res) => {
  const quizId = Number(req.params.id);
  const studentId = req.user!.id;
  try {
    const [quizRows] = await pool.query(
      "SELECT max_attempts AS maxAttempts, opened_at AS openedAt, closed_at AS closedAt FROM quizzes WHERE id = :quizId",
      { quizId }
    ) as any;
    const quiz = quizRows[0];
    if (!quiz) return res.status(404).json({ error: "Quiz not found" });
    const now = new Date();
    if (quiz.openedAt && new Date(quiz.openedAt) > now) return res.status(400).json({ error: "Quiz has not opened yet" });
    if (quiz.closedAt && new Date(quiz.closedAt) < now) return res.status(400).json({ error: "Quiz is closed" });

    const [existAttempts] = await pool.query(
      "SELECT COUNT(*) AS cnt FROM quiz_attempts WHERE quiz_id = :quizId AND student_id = :studentId",
      { quizId, studentId }
    ) as any;
    const attemptCount = existAttempts[0].cnt;
    if (attemptCount >= quiz.maxAttempts) return res.status(400).json({ error: "Maximum attempts reached" });

    const attemptNumber = attemptCount + 1;
    const [result] = await pool.query(`
      INSERT INTO quiz_attempts (quiz_id, student_id, started_at, attempt_number)
      VALUES (:quizId, :studentId, NOW(), :attemptNumber)
    `, { quizId, studentId, attemptNumber }) as any;
    res.json({ attemptId: result.insertId, attemptNumber });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/** POST /academic/attempts/:id/submit — submit quiz answers */
router.post("/attempts/:id/submit", requireAuth, async (req: AuthedRequest, res) => {
  const attemptId = Number(req.params.id);
  const studentId = req.user!.id;
  try {
    const [attemptRows] = await pool.query(
      "SELECT id, quiz_id AS quizId, student_id AS studentId, submitted_at FROM quiz_attempts WHERE id = :attemptId",
      { attemptId }
    ) as any;
    const attempt = attemptRows[0];
    if (!attempt) return res.status(404).json({ error: "Attempt not found" });
    if (attempt.studentId !== studentId) return res.status(403).json({ error: "Forbidden" });
    if (attempt.submitted_at) return res.status(400).json({ error: "Already submitted" });

    const body = z.object({
      answers: z.array(z.object({
        questionId: z.number(),
        answer:     z.string(),
      }))
    }).parse(req.body);

    // Get questions with correct answers
    const [questions] = await pool.query(
      "SELECT id, correct_answer AS correctAnswer, points FROM quiz_questions WHERE quiz_id = :quizId",
      { quizId: attempt.quizId }
    ) as any;

    let score = 0;
    let maxScore = 0;
    const qMap = new Map((questions as any[]).map(q => [q.id, q]));

    for (const ans of body.answers) {
      const q = qMap.get(ans.questionId);
      if (!q) continue;
      maxScore += Number(q.points);
      const isCorrect = ans.answer.trim() === String(q.correctAnswer).trim();
      const pointsAwarded = isCorrect ? Number(q.points) : 0;
      score += pointsAwarded;
      await pool.query(`
        INSERT INTO quiz_answers (attempt_id, question_id, answer_text, is_correct, points_awarded)
        VALUES (:attemptId, :questionId, :answer, :isCorrect, :points)
        ON DUPLICATE KEY UPDATE answer_text = VALUES(answer_text), is_correct = VALUES(is_correct), points_awarded = VALUES(points_awarded)
      `, {
        attemptId, questionId: ans.questionId,
        answer: ans.answer, isCorrect: isCorrect ? 1 : 0, points: pointsAwarded,
      });
    }

    // Update attempt
    await pool.query(`
      UPDATE quiz_attempts SET submitted_at = NOW(), score = :score, max_score = :maxScore WHERE id = :attemptId
    `, { attemptId, score, maxScore });

    res.json({ ok: true, score, maxScore, percentage: maxScore > 0 ? Math.round((score / maxScore) * 100) : 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Submission failed" });
  }
});

/** GET /academic/attempts/:id — get attempt detail with answers */
router.get("/attempts/:id", requireAuth, async (req: AuthedRequest, res) => {
  const attemptId = Number(req.params.id);
  const userId = req.user!.id;
  try {
    const [attemptRows] = await pool.query(`
      SELECT qa.id, qa.quiz_id AS quizId, qa.student_id AS studentId,
             qa.started_at AS startedAt, qa.submitted_at AS submittedAt,
             qa.score, qa.max_score AS maxScore, qa.attempt_number AS attemptNumber,
             q.title AS quizTitle, q.time_limit_mins AS timeLimitMins
      FROM quiz_attempts qa JOIN quizzes q ON q.id = qa.quiz_id
      WHERE qa.id = :attemptId
    `, { attemptId }) as any;
    const attempt = attemptRows[0];
    if (!attempt) return res.status(404).json({ error: "Not found" });
    const instructor = await isInstructor(userId);
    if (attempt.studentId !== userId && !instructor) return res.status(403).json({ error: "Forbidden" });

    const [answers] = await pool.query(`
      SELECT qa.question_id AS questionId, qa.answer_text AS answerText,
             qa.is_correct AS isCorrect, qa.points_awarded AS pointsAwarded,
             qq.question_text AS questionText, qq.options, qq.correct_answer AS correctAnswer,
             qq.points AS totalPoints, qq.type
      FROM quiz_answers qa
      JOIN quiz_questions qq ON qq.id = qa.question_id
      WHERE qa.attempt_id = :attemptId
      ORDER BY qq.sort_order ASC
    `, { attemptId }) as any;

    const parsedAnswers = (answers as any[]).map(a => {
      let opts = a.options;
      if (typeof opts === "string") {
        try {
          opts = JSON.parse(opts);
        } catch {
          opts = null;
        }
      }
      return {
        ...a,
        options: opts,
      };
    });

    res.json({ attempt, answers: parsedAnswers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/** GET /academic/quizzes/:id/results — all attempts + distribution (instructor) */
router.get("/quizzes/:id/results", requireAuth, async (req: AuthedRequest, res) => {
  const instructor = await isInstructor(req.user!.id);
  if (!instructor) return res.status(403).json({ error: "Forbidden" });
  const quizId = Number(req.params.id);
  try {
    const [quizRows] = await pool.query(
      "SELECT id, title, module_id AS moduleId FROM quizzes WHERE id = :quizId",
      { quizId }
    ) as any;
    const quiz = quizRows[0];
    if (!quiz) return res.status(404).json({ error: "Not found" });

    const [attempts] = await pool.query(`
      SELECT qa.id AS attemptId, qa.score, qa.max_score AS maxScore,
             qa.submitted_at AS submittedAt, qa.started_at AS startedAt,
             qa.attempt_number AS attemptNumber,
             u.id AS studentId, u.full_name AS studentName, u.email AS studentEmail,
             sp.reg_number AS regNumber, sp.group_code AS groupCode
      FROM quiz_attempts qa
      JOIN users u ON u.id = qa.student_id
      LEFT JOIN student_profiles sp ON sp.user_id = u.id
      WHERE qa.quiz_id = :quizId AND qa.submitted_at IS NOT NULL
      ORDER BY sp.group_code, u.full_name, qa.attempt_number DESC
    `, { quizId }) as any;

    // Compute score distribution (bins of 10%)
    const distribution: Record<string, number> = {
      "0-10": 0, "11-20": 0, "21-30": 0, "31-40": 0, "41-50": 0,
      "51-60": 0, "61-70": 0, "71-80": 0, "81-90": 0, "91-100": 0,
    };
    const percentages: number[] = [];
    const latestByStudent = new Map<number, any>();
    for (const a of attempts as any[]) {
      if (!latestByStudent.has(a.studentId)) latestByStudent.set(a.studentId, a);
    }
    for (const a of latestByStudent.values()) {
      if (a.score !== null && a.maxScore > 0) {
        const pct = Math.round((a.score / a.maxScore) * 100);
        percentages.push(pct);
        const bin = Math.min(Math.floor(pct / 10) * 10, 90);
        const key = bin === 90 ? "91-100" : `${bin + 1}-${bin + 10}`.replace("1-10", "0-10");
        distribution[bin === 0 ? "0-10" : `${bin + 1}-${bin + 10}`] = (distribution[bin === 0 ? "0-10" : `${bin + 1}-${bin + 10}`] ?? 0) + 1;
      }
    }
    const avg = percentages.length > 0 ? Math.round(percentages.reduce((s, v) => s + v, 0) / percentages.length) : null;

    res.json({ quiz, attempts, distribution, stats: { avg, count: percentages.length, max: Math.max(...percentages, 0), min: Math.min(...percentages, 100) } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/** GET /academic/quizzes/:id/export — Excel export */
router.get("/quizzes/:id/export", requireAuth, async (req: AuthedRequest, res) => {
  const instructor = await isInstructor(req.user!.id);
  if (!instructor) return res.status(403).json({ error: "Forbidden" });
  const quizId = Number(req.params.id);
  try {
    const { default: XLSX } = await import("xlsx");
    const [quizRows] = await pool.query("SELECT title FROM quizzes WHERE id = :quizId", { quizId }) as any;
    const quiz = quizRows[0];
    if (!quiz) return res.status(404).json({ error: "Not found" });

    const [attempts] = await pool.query(`
      SELECT u.full_name AS Name, u.email AS Email,
             sp.reg_number AS 'Reg. No.', sp.group_code AS 'Group',
             qa.score AS Score, qa.max_score AS 'Max Score',
             ROUND(qa.score / qa.max_score * 100, 1) AS 'Percentage %',
             qa.submitted_at AS 'Submitted At',
             qa.attempt_number AS 'Attempt #'
      FROM quiz_attempts qa
      JOIN users u ON u.id = qa.student_id
      LEFT JOIN student_profiles sp ON sp.user_id = u.id
      WHERE qa.quiz_id = :quizId AND qa.submitted_at IS NOT NULL
      ORDER BY sp.group_code, u.full_name
    `, { quizId }) as any;

    const ws = XLSX.utils.json_to_sheet(attempts);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Results");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${quiz.title.replace(/[^a-z0-9]/gi, "_")}_results.xlsx"`);
    res.send(buf);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Export failed" });
  }
});

/** GET /academic/quizzes/:id/my-result — student's own latest attempt */
router.get("/quizzes/:id/my-result", requireAuth, async (req: AuthedRequest, res) => {
  const quizId = Number(req.params.id);
  const studentId = req.user!.id;
  try {
    const [rows] = await pool.query(`
      SELECT id, score, max_score AS maxScore, submitted_at AS submittedAt, started_at AS startedAt, attempt_number AS attemptNumber
      FROM quiz_attempts WHERE quiz_id = :quizId AND student_id = :studentId
      ORDER BY attempt_number DESC LIMIT 1
    `, { quizId, studentId }) as any;
    res.json({ attempt: rows[0] ?? null });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

/** GET /academic/modules/:id/export-grades — Export all module grades for all students to one Excel sheet */
router.get("/modules/:id/export-grades", requireAuth, async (req: AuthedRequest, res) => {
  const instructor = await isInstructor(req.user!.id);
  if (!instructor) return res.status(403).json({ error: "Forbidden" });
  const moduleId = Number(req.params.id);
  
  try {
    const { default: XLSX } = await import("xlsx");
    
    // Get Module details
    const [modRows] = await pool.query(
      "SELECT code, name FROM modules WHERE id = :moduleId",
      { moduleId }
    ) as any;
    const mod = modRows[0];
    if (!mod) return res.status(404).json({ error: "Module not found" });

    // Fetch all assignments for this module
    const [assignments] = await pool.query(
      "SELECT id, title FROM assignments WHERE module_id = :moduleId",
      { moduleId }
    ) as any;

    // Fetch all quizzes for this module
    const [quizzes] = await pool.query(
      "SELECT id, title FROM quizzes WHERE module_id = :moduleId",
      { moduleId }
    ) as any;

    // Fetch all enrolled students
    const [students] = await pool.query(`
      SELECT u.id, u.full_name AS studentName, u.email AS studentEmail,
             sp.reg_number AS regNumber, sp.group_code AS groupCode
      FROM users u
      JOIN module_enrollments me ON me.student_id = u.id
      LEFT JOIN student_profiles sp ON sp.user_id = u.id
      WHERE me.module_id = :moduleId
      ORDER BY sp.group_code, u.full_name
    `, { moduleId }) as any;

    // Fetch all assignment submissions
    const [submissions] = await pool.query(`
      SELECT student_id AS studentId, assignment_id AS assignmentId, score
      FROM assignment_submissions
      WHERE assignment_id IN (SELECT id FROM assignments WHERE module_id = :moduleId)
    `, { moduleId }) as any;

    // Fetch all quiz attempts (get the latest attempt per student)
    const [quizAttempts] = await pool.query(`
      SELECT qa.student_id AS studentId, qa.quiz_id AS quizId, qa.score
      FROM quiz_attempts qa
      WHERE qa.quiz_id IN (SELECT id FROM quizzes WHERE module_id = :moduleId)
        AND qa.attempt_number = (
          SELECT MAX(qa2.attempt_number)
          FROM quiz_attempts qa2
          WHERE qa2.quiz_id = qa.quiz_id AND qa2.student_id = qa.student_id
        )
    `, { moduleId }) as any;

    // Build lookup maps
    const subMap = new Map<string, number>(); // key: studentId-assignmentId
    for (const sub of submissions) {
      if (sub.score !== null) {
        subMap.set(`${sub.studentId}-${sub.assignmentId}`, Number(sub.score));
      }
    }

    const quizMap = new Map<string, number>(); // key: studentId-quizId
    for (const att of quizAttempts) {
      if (att.score !== null) {
        quizMap.set(`${att.studentId}-${att.quizId}`, Number(att.score));
      }
    }

    // Build rows for Excel
    const excelRows = students.map((s: any) => {
      const row: Record<string, any> = {
        "Student Name": s.studentName,
        "Email": s.studentEmail,
        "Reg. No.": s.regNumber || "—",
        "Group": s.groupCode || "—",
      };

      let totalScore = 0;

      // Populate assignment columns
      for (const asgn of assignments) {
        const score = subMap.get(`${s.id}-${asgn.id}`);
        row[`Assignment: ${asgn.title}`] = score !== undefined ? score : "—";
        if (score !== undefined) totalScore += score;
      }

      // Populate quiz columns
      for (const q of quizzes) {
        const score = quizMap.get(`${s.id}-${q.id}`);
        row[`Quiz: ${q.title}`] = score !== undefined ? score : "—";
        if (score !== undefined) totalScore += score;
      }

      row["Total Score"] = totalScore;
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(excelRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Grades");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${mod.code}_Grades_Report.xlsx"`);
    res.send(buf);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Grades report export failed" });
  }
});

export default router;
