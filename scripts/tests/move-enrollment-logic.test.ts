// Logic test of moveEnrollmentToSession. Run on a Neon TEST branch only:
//   DATABASE_URL=<test branch url> NODE_ENV=test npx tsx scripts/tests/move-enrollment-logic.test.ts
import fs from "fs";
import { db } from "../../server/db";
import { storage } from "../../server/storage";
import { workshops, organizations, ficheNavettes, workshopEnrollments } from "../../shared/schema";
import { eq, like, inArray, sql } from "drizzle-orm";

const P = "zztest-";
const WID = `${P}workshop`;
const OID = `${P}org`;
// Safety: refuse to run against the database configured in .env (production).
let guarded = false;
function assertNotProduction() {
  const host = (process.env.DATABASE_URL || "").match(/@([^/]+)\//)?.[1] || "";
  const envFile = fs.existsSync(".env") ? fs.readFileSync(".env", "utf8") : "";
  const prodHost = envFile.match(/^DATABASE_URL=.*@([^/]+)\//m)?.[1];
  if (!host || host === prodHost) throw new Error("REFUSING: DATABASE_URL is empty or is the production database");
  console.log("DB host:", host);
  guarded = true;
}

let pass = 0, fail = 0;
const check = (name: string, cond: boolean, extra?: unknown) => {
  cond ? pass++ : fail++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${cond ? "" : "  -> " + JSON.stringify(extra)}`);
};

async function cleanup() {
  await db.delete(workshopEnrollments).where(like(workshopEnrollments.ficheId, `${P}%`));
  await db.delete(ficheNavettes).where(like(ficheNavettes.id, `${P}%`));
  await db.delete(workshops).where(eq(workshops.id, WID));
  await db.delete(organizations).where(eq(organizations.orgId, OID));
}

async function mkFiche(key: string, n: number) {
  await db.insert(ficheNavettes).values({
    id: `${P}${key}`, ref: `ZZ-${key}`, state: "ACCEPTED_EVS", emitterId: "zz-emitter",
    assignedOrgId: OID, participantsCount: n,
  } as any);
}
async function mkEnr(key: string, session: number, n: number, o: Record<string, unknown> = {}) {
  const [e] = await db.insert(workshopEnrollments).values({
    id: `${P}enr-${key}`, ficheId: `${P}${key}`, workshopId: WID, evsId: OID,
    participantCount: n, sessionNumber: session, ...o,
  } as any).returning();
  return e;
}
const get = (key: string) => storage.getWorkshopEnrollment(`${P}enr-${key}`);
const opts = (o: any = {}) => ({ acknowledgeOverCapacity: false, ...o });

async function main() {
  assertNotProduction();

  const before = await db.select({ c: sql<number>`count(*)::int` }).from(workshopEnrollments);
  await cleanup();
  await db.insert(organizations).values({ orgId: OID, name: "ZZ TEST ORG", epciId: "zz-epci" } as any);
  await db.insert(workshops).values({ id: WID, objectiveId: "zz-obj", name: "ZZ TEST", minCapacity: 4, maxCapacity: 10 } as any);

  // Session 2: waiting, 3 fiches (7 pers). Session 3: contract signed, B1(5)+B2(4). Session 4: activity done.
  for (const [k, n] of [["A1",3],["A2",2],["A3",2],["B1",5],["B2",4],["C1",2]] as const) await mkFiche(k, n);
  await mkEnr("A1", 2, 3); await mkEnr("A2", 2, 2); await mkEnr("A3", 2, 2);
  const signedAt = new Date("2026-10-21");
  const ctr = { contractSignedByEVS: true, contractSignedAt: signedAt, contractCommunePdfUrl: "/uploads/navettes/x.pdf" };
  await mkEnr("B1", 3, 5, ctr); await mkEnr("B2", 3, 4, ctr);
  await mkEnr("C1", 4, 2, { ...ctr, activityDone: true });

  const mv = (k: string, to: number, o?: any) => storage.moveEnrollmentToSession(`${P}enr-${k}`, to, opts(o));

  // 1 engaged, no force
  let r = await mv("B1", 2);
  check("1 contract fiche, no force -> ALREADY_ENGAGED", !r.ok && r.code === "ENROLLMENT_ALREADY_ENGAGED", r);
  // 2 wrong ref
  r = await mv("B1", 2, { forceEngaged: true, confirmFicheRef: "FN-WRONG" });
  check("2 force + wrong ref -> MISMATCH", !r.ok && r.code === "FORCE_CONFIRMATION_MISMATCH", r);
  r = await mv("B1", 2, { forceEngaged: true });
  check("2b force + no ref -> MISMATCH", !r.ok && r.code === "FORCE_CONFIRMATION_MISMATCH", r);
  // 3 over capacity (7+5=12>10), nothing mutated
  r = await mv("B1", 2, { forceEngaged: true, confirmFicheRef: "ZZ-B1" });
  check("3 over capacity w/o ack -> OVER_CAPACITY", !r.ok && r.code === "OVER_CAPACITY" && r.projectedTotal === 12, r);
  let e = await get("B1");
  check("3b nothing changed after refusals", e!.sessionNumber === 3 && e!.contractSignedByEVS === true, e);
  // 4 success with force + ack, '#' prefix tolerated
  r = await mv("B1", 2, { forceEngaged: true, confirmFicheRef: "#ZZ-B1", acknowledgeOverCapacity: true });
  check("4 forced move OK", r.ok === true && r.fromSession === 3 && r.toSession === 2, r);
  e = await get("B1");
  check("4b B1 moved to session 2", e!.sessionNumber === 2, e);
  check("4c B1 contract cleared", !e!.contractSignedByEVS && !e!.contractSignedAt && e!.contractCommunePdfUrl === null, e);
  check("4d audit data returned (incl pdf url)", r.resetContract?.signedByEVS === true && r.resetContract?.communePdfUrl === "/uploads/navettes/x.pdf", r.resetContract);
  const b2 = await get("B2");
  check("4e B2 (other fiche in source) untouched", b2!.sessionNumber === 3 && b2!.contractSignedByEVS === true, b2);
  const [f] = await db.select().from(ficheNavettes).where(eq(ficheNavettes.id, `${P}B1`));
  check("4f fiche state unchanged", f.state === "ACCEPTED_EVS", f.state);
  const s2 = (await storage.getWorkshopSessionSummaries(WID, OID)).find(s => s.sessionNumber === 2)!;
  check("4g session 2 has no contract (stays waiting)", s2.contractSigned === false && s2.totalParticipants === 12, s2);
  // 5 move INTO contracted session (session 3 still has B2)
  r = await mv("A1", 3);
  check("5 move into contracted session OK", r.ok === true && r.toSession === 3, r);
  e = await get("A1");
  check("5b A1 has no contract of its own", !e!.contractSignedByEVS && e!.sessionNumber === 3, e);
  // 6 move last contracted fiche out (empties session 3), no over capacity
  r = await mv("B2", 2, { forceEngaged: true, confirmFicheRef: "ZZ-B2", acknowledgeOverCapacity: true });
  check("6 move B2 out of contracted session OK", r.ok === true, r);
  // 7 activity done blocked (source and target)
  r = await mv("C1", 2, { forceEngaged: true, confirmFicheRef: "ZZ-C1", acknowledgeOverCapacity: true });
  check("7 activity done source -> blocked", !r.ok && r.code === "ENROLLMENT_ALREADY_ENGAGED", r);
  r = await mv("A2", 4);
  check("7b target with activity done -> blocked", !r.ok && r.code === "TARGET_SESSION_LOCKED", r);
  // 8 misc
  r = await mv("A3", 2);
  check("8 same session -> SAME_SESSION", !r.ok && r.code === "SAME_SESSION", r);
  r = await mv("A3", 9);
  check("8b missing target -> NOT_FOUND", !r.ok && r.code === "TARGET_SESSION_NOT_FOUND", r);
  r = await storage.moveEnrollmentToSession("zz-nope", 2, opts());
  check("8c unknown enrollment", !r.ok && r.code === "ENROLLMENT_NOT_FOUND", r);

  await cleanup();
  const after = await db.select({ c: sql<number>`count(*)::int` }).from(workshopEnrollments);
  check("9 cleanup: enrollment count back to original", before[0].c === after[0].c, { before: before[0].c, after: after[0].c });
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
main().catch(async (e) => { console.error("ERROR", e?.message || e); if (guarded) { try { await cleanup(); } catch {} } process.exit(2); });
