# Schoolday

A mobile-first school operations demo for Nigerian private schools. Phase 1 runs entirely on the device. It does not authenticate real users, move money, contact a server or verify physical attendance.

## Run

Requirements: Node 24 LTS and pnpm 10.28.0.

```sh
pnpm install
pnpm start
```

Open with an Expo Go version compatible with the installed Expo SDK, or use a development build. Press `i` / `a` for an installed simulator/emulator. To review the mobile UI in a browser:

```sh
pnpm --filter @school/mobile web
```

This browser target is the Expo mobile app, not the planned web dashboard.

## Quality checks

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm format:check
pnpm --filter @school/mobile export
```

## Explore

Swipe through onboarding or choose **Get started**. Use **Log in** or **Create account** with any input, then select a workspace role and school. This is local account-entry preview: no real account is created and no password is saved.

The floating dock provides **Home**, your role’s workspace, a centre **+** for quick actions, **Updates**, and **You**. Use **You → Switch workspace** to explore another role, or tap the school row to switch schools. Preview controls live under **You → Preview settings**.

- Parent: children → fee breakdown → review payment → sample receipt. Full, partial and combined payments are supported. Transfer submissions await finance review.
- Staff: centre + → clock in/out, new lesson or leave request. Saved drafts persist across reloads.
- Finance: transfer review, student fees, payment history and local reminders.
- HR/leadership: team records, leave approvals and scoped payroll previews.

All records are synthetic. Financial and attendance verification states remain explicitly labelled as previews or simulations where they matter.

See [design decisions and research](docs/DESIGN_SYSTEM.md). The browser review script uses `SCHOOLDAY_URL` (default http://localhost:8085) and a disposable Chromium debugging session on port 9223.

## Repository

- `apps/mobile`: Expo Router, strict TypeScript, Zod, versioned local storage and replaceable services.
- `apps/backend`: Phase 2 plan only.
- `apps/web`: Phase 3 plan only.
- `docs`: architecture, security boundaries, contracts, offline policy and verification report.

Read [architecture](docs/ARCHITECTURE.md), [product specification](docs/PRODUCT_SPEC.md), [roadmap](docs/ROADMAP.md) and [Phase 1 report](docs/PHASE_1_REPORT.md).

Manrope is bundled locally; Iconsax supplies the interface icons. No secrets or real personal data are required.
