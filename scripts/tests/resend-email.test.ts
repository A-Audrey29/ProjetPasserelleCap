/**
 * Tests for EmailService.resendFromLog.
 * Never touches a real database: DATABASE_URL is a dummy and storage writes are stubbed.
 * Run: npx tsx scripts/tests/resend-email.test.ts
 */
process.env.DATABASE_URL = 'postgresql://dummy:dummy@localhost:1/dummy';
process.env.NODE_ENV = 'test';
process.env.EMAIL_FROM_NAME = 'Test Sender';
process.env.EMAIL_FROM_ADDRESS = 'sender@example.com';

import assert from 'node:assert/strict';

let passed = 0;
function check(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve(fn()).then(
    () => { passed++; console.log(`  ok  ${name}`); },
    (err) => { console.error(`  FAIL ${name}\n       ${err.message}`); process.exitCode = 1; },
  );
}

const { storage } = await import('../../server/storage.js');
const { default: emailService } = await import('../../server/services/emailService.js');

const created: any[] = [];
(storage as any).createEmailLog = async (log: any) => {
  created.push(log);
  return { ...log, id: `new-${created.length}` };
};

const failedLog: any = {
  id: 'old-1',
  to: ['cap-cd@example.org', 'other@example.org'],
  cc: null,
  bcc: ['audit@example.org'],
  subject: 'Contrat EVS/CS signé - Déblocage subvention 70%',
  text: 'plain body',
  html: '<p>html body</p>',
  meta: { event: 'workshop_contract_evs_signed', sessionId: 's1' },
  status: 'error',
  error: 'Invalid login: 535 5.7.8 Authentication failed',
};

console.log('resendFromLog');

// Test env => intercept mode: deliver() logs instead of sending, which lets us inspect the payload.
await check('rebuilds recipients, subject and body from the log', async () => {
  created.length = 0;
  const result: any = await emailService.resendFromLog(failedLog);
  assert.equal(result.success, true);
  assert.equal(created.length, 1);
  assert.deepEqual(created[0].to, failedLog.to);
  assert.deepEqual(created[0].bcc, failedLog.bcc);
  assert.equal(created[0].cc, null);
  assert.equal(created[0].subject, failedLog.subject);
  assert.equal(created[0].html, failedLog.html);
  assert.equal(created[0].text, failedLog.text);
});

await check('keeps original meta and links back to the failed log', async () => {
  created.length = 0;
  await emailService.resendFromLog(failedLog);
  assert.equal(created[0].meta.event, 'workshop_contract_evs_signed');
  assert.equal(created[0].meta.sessionId, 's1');
  assert.equal(created[0].meta.resentFromLogId, 'old-1');
});

await check('handles a log without meta/text/cc', async () => {
  created.length = 0;
  const result: any = await emailService.resendFromLog({
    ...failedLog, meta: null, text: null, cc: null, bcc: null,
  });
  assert.equal(result.success, true);
  assert.equal(created[0].meta.resentFromLogId, 'old-1');
  assert.equal(created[0].text, null);
});

await check('reports failure when SMTP is down and logs a new error row', async () => {
  created.length = 0;
  const svc: any = emailService;
  const original = { mode: svc.isInterceptMode, transporter: svc.transporter };
  svc.isInterceptMode = false;
  svc.transporter = { sendMail: async () => { throw new Error('Invalid login: 535'); } };
  try {
    const result: any = await emailService.resendFromLog(failedLog);
    assert.equal(result.success, false);
    assert.match(result.error, /535/);
    assert.equal(created.length, 1);
    assert.equal(created[0].status, 'error');
  } finally {
    svc.isInterceptMode = original.mode;
    svc.transporter = original.transporter;
  }
});

await check('marks the new row as sent when SMTP succeeds', async () => {
  created.length = 0;
  const svc: any = emailService;
  const original = { mode: svc.isInterceptMode, transporter: svc.transporter };
  let sentOptions: any;
  svc.isInterceptMode = false;
  svc.transporter = { sendMail: async (opts: any) => { sentOptions = opts; return { messageId: 'abc' }; } };
  try {
    const result: any = await emailService.resendFromLog(failedLog);
    assert.equal(result.success, true);
    assert.equal(created[0].status, 'sent');
    assert.equal(created[0].messageId, 'abc');
    assert.equal(sentOptions.from.address, 'sender@example.com');
  } finally {
    svc.isInterceptMode = original.mode;
    svc.transporter = original.transporter;
  }
});

console.log(`\n${passed} passed`);
process.exit(process.exitCode ?? 0);
