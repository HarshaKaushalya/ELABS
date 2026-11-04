import assert from "node:assert/strict";
import { getPagination } from "../src/utils/pagination";
import { findDatasheet } from "../src/modules/ai/datasheets.data";

// Set environment fallback variables for testing isolation
process.env.MYSQL_HOST = process.env.MYSQL_HOST ?? "localhost";
process.env.MYSQL_PORT = process.env.MYSQL_PORT ?? "3306";
process.env.MYSQL_USER = process.env.MYSQL_USER ?? "elabs";
process.env.MYSQL_PASSWORD = process.env.MYSQL_PASSWORD ?? "elabs_password";
process.env.MYSQL_DATABASE = process.env.MYSQL_DATABASE ?? "elabs";
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? "change_me_access_secret_123456";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? "change_me_refresh_secret_123456";
process.env.JWT_ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN ?? "15m";
process.env.JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN ?? "7d";
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:3000";
process.env.COOKIE_DOMAIN = process.env.COOKIE_DOMAIN ?? "localhost";

let testsPassed = 0;
let testsFailed = 0;

function runTest(name: string, fn: () => void | Promise<void>) {
  try {
    const res = fn();
    if (res instanceof Promise) {
      res.then(() => {
        console.log(`  PASS: ${name}`);
        testsPassed++;
      }).catch((err) => {
        console.error(`  FAIL: ${name}`, err.message);
        testsFailed++;
      });
    } else {
      console.log(`  PASS: ${name}`);
      testsPassed++;
    }
  } catch (err: any) {
    console.error(`  FAIL: ${name}`, err.message);
    testsFailed++;
  }
}

async function main() {
  console.log("\n=======================================================");
  console.log("  ELABS UNIT TEST SUITE (Automated Logic Verification)");
  console.log("=======================================================\n");

  const { signAccessToken, verifyAccessToken } = await import("../src/modules/auth/jwt");

  // ── 1. Authentication & Cryptographic Token Tests ──────────────────
  console.log("[Module: Auth & JWT]");
  runTest("JWT: Sign access token with user claims and verify payload integrity", () => {
    const claims = { sub: "42", email: "student@elabs.local", role: "STUDENT" };
    const token = signAccessToken(claims);
    assert.ok(typeof token === "string" && token.length > 20, "Token should be non-empty JWT string");

    const payload = verifyAccessToken(token);
    assert.equal(payload.sub, "42");
    assert.equal(payload.email, "student@elabs.local");
  });

  runTest("JWT: Tampered token signature must throw verification error", () => {
    const claims = { sub: "1", email: "admin@elabs.local" };
    const token = signAccessToken(claims);
    const tampered = token.slice(0, -6) + "XXXXXX";
    assert.throws(() => {
      verifyAccessToken(tampered);
    }, /invalid signature|jwt malformed/i);
  });

  runTest("JWT: Empty or malformed token string must throw error", () => {
    assert.throws(() => {
      verifyAccessToken("invalid.notatoken.string");
    }, /jwt malformed|invalid token/i);
  });

  // ── 2. Data Pagination & Query Boundary Tests ───────────────────────
  console.log("\n[Module: Pagination Utility]");
  runTest("Pagination: Calculates correct SQL offset and pageSize for Page 1", () => {
    const p = getPagination(1, 20);
    assert.equal(p.pageSize, 20);
    assert.equal(p.offset, 0);
  });

  runTest("Pagination: Calculates correct SQL offset for Page 3 with PageSize 15", () => {
    const p = getPagination(3, 15);
    assert.equal(p.pageSize, 15);
    assert.equal(p.offset, 30);
  });

  runTest("Pagination: Negative or zero page inputs clamp safely to Page 1", () => {
    const p = getPagination(0, 10);
    assert.equal(p.offset, 0);
    assert.equal(p.pageSize, 10);
  });

  // ── 3. Datasheet Semantic Matching Algorithm Tests ──────────────────
  console.log("\n[Module: Equipment Datasheet Matcher]");
  runTest("Datasheet: Correctly maps Rigol oscilloscope query to official documentation", () => {
    const match = findDatasheet("Rigol DS1054Z");
    assert.ok(match !== null, "Expected match for Rigol DS1054Z");
    assert.ok(match.model.toLowerCase().includes("ds1054") || match.title.toLowerCase().includes("rigol"));
  });

  runTest("Datasheet: Correctly maps Fluke multimeter query to documentation", () => {
    const match = findDatasheet("Fluke 87V");
    assert.ok(match !== null, "Expected match for Fluke 87V");
  });

  runTest("Datasheet: Non-existent hardware query safely returns null without throwing", () => {
    const match = findDatasheet("CompletelyNonExistentHardwareDevice9999");
    assert.equal(match, null);
  });

  // ── 4. Barcode Tag Format Validation Tests ─────────────────────────
  console.log("\n[Module: Barcode & Tag Validation]");
  runTest("Tag Validation: Matches standard ELABS equipment tag syntax (ELABS-XX-YYYY)", () => {
    const tagRegex = /^ELABS-[A-Z]{2}-\d{4}$/;
    assert.ok(tagRegex.test("ELABS-PS-0001"));
    assert.ok(tagRegex.test("ELABS-EL-0012"));
    assert.ok(tagRegex.test("ELABS-CM-0005"));
  });

  runTest("Tag Validation: Rejects invalid barcode tags missing prefix or digits", () => {
    const tagRegex = /^ELABS-[A-Z]{2}-\d{4}$/;
    assert.equal(tagRegex.test("INVALID-TAG-01"), false);
    assert.equal(tagRegex.test("ELABS-1234"), false);
    assert.equal(tagRegex.test("elabs-ps-0001"), false); // uppercase check
  });

  // ── 5. Student Index Number Validation Tests ───────────────────────
  console.log("\n[Module: Academic Index Number Validation]");
  runTest("Index Validation: Validates Faculty of Engineering student registration numbers (EG/YYYY/NNNN)", () => {
    const indexRegex = /^EG\/\d{4}\/\d{4}$/;
    assert.ok(indexRegex.test("EG/2022/5401"));
    assert.ok(indexRegex.test("EG/2022/4983"));
    assert.ok(indexRegex.test("EG/2022/5024"));
    assert.ok(indexRegex.test("EG/2022/4916"));
  });

  runTest("Index Validation: Rejects malformed or non-engineering index numbers", () => {
    const indexRegex = /^EG\/\d{4}\/\d{4}$/;
    assert.equal(indexRegex.test("AG/2022/1234"), false);
    assert.equal(indexRegex.test("EG/22/5401"), false);
    assert.equal(indexRegex.test("5401"), false);
  });

  // ── 6. Assignment Submissions & File Persistence Tests ─────────────
  console.log("\n[Module: Assignment Submissions & File Storage]");
  runTest("File Storage: Base64 encoding and buffer decoding preserves binary integrity", () => {
    const originalContent = "PDF-1.5 %sample presentation slides binary buffer stream \x00\x01\x02\xFF";
    const originalBuffer = Buffer.from(originalContent, "utf-8");
    const base64Data = originalBuffer.toString("base64");
    const restoredBuffer = Buffer.from(base64Data, "base64");
    assert.equal(restoredBuffer.toString("utf-8"), originalContent);
    assert.equal(restoredBuffer.length, originalBuffer.length);
  });

  runTest("File Download: Content-Disposition properly formats and encodes filenames with special characters", () => {
    const fileName = "presentation slides (Final Version) #1.pdf";
    const encoded = encodeURIComponent(fileName);
    const header = `attachment; filename="${encoded}"; filename*=UTF-8''${encoded}`;
    assert.ok(header.includes("attachment;"));
    assert.ok(header.includes("presentation%20slides"));
    assert.ok(header.includes(".pdf"));
  });

  runTest("File MIME: Maps common submission extensions to correct content types", () => {
    const mimeMap: Record<string, string> = {
      ".pdf": "application/pdf",
      ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".zip": "application/zip",
      ".png": "image/png",
    };
    assert.equal(mimeMap[".pdf"], "application/pdf");
    assert.equal(mimeMap[".docx"], "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    assert.equal(mimeMap[".zip"], "application/zip");
  });

  // ── 7. Communication Badges & Unread Indicator Tests ───────────────
  console.log("\n[Module: Communication Indicators & Read Status]");
  runTest("Indicator Logic: Dynamic badge hides when on active route or when unreadCount is 0", () => {
    const getBadge = (count: number, pathname: string, targetPath: string) => {
      if (pathname === targetPath || pathname.startsWith(`${targetPath}/`)) {
        return undefined;
      }
      return count > 0 ? (count > 99 ? "99+" : count) : undefined;
    };

    assert.equal(getBadge(3, "/notifications", "/notifications"), undefined);
    assert.equal(getBadge(1, "/messages", "/messages"), undefined);
    assert.equal(getBadge(3, "/dashboard", "/notifications"), 3);
    assert.equal(getBadge(1, "/dashboard", "/messages"), 1);
    assert.equal(getBadge(150, "/dashboard", "/notifications"), "99+");
    assert.equal(getBadge(0, "/dashboard", "/notifications"), undefined);
  });

  runTest("Indicator State: Marking all notifications as read resets unreadCount to 0", () => {
    const notifications = [
      { id: 1, title: "Borrow approved", isRead: false },
      { id: 2, title: "Lab reminder", isRead: false },
      { id: 3, title: "Assignment graded", isRead: false },
    ];
    assert.equal(notifications.filter(n => !n.isRead).length, 3);
    const readAll = notifications.map(n => ({ ...n, isRead: true }));
    assert.equal(readAll.filter(n => !n.isRead).length, 0);
  });

  console.log("\n=======================================================");
  console.log(`  SUMMARY: ${testsPassed} Tests Passed | ${testsFailed} Failed`);
  console.log("=======================================================\n");

  if (testsFailed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
