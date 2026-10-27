/**
 * Tests for buildSecureOptions (FTPS extra CA certificate).
 * No network access.
 * Run: npx tsx scripts/tests/ftps-secure-options.test.ts
 */
import assert from 'node:assert/strict';
import tls from 'node:tls';
import { buildSecureOptions } from '../../server/utils/ftpsUpload';

const PEM = '-----BEGIN CERTIFICATE-----\nMIIBfake\n-----END CERTIFICATE-----';

let passed = 0;
let failed = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`✗ ${name}\n  ${(err as Error).message}`);
  }
}

check('returns undefined when FTP_CA_CERT is not set', () => {
  assert.equal(buildSecureOptions(undefined), undefined);
  assert.equal(buildSecureOptions(''), undefined);
  assert.equal(buildSecureOptions('   '), undefined);
});

check('keeps Node default roots and appends the extra cert', () => {
  const opts = buildSecureOptions(PEM);
  assert.ok(opts);
  assert.equal(opts.ca.length, tls.rootCertificates.length + 1);
  assert.equal(opts.ca[opts.ca.length - 1], PEM);
});

check('converts escaped "\\n" (single-line env var) into real newlines', () => {
  const opts = buildSecureOptions(PEM.replace(/\n/g, '\\n'));
  assert.equal(opts?.ca[opts.ca.length - 1], PEM);
});

check('never disables certificate verification', () => {
  const opts = buildSecureOptions(PEM) as Record<string, unknown>;
  assert.equal('rejectUnauthorized' in opts, false);
});

check('throws on a value that is not a PEM certificate', () => {
  assert.throws(() => buildSecureOptions('not-a-cert'), /PEM certificate/);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
