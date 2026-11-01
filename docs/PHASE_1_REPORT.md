# Phase 1 implementation report

## Delivered

- pnpm monorepo with a runnable Expo Router mobile application; backend and web are explicitly documented future phases.
- Onboarding, transparent demo entry, seven role types and three separately branded schools.
- Membership validation, role-aware home screens and route guards, guarded service mutations, school/account-scoped snapshots and context-remounted navigation.
- Parent-linked children, permanent IDs and reference-only QR codes; itemized invoices, exact integer-kobo balances, partial/full/combined payments, failed outcomes, transfer review and mock receipts/history.
- Staff identity, attendance arrival/departure, deterministic demo verification/rejection, unverified offline records, lesson creation/editing and persisted leave drafts/submission/HR decisions.
- Staff search, finance summary, local fee reminders, scoped illustrative payroll, per-account notification read states and contextual links.
- Native UI primitives, safe-area/keyboard handling, accessible labels, empty/error feedback, versioned persistence, storage rollback and confirmed demo reset.
- Domain/service tests, an automated browser walkthrough and phase/security/offline/API documentation.

## Decisions

The mobile app owns its domain schemas until a second consumer justifies a shared package. Feature screens access a stable service interface and a scoped application hook; they never import seeds or storage. AsyncStorage holds one small versioned demo database; serialized writes publish state only after successful storage. SQLite/outbox migration is planned for production offline data. Native system fonts avoid startup downloads. No backend, credentials, payment gateway or real notification service was added.

## Validation

Checks were executed in this workspace on 24 October 2026.

- Expo dependency compatibility check: passed.
- Strict TypeScript: passed.
- ESLint: passed with no warnings or errors.
- Service/domain suite: all 22 tests passed, including money-input, payroll and per-user notification isolation.
- Prettier formatting check: passed.
- Expo development server: started successfully on port 8081; browser bundle served successfully.
- Automated 390 × 844 browser walkthrough: passed onboarding, partial payment/receipt, transfer approval, rendered tenant isolation, offline attendance, lesson persistence across reload, leave submission/sync/HR decision, parent payroll rejection and all seven role homes. Repeated after the initialization and tab-label fixes.
- Screenshot reviewed: docs/screenshots/parent-home.png. Tab label clipping found and fixed.
- Production export: passed for Android, iOS and web using `expo export --platform all --max-workers 1`; native Hermes bytecode and web artifacts were generated in apps/mobile/dist.
- iOS simulator execution: unavailable; this machine does not provide simctl.

## Known limitations

This is a frontend demo, not a deployable school data system. No real authentication, invitations, server tenant enforcement, physical attendance verification, payment settlement, payroll transfer or notification delivery exists.

Offline mode is an explicit simulation control, not automatic connectivity detection. Local persistence is unencrypted synthetic data storage. Data is not synchronized across devices. School settings and payroll processing are read-only previews. Student/staff creation, bulk imports, real academic configuration, device evidence capture and real QR resolution remain later-phase work. Receipt export/sharing and app-store packaging are not implemented.

Android/iOS production bundle export does not constitute native device execution. Physical-device accessibility, keyboard, safe-area, performance and lifecycle QA remains required before a pilot.

## Next phase

Start with backend authentication, membership resolution and PostgreSQL tenant isolation. Establish versioned contracts and audit logging; implement invoice ledger/payment verification and attendance policy enforcement; then replace mobile mock services, migrate offline data to SQLite/outbox and introduce delivery adapters. Build the web operations dashboard only after those contracts stabilize. See ROADMAP.md for sequencing and backend layer responsibilities.
