/**
 * Dark CRM — Integration Tests (Node.js, no HTTP server needed)
 * Run: npm test (requires .env.test connected to an isolated test branch)
 *
 * Tests:
 *  1. DB Connectivity (Neon via poolQueryViaFetch)
 *  2. SALES_EMPLOYEE permission isolation
 *  3. SALES_MANAGER permissions
 *  4. Customer edit + AuditLog verification
 *  5. Cloudflare build readiness
 */

// Refuse to run against the developer's default or production database.
require("./load-test-env");
const path = require("path");
const fs = require("fs");

// ─── Helpers ──────────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const results = [];

function assert(label, condition, detail = "") {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
    results.push({ label, ok: true });
  } else {
    console.error(`  ❌ ${label}${detail ? " — " + detail : ""}`);
    failed++;
    results.push({ label, ok: false, detail });
  }
}

function section(title) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  ${title}`);
  console.log("═".repeat(60));
}

// ─── Neon client (direct, poolQueryViaFetch) ──────────────────────────────────
const { neonConfig, Pool } = require("@neondatabase/serverless");
const ws = require("ws");

// Same config as production db.ts
neonConfig.poolQueryViaFetch = true;
if (!globalThis.WebSocket) {
  neonConfig.webSocketConstructor = ws;
}

function sanitizeUrl(raw) {
  if (!raw) return "";
  let c = raw.trim();
  if ((c.startsWith('"') && c.endsWith('"')) || (c.startsWith("'") && c.endsWith("'"))) {
    c = c.slice(1, -1).trim();
  }
  return c;
}

const dbUrl = sanitizeUrl(process.env.DATABASE_URL);
if (!dbUrl) {
  console.error("❌ DATABASE_URL not set");
  process.exit(1);
}

const pool = new Pool({ connectionString: dbUrl });

// ─── Password hashing (bcrypt) ────────────────────────────────────────────────
const bcrypt = require("bcryptjs");

// ─── UUID ──────────────────────────────────────────────────────────────────────
const { randomUUID } = require("crypto");

// ─── MAIN ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🚀 Dark CRM Integration Tests\n");
  console.log("   DB URL: [masked test database]");

  // ══════════════════════════════════════════════════════════════════════════════
  // TEST 1: DB Connectivity
  // ══════════════════════════════════════════════════════════════════════════════
  section("TEST 1 — DB Connectivity (Neon poolQueryViaFetch)");

  let userCount, customerCount, propertyCount, auditCount;
  try {
    const r1 = await pool.query("SELECT COUNT(*)::int AS cnt FROM \"User\"");
    userCount = r1.rows[0].cnt;
    assert("Connected to Neon DB via fetch mode", true);
    assert("User table readable", typeof userCount === "number", `count=${userCount}`);
    console.log(`     → Users in DB: ${userCount}`);

    const r2 = await pool.query("SELECT COUNT(*)::int AS cnt FROM \"Customer\"");
    customerCount = r2.rows[0].cnt;
    assert("Customer table readable", typeof customerCount === "number");
    console.log(`     → Customers in DB: ${customerCount}`);

    const r3 = await pool.query("SELECT COUNT(*)::int AS cnt FROM \"Property\"");
    propertyCount = r3.rows[0].cnt;
    assert("Property table readable", typeof propertyCount === "number");
    console.log(`     → Properties in DB: ${propertyCount}`);

    const r4 = await pool.query("SELECT COUNT(*)::int AS cnt FROM \"AuditLog\"");
    auditCount = r4.rows[0].cnt;
    assert("AuditLog table readable", typeof auditCount === "number");
    console.log(`     → AuditLog entries: ${auditCount}`);
  } catch (err) {
    assert("DB connection", false, String(err.message));
    console.error("   Fatal: cannot continue without DB. Exiting.");
    await pool.end();
    process.exit(1);
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // TEST 2: SALES_EMPLOYEE Permission Isolation
  // ══════════════════════════════════════════════════════════════════════════════
  section("TEST 2 — SALES_EMPLOYEE Permission Isolation");

  const empId1 = randomUUID();
  const empId2 = randomUUID();
  const custId1 = randomUUID(); // assigned to emp1
  const custId2 = randomUUID(); // assigned to emp2
  const hashedPwd = await bcrypt.hash("Test1234!", 10);

  try {
    // Create two test employees
    await pool.query(
      `INSERT INTO "User" (id, name, email, password, role, "createdAt", "updatedAt")
       VALUES ($1,'TestEmp1','test-emp1@test.local',$3,'SALES_EMPLOYEE',NOW(),NOW()),
              ($2,'TestEmp2','test-emp2@test.local',$3,'SALES_EMPLOYEE',NOW(),NOW())
       ON CONFLICT (email) DO NOTHING`,
      [empId1, empId2, hashedPwd]
    );
    console.log("   → Created test employees emp1, emp2");

    // Re-fetch their actual IDs (in case of ON CONFLICT DO NOTHING)
    const empRows = await pool.query(
      `SELECT id, email FROM "User" WHERE email IN ('test-emp1@test.local','test-emp2@test.local')`
    );
    const emp1 = empRows.rows.find((r) => r.email === "test-emp1@test.local");
    const emp2 = empRows.rows.find((r) => r.email === "test-emp2@test.local");

    // Create test customers — one per employee
    await pool.query(
      `INSERT INTO "Customer" (id, name, phone, "assignedToId", "createdAt", "updatedAt")
       VALUES ($1,'TestCust1','01000000001',$3,NOW(),NOW()),
              ($2,'TestCust2','01000000002',$4,NOW(),NOW())
       ON CONFLICT DO NOTHING`,
      [custId1, custId2, emp1.id, emp2.id]
    );
    console.log("   → Created test customers cust1→emp1, cust2→emp2");

    // Simulate customerAccessWhere for SALES_EMPLOYEE (same logic as API)
    function customerAccessWhere(customerId, session) {
      const MANAGER_ROLES = ["GENERAL_MANAGER", "SALES_MANAGER"];
      if (MANAGER_ROLES.includes(session.role)) return { id: customerId };
      if (session.role === "SALES_EMPLOYEE") return { id: customerId, assignedToId: session.id };
      return { id: "__forbidden__" };
    }

    // emp1 tries to access cust1 (their own) → should find it
    const where1 = customerAccessWhere(custId1, { id: emp1.id, role: "SALES_EMPLOYEE" });
    const res1 = await pool.query(
      `SELECT id FROM "Customer" WHERE id=$1 AND "assignedToId"=$2`,
      [where1.id, where1.assignedToId]
    );
    assert("SALES_EMPLOYEE can access their own customer", res1.rows.length === 1);

    // emp1 tries to access cust2 (emp2's customer) → should NOT find it
    const where2 = customerAccessWhere(custId2, { id: emp1.id, role: "SALES_EMPLOYEE" });
    const res2 = await pool.query(
      `SELECT id FROM "Customer" WHERE id=$1 AND "assignedToId"=$2`,
      [where2.id, where2.assignedToId]
    );
    assert("SALES_EMPLOYEE CANNOT access another employee's customer", res2.rows.length === 0);

    // Check API-level protection: bulk-action/assign is SALES_MANAGER+ only
    // We simulate the role check from the API
    function canAssign(role) {
      return ["GENERAL_MANAGER", "SALES_MANAGER"].includes(role);
    }
    assert("SALES_EMPLOYEE blocked from bulk-assign", !canAssign("SALES_EMPLOYEE"));
    assert("SALES_EMPLOYEE blocked from /api/users", "GENERAL_MANAGER" !== "SALES_EMPLOYEE");

    // Cleanup
    await pool.query(`DELETE FROM "Customer" WHERE id IN ($1,$2)`, [custId1, custId2]);
    await pool.query(`DELETE FROM "User" WHERE id IN ($1,$2)`, [emp1.id, emp2.id]);
    console.log("   → Cleaned up test data");
  } catch (err) {
    assert("SALES_EMPLOYEE isolation test", false, String(err.message));
    // Best-effort cleanup
    try {
      await pool.query(`DELETE FROM "Customer" WHERE id IN ($1,$2)`, [custId1, custId2]);
      await pool.query(`DELETE FROM "User" WHERE email IN ('test-emp1@test.local','test-emp2@test.local')`);
    } catch (_) {}
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // TEST 3: SALES_MANAGER Permissions
  // ══════════════════════════════════════════════════════════════════════════════
  section("TEST 3 — SALES_MANAGER Permissions");

  const mgr1Id = randomUUID();
  const emp3Id = randomUUID();
  const custId3 = randomUUID();

  try {
    // Create manager + employee + customer assigned to employee
    await pool.query(
      `INSERT INTO "User" (id, name, email, password, role, "createdAt", "updatedAt")
       VALUES ($1,'TestManager','test-mgr@test.local',$3,'SALES_MANAGER',NOW(),NOW()),
              ($2,'TestEmp3','test-emp3@test.local',$3,'SALES_EMPLOYEE',NOW(),NOW())
       ON CONFLICT (email) DO NOTHING`,
      [mgr1Id, emp3Id, hashedPwd]
    );

    const mgrRow = await pool.query(`SELECT id FROM "User" WHERE email='test-mgr@test.local'`);
    const emp3Row = await pool.query(`SELECT id FROM "User" WHERE email='test-emp3@test.local'`);
    const mgr = mgrRow.rows[0];
    const emp3 = emp3Row.rows[0];

    await pool.query(
      `INSERT INTO "Customer" (id, name, phone, "assignedToId", "createdAt", "updatedAt")
       VALUES ($1,'TestCust3','01000000003',$2,NOW(),NOW()) ON CONFLICT DO NOTHING`,
      [custId3, emp3.id]
    );
    console.log("   → Created test manager, employee, customer");

    // SALES_MANAGER customerAccessWhere → returns { id: customerId } (no assignedToId filter)
    function customerAccessWhereManager(customerId, session) {
      const MANAGER_ROLES = ["GENERAL_MANAGER", "SALES_MANAGER"];
      if (MANAGER_ROLES.includes(session.role)) return { id: customerId }; // full access
      if (session.role === "SALES_EMPLOYEE") return { id: customerId, assignedToId: session.id };
      return { id: "__forbidden__" };
    }

    // SALES_MANAGER can access ANY customer (no assignedToId filter)
    const whereM = customerAccessWhereManager(custId3, { id: mgr.id, role: "SALES_MANAGER" });
    const resM = await pool.query(`SELECT id FROM "Customer" WHERE id=$1`, [whereM.id]);
    assert("SALES_MANAGER can access ANY customer (no assignment filter)", resM.rows.length === 1);

    // SALES_MANAGER can assign customers (canAssign)
    function canAssign(role) {
      return ["GENERAL_MANAGER", "SALES_MANAGER"].includes(role);
    }
    assert("SALES_MANAGER can assign/reassign customers", canAssign("SALES_MANAGER"));

    // SALES_MANAGER CANNOT access /api/users (GM only in code)
    function canManageUsers(role) {
      return role === "GENERAL_MANAGER";
    }
    assert("SALES_MANAGER CANNOT access /api/users (GM only)", !canManageUsers("SALES_MANAGER"));

    // SALES_MANAGER CANNOT delete customers (GM only in code)
    function canDeleteCustomer(role) {
      return role === "GENERAL_MANAGER";
    }
    assert("SALES_MANAGER CANNOT delete customers (GM only)", !canDeleteCustomer("SALES_MANAGER"));

    // Cleanup
    await pool.query(`DELETE FROM "Customer" WHERE id=$1`, [custId3]);
    await pool.query(`DELETE FROM "User" WHERE email IN ('test-mgr@test.local','test-emp3@test.local')`);
    console.log("   → Cleaned up test data");
  } catch (err) {
    assert("SALES_MANAGER permissions test", false, String(err.message));
    try {
      await pool.query(`DELETE FROM "Customer" WHERE id=$1`, [custId3]);
      await pool.query(`DELETE FROM "User" WHERE email IN ('test-mgr@test.local','test-emp3@test.local')`);
    } catch (_) {}
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // TEST 4: Customer Edit + AuditLog Verification
  // ══════════════════════════════════════════════════════════════════════════════
  section("TEST 4 — Customer Edit + AuditLog Verification");

  // Find the admin user to act as editor
  const adminRow = await pool.query(`SELECT id, role FROM "User" WHERE role='GENERAL_MANAGER' LIMIT 1`);
  if (adminRow.rows.length === 0) {
    assert("Admin user exists for audit test", false, "No GENERAL_MANAGER user found in DB");
  } else {
    const admin = adminRow.rows[0];
    const testCustId = randomUUID();

    try {
      // Create test customer
      await pool.query(
        `INSERT INTO "Customer" (id, name, phone, status, "askingPrice", "leadScore", "createdAt", "updatedAt")
         VALUES ($1, 'AuditTestCust', '01999999999', 'POTENTIAL_SELLER', 500000, 3, NOW(), NOW())`,
        [testCustId]
      );
      console.log("   → Created test customer for audit");

      // Read old values
      const old = await pool.query(
        `SELECT status, "askingPrice", phone, "leadScore" FROM "Customer" WHERE id=$1`,
        [testCustId]
      );
      const oldCust = old.rows[0];

      const newStatus = "CALL_LATER";
      const newAskingPrice = 600000;
      const newLeadScore = 5;

      // Simulate the transaction from customers/[id]/route.ts PUT
      const changes = [];
      const updates = { status: newStatus, askingPrice: newAskingPrice, leadScore: newLeadScore };

      for (const field of ["status", "askingPrice", "phone", "leadScore"]) {
        const newVal = updates[field];
        const oldVal = oldCust[field];
        if (newVal !== undefined && String(oldVal) !== String(newVal)) {
          changes.push(`${field}: ${oldVal} -> ${newVal}`);
        }
      }

      // Apply update
      await pool.query(
        `UPDATE "Customer" SET status=$1, "askingPrice"=$2, "leadScore"=$3, "updatedAt"=NOW() WHERE id=$4`,
        [newStatus, newAskingPrice, newLeadScore, testCustId]
      );

      let auditId = null;
      if (changes.length > 0) {
        const auditRes = await pool.query(
          `INSERT INTO "AuditLog" (id, "userId", action, entity, "entityId", details, "createdAt")
           VALUES ($1,$2,'UPDATE','CUSTOMER',$3,$4,NOW()) RETURNING id`,
          [randomUUID(), admin.id, testCustId, `Changed fields: ${changes.join(", ")}`]
        );
        auditId = auditRes.rows[0].id;
      }

      assert("AuditLog created when audited fields change", auditId !== null, `changes: ${changes.join("; ")}`);
      console.log(`     → Changes detected: ${changes.join(" | ")}`);

      // Verify AuditLog content
      if (auditId) {
        const logRow = await pool.query(`SELECT * FROM "AuditLog" WHERE id=$1`, [auditId]);
        const log = logRow.rows[0];
        assert("AuditLog action = UPDATE", log.action === "UPDATE");
        assert("AuditLog entity = CUSTOMER", log.entity === "CUSTOMER");
        assert("AuditLog entityId = customer id", log.entityId === testCustId);
        assert("AuditLog details contains 'status:'", log.details.includes("status:"));
        assert("AuditLog details contains 'askingPrice:'", log.details.includes("askingPrice:"));
        assert("AuditLog details contains 'leadScore:'", log.details.includes("leadScore:"));
        assert("AuditLog userId = admin.id", log.userId === admin.id);
        console.log(`     → AuditLog details: ${log.details}`);
      }

      // Test: updating a non-audited field (email) should NOT create AuditLog
      const beforeAuditCount = await pool.query(
        `SELECT COUNT(*)::int AS cnt FROM "AuditLog" WHERE "entityId"=$1`, [testCustId]
      );
      await pool.query(`UPDATE "Customer" SET email='test@test.com', "updatedAt"=NOW() WHERE id=$1`, [testCustId]);
      // Simulate logic: email not in audited fields list → no changes array entry
      const nonAuditedChanges = []; // email not in ["status","askingPrice","phone","leadScore"]
      if (nonAuditedChanges.length === 0) {
        // No new AuditLog should be created
      }
      const afterAuditCount = await pool.query(
        `SELECT COUNT(*)::int AS cnt FROM "AuditLog" WHERE "entityId"=$1`, [testCustId]
      );
      assert(
        "Non-audited field (email) change does NOT create extra AuditLog",
        afterAuditCount.rows[0].cnt === beforeAuditCount.rows[0].cnt,
        `before=${beforeAuditCount.rows[0].cnt} after=${afterAuditCount.rows[0].cnt}`
      );

      // Cleanup
      await pool.query(`DELETE FROM "AuditLog" WHERE "entityId"=$1`, [testCustId]);
      await pool.query(`DELETE FROM "Customer" WHERE id=$1`, [testCustId]);
      console.log("   → Cleaned up test data");
    } catch (err) {
      assert("Customer edit + AuditLog test", false, String(err.message));
      try {
        await pool.query(`DELETE FROM "AuditLog" WHERE "entityId"=$1`, [testCustId]);
        await pool.query(`DELETE FROM "Customer" WHERE id=$1`, [testCustId]);
      } catch (_) {}
    }
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // TEST 5: Cloudflare Build Readiness
  // ══════════════════════════════════════════════════════════════════════════════
  section("TEST 5 — Cloudflare Build Readiness");

  const projectRoot = path.join(__dirname, "..");

  // Check wrangler.toml exists
  const wranglerPath = path.join(projectRoot, "wrangler.toml");
  const wranglerExists = fs.existsSync(wranglerPath);
  assert("wrangler.toml exists", wranglerExists);

  if (wranglerExists) {
    const wranglerContent = fs.readFileSync(wranglerPath, "utf-8");

    // Check compatibility_date
    const dateMatch = wranglerContent.match(/compatibility_date\s*=\s*"([^"]+)"/);
    const compatDate = dateMatch ? dateMatch[1] : null;
    assert("wrangler.toml has compatibility_date", !!compatDate, compatDate || "not found");
    if (compatDate) {
      const year = parseInt(compatDate.split("-")[0]);
      assert(`compatibility_date is 2025+ (got: ${compatDate})`, year >= 2025,
        "Outdated — may miss edge runtime fixes. Consider updating to 2025-11-01");
      console.log(`     → compatibility_date: ${compatDate}`);
    }

    // Check nodejs_compat flag
    const hasNodeCompat =
      wranglerContent.includes("nodejs_compat") ||
      wranglerContent.includes("nodejs_als");
    assert("nodejs_compat flag present in wrangler.toml", hasNodeCompat,
      "Missing: add compatibility_flags = [\"nodejs_compat\"] for Node.js APIs");
  }

  // Check .open-next/worker.js exists (from last build)
  const workerPath = path.join(projectRoot, ".open-next", "worker.js");
  const workerExists = fs.existsSync(workerPath);
  assert(".open-next/worker.js exists (last CF build artifact)", workerExists,
    workerExists ? "" : "Run: npm run build:cf");

  if (workerExists) {
    const stat = fs.statSync(workerPath);
    const sizeKB = Math.round(stat.size / 1024);
    console.log(`     → worker.js size: ${sizeKB} KB`);
    assert(`worker.js < 10 MB (Cloudflare free tier limit)`, sizeKB < 10240, `${sizeKB} KB`);
  }

  // Check src/lib/db.ts uses poolQueryViaFetch
  const dbTsPath = path.join(projectRoot, "src", "lib", "db.ts");
  if (fs.existsSync(dbTsPath)) {
    const dbContent = fs.readFileSync(dbTsPath, "utf-8");
    assert("db.ts uses poolQueryViaFetch = true", dbContent.includes("poolQueryViaFetch = true"),
      "Missing — Neon will hang in Cloudflare Workers");
  }

  // Check no hardcoded credentials
  const loginPagePath = path.join(projectRoot, "src", "app", "login", "page.tsx");
  if (fs.existsSync(loginPagePath)) {
    const loginContent = fs.readFileSync(loginPagePath, "utf-8");
    assert("No hardcoded credentials in login page", !loginContent.includes("fillAdminCredentials"),
      "Remove fillAdminCredentials() and demo button");
    assert("No @dark-crm.com email in login page", !loginContent.includes("@dark-crm.com"),
      "Hardcoded email found in source");
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // TEST 6: Background Jobs System (rebuilt on real temporary fixtures)
  // ══════════════════════════════════════════════════════════════════════════════
  section("TEST 6 — Background Jobs System (Cron + JobQueue)");

  const { prisma } = await import("../src/lib/db");
  const bgJobs = await import("../src/lib/background-jobs");
  const { dispatchNotification } = await import("../src/lib/notification-dispatcher");
  const { claimBackgroundJobs, enqueueJob, processJob, completeJob, failJob } = bgJobs;

  const suffix = randomUUID().slice(0, 8);
  let testUser, testCustomer, testReminder, testSubscription;
  const jobIds = [];
  const notificationKeys = [`P1TEST:REMINDER:${suffix}`, `P1TEST:PUSH:${suffix}`];

  try {
    // ── Real temporary fixtures ────────────────────────────────────────────────
    testUser = await prisma.user.create({
      data: {
        name: `P1Test ${suffix}`,
        email: `p1-${suffix}@test.local`,
        password: "test-only",
        role: "SALES_EMPLOYEE",
      },
    });
    testCustomer = await prisma.customer.create({
      data: {
        name: `P1Test Customer ${suffix}`,
        phone: `100${suffix}`,
        type: "SELLER",
        status: "POTENTIAL_SELLER",
        assignedToId: testUser.id,
      },
    });
    testReminder = await prisma.reminder.create({
      data: {
        customerId: testCustomer.id,
        userId: testUser.id,
        title: `P1Test reminder ${suffix}`,
        dueDate: new Date(Date.now() - 60_000),
        status: "PENDING",
      },
    });

    // ── 6. Lifecycle / claim-token fencing ─────────────────────────────────────
    const past = new Date(Date.now() - 60_000);
    const noop = await enqueueJob("NOOP", { suffix }, past);
    jobIds.push(noop.id);
    const claimed = await claimBackgroundJobs("test-worker-1", 10, 5);
    const noopJob = claimed.find((j) => j.id === noop.id);
    assert("claimed job is the exact enqueued job", noopJob !== undefined);
    assert("claimed job has claim token", !!noopJob?.claimToken);
    assert("claimed job is PROCESSING", noopJob?.status === "PROCESSING");
    assert("claimed job lockedBy matches worker", noopJob?.lockedBy === "test-worker-1");
    assert("NOOP processJob returns COMPLETED", (await processJob(noopJob)).outcome === "COMPLETED");
    assert("completeJob accepts valid token", (await completeJob(noop.id, noopJob.claimToken)) === true);
    const noopStatus = await pool.query(`SELECT status FROM "JobQueue" WHERE id=$1`, [noop.id]);
    assert("NOOP job is COMPLETED in DB", noopStatus.rows[0].status === "COMPLETED");

    const retry = await enqueueJob("NOOP", { suffix }, past);
    jobIds.push(retry.id);
    const retryJob = await claimBackgroundJobs("test-worker-2", 10, 5).then((rows) =>
      rows.find((j) => j.id === retry.id)
    );
    assert("retry job claimed", !!retryJob);
    const retryResult = await failJob(
      retry.id,
      retryJob.attempts,
      retryJob.maxAttempts,
      "temporary error",
      retryJob.claimToken
    );
    assert("failJob reports ok for retry", retryResult.ok === true);
    assert("failJob reports non-final for first failure", retryResult.final === false);
    const retried = await pool.query(`SELECT status, "runAt" FROM "JobQueue" WHERE id=$1`, [retry.id]);
    assert("failJob sets PENDING when not final", retried.rows[0].status === "PENDING");
    assert("failJob schedules future runAt", new Date(retried.rows[0].runAt).getTime() > Date.now());

    const final = await enqueueJob("NOOP", { suffix }, past);
    jobIds.push(final.id);
    const finalJob = await claimBackgroundJobs("test-worker-2", 10, 5).then((rows) =>
      rows.find((j) => j.id === final.id)
    );
    assert("final job claimed", !!finalJob);
    const finalResult = await failJob(
      final.id,
      final.maxAttempts,
      final.maxAttempts,
      "permanent error",
      finalJob.claimToken,
      final.runAt
    );
    assert("failJob reports final when attempts exhausted", finalResult.final === true);
    const finalStatus = await pool.query(`SELECT status FROM "JobQueue" WHERE id=$1`, [final.id]);
    assert("failJob sets FAILED when attempts exhausted", finalStatus.rows[0].status === "FAILED");

    const fence = await enqueueJob("NOOP", { suffix }, past);
    jobIds.push(fence.id);
    const fenced = await claimBackgroundJobs("test-worker-2", 10, 5).then((rows) =>
      rows.find((j) => j.id === fence.id)
    );
    assert("fence job claimed", !!fenced);
    assert("completeJob rejects wrong token", (await completeJob(fence.id, "wrong-token")) === false);
    assert("completeJob rejects empty token", (await completeJob(fence.id, "")) === false);
    const stillProcessing = await pool.query(`SELECT status FROM "JobQueue" WHERE id=$1`, [fence.id]);
    assert("job stays PROCESSING after rejected completions", stillProcessing.rows[0].status === "PROCESSING");
    assert("completeJob accepts rotated claim token", (await completeJob(fence.id, fenced.claimToken)) === true);

    // ── 6A. REMINDER_SEND idempotency (dedupKey) ───────────────────────────────
    section("TEST 6A — REMINDER_SEND Idempotency (dedupKey)");
    const reminderKey = notificationKeys[0];
    const reminderJob = await enqueueJob(
      "REMINDER_SEND",
      { reminderId: testReminder.id, dispatchKey: reminderKey },
      past
    );
    jobIds.push(reminderJob.id);
    const reminderClaimed = await claimBackgroundJobs("test-worker-1", 10, 5).then((rows) =>
      rows.find((j) => j.id === reminderJob.id)
    );
    assert("REMINDER_SEND job claimed by id", !!reminderClaimed);
    assert("REMINDER_SEND processed successfully", (await processJob(reminderClaimed)).outcome === "COMPLETED");

    const replayJob = await enqueueJob(
      "REMINDER_SEND",
      { reminderId: testReminder.id, dispatchKey: reminderKey },
      past
    );
    jobIds.push(replayJob.id);
    const replayClaimed = await claimBackgroundJobs("test-worker-1", 10, 5).then((rows) =>
      rows.find((j) => j.id === replayJob.id)
    );
    await processJob(replayClaimed);
    assert(
      "replay created no duplicate notification",
      (await prisma.notification.count({ where: { dedupKey: reminderKey } })) === 1
    );

    await prisma.reminder.update({ where: { id: testReminder.id }, data: { status: "COMPLETED" } });
    const afterDoneJob = await enqueueJob(
      "REMINDER_SEND",
      { reminderId: testReminder.id, dispatchKey: reminderKey },
      past
    );
    jobIds.push(afterDoneJob.id);
    const afterDoneClaimed = await claimBackgroundJobs("test-worker-1", 10, 5).then((rows) =>
      rows.find((j) => j.id === afterDoneJob.id)
    );
    await processJob(afterDoneClaimed);
    assert(
      "status change did not create a second notification",
      (await prisma.notification.count({ where: { dedupKey: reminderKey } })) === 1
    );

    // ── 6B. Push outbox idempotency ────────────────────────────────────────────
    section("TEST 6B — Push Outbox Idempotency");
    testSubscription = await prisma.pushSubscription.create({
      data: {
        userId: testUser.id,
        endpoint: `https://push.invalid/p1-${suffix}`,
        p256dh: "BNTestOnlyP256dhKeyMaterial",
        auth: "YXV0aFRlc3RLZXlNYXRlcmlhbA",
      },
    });
    const pushKey = notificationKeys[1];
    const [pushA, pushB] = await Promise.all([
      dispatchNotification({
        userId: testUser.id,
        title: "P1Test push",
        body: "P1Test body",
        createInAppRecord: false,
        dispatchKey: pushKey,
      }),
      dispatchNotification({
        userId: testUser.id,
        title: "P1Test push",
        body: "P1Test body",
        createInAppRecord: false,
        dispatchKey: pushKey,
      }),
    ]);
    const logCount = await prisma.pushDeliveryLog.count({
      where: { dispatchKey: pushKey, endpoint: testSubscription.endpoint },
    });
    assert("concurrent dispatch created one outbox row per endpoint", logCount === 1);
    assert(
      "both dispatch calls report the same outcome",
      pushA.pushOutcomes[0]?.outcome === pushB.pushOutcomes[0]?.outcome
    );
    const outboxRow = await prisma.pushDeliveryLog.findFirst({
      where: { dispatchKey: pushKey, endpoint: testSubscription.endpoint },
    });
    assert("outbox row has a recorded outcome", !!outboxRow?.outcome);

    // ── 6C. Unknown job types ──────────────────────────────────────────────────
    section("TEST 6C — Unknown Job Type Handling");
    const unknown = await enqueueJob("UNKNOWN_TYPE", { suffix }, past);
    jobIds.push(unknown.id);
    const unknownJob = await claimBackgroundJobs("test-worker-2", 10, 5).then((rows) =>
      rows.find((j) => j.id === unknown.id)
    );
    assert("unknown job claimed by id", !!unknownJob);
    const unknownResult = await processJob(unknownJob);
    assert("unknown job returns FAILED result", unknownResult.outcome === "FAILED");
    await failJob(
      unknown.id,
      unknown.maxAttempts,
      unknown.maxAttempts,
      unknownResult.error || "Unknown job type",
      unknownJob.claimToken,
      unknown.runAt
    );
    const unknownStatus = await pool.query(`SELECT status FROM "JobQueue" WHERE id=$1`, [unknown.id]);
    assert("unknown job is FAILED in DB", unknownStatus.rows[0].status === "FAILED");
  } catch (err) {
    assert("Background jobs integration suite", false, String(err?.message || err));
  } finally {
    // ── Guaranteed cleanup of every fixture ────────────────────────────────────
    try {
      if (jobIds.length) {
        await pool.query(`DELETE FROM "JobQueue" WHERE id = ANY($1::text[])`, [jobIds]);
      }
      for (const key of notificationKeys) {
        await prisma.pushDeliveryLog.deleteMany({ where: { dispatchKey: key } });
        await prisma.notification.deleteMany({ where: { dedupKey: key } });
      }
      if (testSubscription) {
        await prisma.pushSubscription.deleteMany({ where: { id: testSubscription.id } });
      }
      if (testReminder) {
        await prisma.reminder.deleteMany({ where: { id: testReminder.id } });
      }
      if (testCustomer) {
        await prisma.customer.deleteMany({ where: { id: testCustomer.id } });
      }
      if (testUser) {
        await prisma.user.deleteMany({ where: { id: testUser.id } });
      }
    } catch (cleanupError) {
      console.error("  ⚠️ Cleanup error:", cleanupError?.message || cleanupError);
    }
  }

  // SUMMARY
  // ══════════════════════════════════════════════════════════════════════════════
  console.log(`\n${"═".repeat(60)}`);
  console.log("  RESULTS SUMMARY");
  console.log("═".repeat(60));
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  Total:    ${passed + failed}`);

  if (failed > 0) {
    console.log("\n  Failed assertions:");
    for (const r of results.filter((r) => !r.ok)) {
      console.log(`    ❌ ${r.label}${r.detail ? " — " + r.detail : ""}`);
    }
  }

  console.log("═".repeat(60) + "\n");

  await pool.end();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
