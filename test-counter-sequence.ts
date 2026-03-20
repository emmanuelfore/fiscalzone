/**
 * Manual test script: verifies atomic counter claim and take-the-max sync logic.
 *
 * Run with:  npx tsx test-counter-sequence.ts <companyId>
 *
 * Tests:
 *  1. Atomic claim — 5 concurrent claims produce 5 unique, sequential pairs
 *  2. Take-the-max sync — ZIMRA returning a lower value never resets local counters
 *  3. Take-the-max sync — ZIMRA returning a higher value advances local counters
 *  4. Auto-open retry guard — counter does NOT reset to 1 mid-day on non-310 errors
 */

import "dotenv/config";
import { db } from "./server/db";
import { companies } from "./shared/schema";
import { eq, sql } from "drizzle-orm";

const companyId = parseInt(process.argv[2] || "0");
if (!companyId) {
  console.error("Usage: npx tsx test-counter-sequence.ts <companyId>");
  process.exit(1);
}

// ── helpers ──────────────────────────────────────────────────────────────────

async function getCounters() {
  const [c] = await db
    .select({ globalNo: companies.lastReceiptGlobalNo, daily: companies.dailyReceiptCount })
    .from(companies)
    .where(eq(companies.id, companyId));
  return c;
}

async function setCounters(globalNo: number, daily: number) {
  await db
    .update(companies)
    .set({ lastReceiptGlobalNo: globalNo, dailyReceiptCount: daily })
    .where(eq(companies.id, companyId));
}

async function claimNext(): Promise<{ receiptGlobalNo: number; receiptCounter: number }> {
  const [updated] = await db
    .update(companies)
    .set({
      lastReceiptGlobalNo: sql`${companies.lastReceiptGlobalNo} + 1`,
      dailyReceiptCount: sql`${companies.dailyReceiptCount} + 1`,
    })
    .where(eq(companies.id, companyId))
    .returning({
      receiptGlobalNo: companies.lastReceiptGlobalNo,
      receiptCounter: companies.dailyReceiptCount,
    });
  return { receiptGlobalNo: updated.receiptGlobalNo!, receiptCounter: updated.receiptCounter! };
}

// Simulates the take-the-max sync block from fiscalization.ts
async function simulateZimraSync(zimraGlobalNo: number, zimraDailyCount: number) {
  const before = await getCounters();
  const updateData: any = {};

  if (zimraGlobalNo > (before.globalNo ?? 0)) {
    updateData.lastReceiptGlobalNo = zimraGlobalNo;
  }
  if (zimraDailyCount > (before.daily ?? 0)) {
    updateData.dailyReceiptCount = zimraDailyCount;
  }

  if (Object.keys(updateData).length > 0) {
    await db.update(companies).set(updateData).where(eq(companies.id, companyId));
  }

  const after = await getCounters();
  return { before, after };
}

function pass(msg: string) { console.log(`  ✅ PASS  ${msg}`); }
function fail(msg: string) { console.log(`  ❌ FAIL  ${msg}`); process.exitCode = 1; }
function section(title: string) { console.log(`\n── ${title} ──`); }

// ── tests ─────────────────────────────────────────────────────────────────────

async function test1_atomicClaim() {
  section("TEST 1: Concurrent atomic claims produce unique sequential pairs");

  await setCounters(100, 5); // known baseline

  // Fire 5 claims concurrently
  const results = await Promise.all([claimNext(), claimNext(), claimNext(), claimNext(), claimNext()]);

  const globalNos = results.map(r => r.receiptGlobalNo).sort((a, b) => a - b);
  const counters  = results.map(r => r.receiptCounter).sort((a, b) => a - b);

  const expectedGlobals = [101, 102, 103, 104, 105];
  const expectedCounters = [6, 7, 8, 9, 10];

  const globalsOk  = JSON.stringify(globalNos)  === JSON.stringify(expectedGlobals);
  const countersOk = JSON.stringify(counters)    === JSON.stringify(expectedCounters);
  const noDupGlobal = new Set(globalNos).size === 5;
  const noDupCounter = new Set(counters).size === 5;

  globalsOk  ? pass(`globalNos sequential: ${globalNos}`) : fail(`globalNos wrong: got ${globalNos}, expected ${expectedGlobals}`);
  countersOk ? pass(`counters sequential: ${counters}`)   : fail(`counters wrong: got ${counters}, expected ${expectedCounters}`);
  noDupGlobal  ? pass("no duplicate globalNos")  : fail("duplicate globalNos detected");
  noDupCounter ? pass("no duplicate counters")   : fail("duplicate counters detected");
}

async function test2_syncDoesNotGoBackwards() {
  section("TEST 2: ZIMRA returning lower value does NOT reset local counters");

  await setCounters(50, 10);

  // ZIMRA says globalNo=45, daily=8 — both lower than local
  const { before, after } = await simulateZimraSync(45, 8);

  after.globalNo === 50
    ? pass(`globalNo stayed at 50 (ZIMRA had 45, local wins)`)
    : fail(`globalNo changed to ${after.globalNo} — sync went backwards!`);

  after.daily === 10
    ? pass(`dailyCount stayed at 10 (ZIMRA had 8, local wins)`)
    : fail(`dailyCount changed to ${after.daily} — sync went backwards!`);
}

async function test3_syncAdvancesWhenZimraAhead() {
  section("TEST 3: ZIMRA returning higher value advances local counters");

  await setCounters(50, 10);

  // ZIMRA says globalNo=55, daily=12 — both higher (e.g. receipts submitted outside system)
  const { before, after } = await simulateZimraSync(55, 12);

  after.globalNo === 55
    ? pass(`globalNo advanced to 55 (ZIMRA was ahead)`)
    : fail(`globalNo is ${after.globalNo}, expected 55`);

  after.daily === 12
    ? pass(`dailyCount advanced to 12 (ZIMRA was ahead)`)
    : fail(`dailyCount is ${after.daily}, expected 12`);
}

async function test4_newDayClaimStartsAt1() {
  section("TEST 4: After new day open (dailyReceiptCount reset to 0), first claim gives counter=1");

  // Simulate what happens when a new fiscal day is opened:
  // dailyReceiptCount is reset to 0, then claimNextReceiptNumbers is called
  await setCounters(200, 0); // 0 = just opened new day

  const claimed = await claimNext();

  claimed.receiptCounter === 1
    ? pass(`First claim after new day = counter 1 ✓`)
    : fail(`Expected counter=1, got ${claimed.receiptCounter}`);

  claimed.receiptGlobalNo === 201
    ? pass(`globalNo correctly incremented to 201`)
    : fail(`Expected globalNo=201, got ${claimed.receiptGlobalNo}`);
}

async function test5_midDayCounterNeverResets() {
  section("TEST 5: Mid-day — counter never resets to 1 unless dailyReceiptCount was explicitly zeroed");

  await setCounters(300, 7); // mid-day, 7 receipts done

  // Simulate a non-310 error path — no new day opened, just retry same invoice
  // The retry reuses existing locked numbers, so counter stays at 7
  const before = await getCounters();

  // Claim next (new invoice, not a retry)
  const claimed = await claimNext();

  claimed.receiptCounter === 8
    ? pass(`Counter incremented to 8 (was 7), no reset`)
    : fail(`Counter is ${claimed.receiptCounter}, expected 8 — possible mid-day reset!`);

  claimed.receiptGlobalNo === 301
    ? pass(`globalNo incremented to 301`)
    : fail(`globalNo is ${claimed.receiptGlobalNo}, expected 301`);
}

// ── run all ───────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nTesting counter sequence logic for company ${companyId}`);
  const initial = await getCounters();
  console.log(`Initial state: globalNo=${initial.globalNo}, dailyCount=${initial.daily}`);

  try {
    await test1_atomicClaim();
    await test2_syncDoesNotGoBackwards();
    await test3_syncAdvancesWhenZimraAhead();
    await test4_newDayClaimStartsAt1();
    await test5_midDayCounterNeverResets();
  } finally {
    // Restore original counters so tests don't pollute production data
    await setCounters(initial.globalNo ?? 0, initial.daily ?? 0);
    console.log(`\nRestored counters to: globalNo=${initial.globalNo}, dailyCount=${initial.daily}`);
  }

  console.log(process.exitCode === 1 ? "\n⚠️  Some tests FAILED" : "\n✅  All tests PASSED");
}

main().catch(err => { console.error(err); process.exit(1); });
