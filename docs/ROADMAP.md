# Implementation roadmap

## Phase 1 — Mobile foundation and demo

Establish workspace, strict types, contracts, tenant-scoped persistence, task-oriented native screens and tests. Complete parent fee/payment and staff attendance/draft/request flows before backend work. Record actual validation in PHASE_1_REPORT.md.

## Phase 2 — Production backend

1. Express/TypeScript application, validated environment, structured logs, request correlation, centralized errors and graceful shutdown.
2. PostgreSQL/Prisma schema and migrations; authentication, invitation lifecycle, membership resolution and server tenant isolation.
3. Student/guardian and staff services, stable contracts, pagination and authorization integration tests.
4. Integer-money invoice ledger, immutable payment allocations, provider integration, verified webhooks, idempotency, reconciliation and audited transfer review.
5. Attendance policies and evidence verification, device/server time discrepancy handling, duplicate checks, privacy/retention policy.
6. Versioned sync/outbox protocol, conflict resolution, rejected-action recovery and SQLite migration.
7. Audited leave decisions, actual payroll access controls and notification delivery adapters.
8. Operational readiness: backups, rate limits, observability, disaster recovery and deployment tests.

Controllers translate HTTP; middleware resolves auth/context and enforces access; services implement use cases; repositories isolate persistence; validators parse external input; integrations wrap providers; jobs handle retries/reminders. Routes and entry points contain no business logic.

## Phase 3 — Web operations

Build apps/web for bulk student/staff management, import previews, fee configuration, reports, payroll administration and school settings. Reuse framework-independent contracts/domain rules, not React Native UI or Prisma-generated models. Select framework after deployment and authentication constraints are established.
