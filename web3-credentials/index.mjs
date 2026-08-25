import { createHash } from 'node:crypto';

const SAFE_TYPE = /^[A-Za-z][A-Za-z0-9._:-]{0,63}$/;
const SAFE_DID = /^did:[a-z0-9]{1,32}:[A-Za-z0-9._:%-]{1,200}$/;
const MAX_TYPES = 16;
const MAX_CLAIMS = 64;

function assertString(value, field, max = 512) {
  if (typeof value !== 'string') throw new Error(`invalid_${field}`);
  const normalized = value.trim();
  if (normalized.length < 1 || normalized.length > max) throw new Error(`invalid_${field}`);
  return normalized;
}

function assertDid(value, field) {
  const did = assertString(value, field, 256);
  if (!SAFE_DID.test(did)) throw new Error(`invalid_${field}`);
  return did;
}

function assertHttpsUrl(value, field) {
  const raw = assertString(value, field, 1024);
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`invalid_${field}`);
  }
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error(`invalid_${field}`);
  return url.toString();
}

function compareCodeUnits(a, b) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function canonicalize(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('invalid_claim_value');
    return value;
  }
  if (Array.isArray(value)) return value.map(canonicalize);
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => compareCodeUnits(a, b))
        .map(([key, nested]) => [key, canonicalize(nested)]),
    );
  }
  throw new Error('invalid_claim_value');
}

function validateClaims(claims) {
  if (!claims || typeof claims !== 'object' || Array.isArray(claims)) throw new Error('invalid_claims');
  const entries = Object.entries(claims);
  if (entries.length < 1 || entries.length > MAX_CLAIMS) throw new Error('invalid_claim_count');
  const result = {};
  for (const [key, value] of entries) {
    if (!SAFE_TYPE.test(key)) throw new Error('invalid_claim_key');
    result[key] = canonicalize(value);
  }
  const encoded = JSON.stringify(result);
  if (Buffer.byteLength(encoded, 'utf8') > 32 * 1024) throw new Error('claims_too_large');
  return result;
}

export function createCredentialMetadata(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('invalid_credential');
  const id = assertHttpsUrl(input.id, 'credential_id');
  const issuer = assertDid(input.issuer, 'issuer');
  const subject = assertDid(input.subject, 'subject');
  if (!Array.isArray(input.types) || input.types.length < 1 || input.types.length > MAX_TYPES) {
    throw new Error('invalid_types');
  }
  const types = [...new Set(input.types.map((type) => {
    const value = assertString(type, 'type', 64);
    if (!SAFE_TYPE.test(value)) throw new Error('invalid_type');
    return value;
  }))].sort(compareCodeUnits);
  const schema = input.schema === undefined || input.schema === null ? null : assertHttpsUrl(input.schema, 'schema');
  const status = input.status === undefined || input.status === null ? null : assertHttpsUrl(input.status, 'status');
  const claims = validateClaims(input.claims);

  const issuedAt = assertString(input.issuedAt, 'issued_at', 40);
  const issuedDate = new Date(issuedAt);
  if (Number.isNaN(issuedDate.getTime()) || issuedDate.toISOString() !== issuedAt) throw new Error('invalid_issued_at');

  let expiresAt = null;
  if (input.expiresAt !== undefined && input.expiresAt !== null) {
    expiresAt = assertString(input.expiresAt, 'expires_at', 40);
    const expiry = new Date(expiresAt);
    if (Number.isNaN(expiry.getTime()) || expiry.toISOString() !== expiresAt || expiry <= issuedDate) {
      throw new Error('invalid_expires_at');
    }
  }

  const metadata = {
    id,
    issuer,
    subject,
    types,
    schema,
    status,
    issuedAt,
    expiresAt,
    claims,
    proofVerificationPerformed: false,
    identityVerificationPerformed: false,
    chainWritePerformed: false,
  };
  const canonical = JSON.stringify(canonicalize(metadata));
  return {
    ...metadata,
    fingerprint: `sha256:${createHash('sha256').update(canonical).digest('hex')}`,
  };
}

export function buildVerificationPlan(metadata) {
  const credential = createCredentialMetadata(metadata);
  return {
    credentialId: credential.id,
    issuer: credential.issuer,
    checks: [
      { kind: 'proof', required: true, performed: false },
      { kind: 'issuer-resolution', required: true, performed: false },
      ...(credential.status ? [{ kind: 'status', required: true, performed: false }] : []),
      ...(credential.schema ? [{ kind: 'schema', required: true, performed: false }] : []),
    ],
    verificationPerformed: false,
  };
}
