# Skycoin Protocol Upgrade — Architecture

## Scope

This repository is a TypeScript/React application with server, database, and protocol-adjacent upgrade work. It is **not** treated as a consensus engine solely because its name contains `Protocol`.

## Current execution path

```text
Browser / Client
      |
      v
React application
      |
      v
TRPC / Express server
      |
      +----> Drizzle / MySQL
      |
      +----> AWS S3
      |
      +----> Web3 / wallet integrations
      |
      v
Application-domain upgrade logic
```

## Repository evidence

The package defines explicit `build`, `check`, `test`, `start`, and database migration commands. The test runner is Vitest and the application uses Drizzle/MySQL for persistence.

## Protocol boundary

Protocol-critical behavior must remain isolated from UI concerns and must define explicit contracts for:

1. input validation
2. authorization/signature checks where applicable
3. deterministic state transitions
4. persistence/transaction boundaries
5. event emission
6. rollback/error behavior

Do not infer consensus guarantees from application-level upgrade code.

## Integration target

Long-term, reusable protocol contracts should move toward the canonical SKYCOIN4444 workspace:

```text
packages/
  protocol-types/
  api-contracts/
  events/

services/
  protocol/
  ledger/
  gateway/
```

Existing functionality should be preserved and consolidated rather than duplicated.

## Verification requirements

Before production classification, CI should demonstrate:

- typecheck
- unit tests
- integration tests
- database migration tests against an ephemeral/test database
- API contract tests
- security/dependency scanning
- production build

## Current limitations

The repository audit does not establish consensus implementation, a production ledger, live database availability, successful deployment, or production security certification. Those claims require separate runtime evidence.
