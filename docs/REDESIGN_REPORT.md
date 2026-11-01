# Mobile redesign — 25 October 2026

## Changed

- Full-screen, swipeable onboarding with three illustrated pages, fixed bottom actions, six-second auto-advance and manual pause controls.
- Reduced-motion/screen-reader-aware carousel behavior.
- Login/create-account preview followed by concise role and school selection. Any login can proceed; no password is saved and no real account is created.
- Exact brand colours #ff6600 and #14213e, bundled Manrope typography and Iconsax SVG icons.
- Floating five-slot dock: four labelled destinations and a central quick-action button.
- Role-specific quick-action sheet with direct clock-in/out, new lesson, leave, payment and review shortcuts.
- Rebuilt parent/staff/operations homes, child fee navigation, payment selection/review, receipts, attendance and updates.
- Compact workspace rows, grouped profile/school settings, collapsed preview controls and transfer/reminder separation in finance.
- Native iOS glass where supported; web blur and opaque Android/accessibility fallbacks.
- Per-icon imports prevent the unused Iconsax catalogue from entering the bundle.

## Validation

- Domain/service tests: all 22 passed.
- Expo dependency compatibility: passed.
- Type checking, lint, rendering, browser workflows and narrow-screen review: in progress.

## Scope

Existing mock services, tenant permissions and local persistence are preserved. The front door no longer presents a “demo mode” choice; safety-relevant payment, payroll and attendance states remain labelled as previews/simulations. Authentication, real payment processing, push delivery and authoritative verification remain unimplemented.

Research and design decisions are documented in DESIGN_SYSTEM.md. Browser screenshots will be saved under docs/screenshots. Native Liquid Glass appearance still needs a supported iOS device; browser screenshots cannot verify that platform effect.
