import test from 'node:test';
import assert from 'node:assert/strict';
import { buildVerificationPlan, createCredentialMetadata } from './index.mjs';

const base = {
  id: 'https://credentials.skycoin4444.example/credential/123',
  issuer: 'did:sky:issuer123',
  subject: 'did:sky:user456',
  types: ['CourseCredential', 'VerifiableCredential'],
  schema: 'https://schemas.skycoin4444.example/course-v1.json',
  status: 'https://status.skycoin4444.example/credential/123',
  issuedAt: '2026-08-25T09:00:00.000Z',
  expiresAt: '2027-08-25T09:00:00.000Z',
  claims: { courseId: 'course.1', score: 97, nested: { level: 'advanced' } },
};

test('creates deterministic metadata regardless of claim/type order', () => {
  const first = createCredentialMetadata(base);
  const second = createCredentialMetadata({
    ...base,
    types: ['VerifiableCredential', 'CourseCredential', 'CourseCredential'],
    claims: { nested: { level: 'advanced' }, score: 97, courseId: 'course.1' },
  });
  assert.equal(first.fingerprint, second.fingerprint);
  assert.deepEqual(first.types, ['CourseCredential', 'VerifiableCredential']);
  assert.equal(first.proofVerificationPerformed, false);
  assert.equal(first.identityVerificationPerformed, false);
  assert.equal(first.chainWritePerformed, false);
});

test('builds a verification plan without pretending checks ran', () => {
  const plan = buildVerificationPlan(base);
  assert.equal(plan.verificationPerformed, false);
  assert.deepEqual(plan.checks.map((check) => check.kind), [
    'proof',
    'issuer-resolution',
    'status',
    'schema',
  ]);
  assert.ok(plan.checks.every((check) => check.performed === false));
});

test('rejects unsafe identifiers, dates, URLs and oversized type sets', () => {
  assert.throws(() => createCredentialMetadata({ ...base, issuer: 'issuer123' }), /invalid_issuer/);
  assert.throws(() => createCredentialMetadata({ ...base, id: 'http://insecure.example/1' }), /invalid_credential_id/);
  assert.throws(() => createCredentialMetadata({ ...base, expiresAt: base.issuedAt }), /invalid_expires_at/);
  assert.throws(() => createCredentialMetadata({ ...base, types: Array.from({ length: 17 }, (_, i) => `Type${i}`) }), /invalid_types/);
});

test('rejects unsupported claim values and excessive claim payloads', () => {
  assert.throws(() => createCredentialMetadata({ ...base, claims: { bad: Number.NaN } }), /invalid_claim_value/);
  assert.throws(() => createCredentialMetadata({ ...base, claims: { huge: 'x'.repeat(33 * 1024) } }), /claims_too_large/);
});
