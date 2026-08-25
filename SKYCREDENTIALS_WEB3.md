# SkyCredentialsWeb3 — Wave 2 Slot #144 / Lane 12

**Status:** engineering beta / verifiable-credential metadata library.

SkyCredentialsWeb3 provides a bounded, deterministic metadata envelope and verification-plan contract for credential-shaped records. It intentionally does not issue credentials, sign proofs, resolve DIDs, check revocation/status services, or write anything to a blockchain.

## Metadata contract

The library validates and canonicalizes:
- HTTPS credential identifier;
- bounded issuer and subject DID references;
- bounded credential type set;
- optional HTTPS schema and status references;
- ISO timestamps with expiry after issuance;
- bounded JSON-like claims;
- deterministic SHA-256 metadata fingerprint.

Every output explicitly reports:
- `proofVerificationPerformed: false`;
- `identityVerificationPerformed: false`;
- `chainWritePerformed: false`.

The fingerprint is a deterministic content identifier for the normalized metadata. It is **not** a signature, proof, attestation, or blockchain commitment.

## Verification planning

`buildVerificationPlan()` returns the checks a verifier would still need to perform: proof validation, issuer resolution, and optional status/schema checks. Every check starts with `performed: false`, and the plan reports `verificationPerformed: false`.

## SKYCOIN4444 integration

Recommended composition:

`SkyDID -> SkyCredentialsWeb3 -> trusted verifier adapter -> SkyPolicy / consuming application`

SkyDID owns DID primitives/resolution contracts. SkyCredentialsWeb3 owns only normalized credential metadata and verification planning. A separately secured verifier must resolve the issuer, validate cryptographic proof material, evaluate status/schema references, and decide whether to trust the result.

## Security and standards boundary

This module does not claim W3C VC conformance certification, DID-method support, cryptographic proof verification, issuer authenticity, subject identity proofing, revocation checks, blockchain finality, wallet custody, regulatory compliance, or production deployment. Its deliberately restricted DID syntax is a local bounded reference format rather than a universal DID parser.
