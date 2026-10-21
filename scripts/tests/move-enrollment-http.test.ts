// HTTP test of the move route. Start the server first on port 3012 with the TEST branch url:
//   PORT=3012 DATABASE_URL=<test branch url> npx tsx server/index.ts
// then: DATABASE_URL=<test branch url> NODE_ENV=test npx tsx scripts/tests/move-enrollment-http.test.ts
import fs from "fs";
import bcrypt from "bcryptjs";
import { db } from "../../server/db";
import { users, workshops, organizations, ficheNavettes, workshopEnrollments, auditLogs } from "../../shared/schema";
import { eq, like } from "drizzle-orm";

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

const BASE = "http://localhost:3012";
const P = "zzhttp-"; const WID = `${P}workshop`; const OID = `${P}org`;
let pass = 0, fail = 0;
const check = (n: string, c: boolean, x?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${n}${c ? "" : "  -> " + JSON.stringify(x)}`); };

async function cleanup() {
  await db.delete(auditLogs).where(like(auditLogs.entityId, `${P}%`));
  await db.delete(workshopEnrollments).where(like(workshopEnrollments.ficheId, `${P}%`));
  await db.delete(ficheNavettes).where(like(ficheNavettes.id, `${P}%`));
  await db.delete(users).where(like(users.id, `${P}%`));
  await db.delete(workshops).where(eq(workshops.id, WID));
  await db.delete(organizations).where(eq(organizations.orgId, OID));
}
async function login(email: string, password: string) {
  const r = await fetch(`${BASE}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
  const cookie = (r.headers.get("set-cookie") || "").split(";")[0];
  return { ok: r.ok, cookie };
}
const call = (cookie: string, method: string, path: string, body?: unknown) =>
  fetch(`${BASE}${path}`, { method, headers: { "Content-Type": "application/json", cookie }, body: body ? JSON.stringify(body) : undefined })
    .then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) as any }));

async function main() {
  assertNotProduction();
  await cleanup();
  const hash = await bcrypt.hash("Zz-test-12345!", 4);
  await db.insert(organizations).values({ orgId: OID, name: "ZZ HTTP ORG", epciId: "zz" } as any);
  await db.insert(workshops).values({ id: WID, objectiveId: "zz", name: "ZZ HTTP ATELIER", minCapacity: 4, maxCapacity: 10 } as any);
  await db.insert(users).values([
    { id: `${P}admin`, email: "zzhttp-admin@example.test", passwordHash: hash, firstName: "Z", lastName: "Admin", role: "ADMIN" },
    { id: `${P}evs`, email: "zzhttp-evs@example.test", passwordHash: hash, firstName: "Z", lastName: "Evs", role: "EVS_CS", orgId: OID },
  ] as any);
  for (const [k, n] of [["A1",3],["A2",4],["B1",5],["B2",4]] as const)
    await db.insert(ficheNavettes).values({ id: `${P}${k}`, ref: `ZZH-${k}`, state: "ACCEPTED_EVS", emitterId: "zz", assignedOrgId: OID, participantsCount: n } as any);
  const enr = (k: string, s: number, n: number, o: any = {}) => db.insert(workshopEnrollments).values({ id: `${P}enr-${k}`, ficheId: `${P}${k}`, workshopId: WID, evsId: OID, participantCount: n, sessionNumber: s, ...o } as any);
  await enr("A1", 2, 3); await enr("A2", 2, 4);
  const ctr = { contractSignedByEVS: true, contractSignedAt: new Date("2026-10-21"), contractCommunePdfUrl: "/uploads/navettes/zz.pdf" };
  await enr("B1", 3, 5, ctr); await enr("B2", 3, 4, ctr);

  const admin = await login("zzhttp-admin@example.test", "Zz-test-12345!");
  const evs = await login("zzhttp-evs@example.test", "Zz-test-12345!");
  check("login admin + evs", admin.ok && evs.ok, { admin: admin.ok, evs: evs.ok });
  const url = (k: string, s = "session") => `/api/enrollments/${P}enr-${k}/${s}`;

  let r = await call(evs.cookie, "PATCH", url("B1"), { targetSessionNumber: 2, reason: "test" });
  check("H1 EVS_CS refused (403)", r.status === 403, r);
  r = await call(admin.cookie, "PATCH", url("B1"), { targetSessionNumber: 2 });
  check("H2 missing reason -> 400 (Zod)", r.status === 400, r);
  r = await call(admin.cookie, "PATCH", url("B1"), { targetSessionNumber: 2, reason: "test motif" });
  check("H3 contract fiche w/o force -> 409", r.status === 409 && r.body?.code === "ENROLLMENT_ALREADY_ENGAGED", r);
  r = await call(admin.cookie, "PATCH", url("B1"), { targetSessionNumber: 2, reason: "test motif", forceEngaged: true, confirmFicheRef: "nope" });
  check("H4 wrong ref -> 409 MISMATCH", r.status === 409 && r.body?.code === "FORCE_CONFIRMATION_MISMATCH", r);
  r = await call(admin.cookie, "PATCH", url("B1"), { targetSessionNumber: 2, reason: "test motif", forceEngaged: true, confirmFicheRef: "ZZH-B1" });
  check("H5 over capacity (7+5=12>10) -> 409", r.status === 409 && r.body?.code === "OVER_CAPACITY", r);
  let t = await call(admin.cookie, "GET", url("B1", "move-targets"));
  check("H6 move-targets exposes contractSigned, session 2 eligible", t.status === 200 && t.body?.enrollment?.contractSigned === true && t.body?.targets?.find((x: any) => x.sessionNumber === 2)?.eligible === true, t.body?.enrollment);
  r = await call(admin.cookie, "PATCH", url("B1"), { targetSessionNumber: 2, reason: "structure a coché le contrat trop tôt", forceEngaged: true, confirmFicheRef: "#ZZH-B1", acknowledgeOverCapacity: true });
  check("H7 forced move -> 200", r.status === 200 && r.body?.toSession === 2, r);
  const [e] = await db.select().from(workshopEnrollments).where(eq(workshopEnrollments.id, `${P}enr-B1`));
  check("H8 DB: moved + contract cleared", e.sessionNumber === 2 && !e.contractSignedByEVS && e.contractCommunePdfUrl === null, e);
  check("H9 DB: session 2 now full -> locked (recalc ran)", e.isLocked === true, e.isLocked);
  const logs = await db.select().from(auditLogs).where(eq(auditLogs.entityId, `${P}enr-B1`));
  const m: any = logs[0]?.meta;
  check("H10 audit log written w/ reason + previous contract", logs.length === 1 && logs[0].action === "MOVE_ENROLLMENT_SESSION" && m?.forcedWithContract === true && m?.resetContract?.communePdfUrl === "/uploads/navettes/zz.pdf" && m?.reason?.includes("trop tôt") && m?.ficheRef === "ZZH-B1", logs);
  const [b2] = await db.select().from(workshopEnrollments).where(eq(workshopEnrollments.id, `${P}enr-B2`));
  check("H11 B2 untouched", b2.sessionNumber === 3 && b2.contractSignedByEVS === true, b2);
  // permanent use: move into the still-contracted session 3
  r = await call(admin.cookie, "PATCH", url("A1"), { targetSessionNumber: 3, reason: "famille rattachée à l'atelier commencé" });
  check("H12 move into contracted session -> 200", r.status === 200, r);

  await cleanup();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
main().catch(async (e) => { console.error("ERROR", e?.message || e); if (guarded) { try { await cleanup(); } catch {} } process.exit(2); });
