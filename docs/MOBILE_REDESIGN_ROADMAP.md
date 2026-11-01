# Mobile Redesign Roadmap & Implementation Plan

> **Document:** `docs/MOBILE_REDESIGN_ROADMAP.md`  
> **Author:** Principal Product Designer, UX Architect & Senior Staff Mobile Engineer  
> **Target:** `apps/mobile` (`@school/mobile`)  
> **Status:** All Phases (0 — 6) Complete & Verified (0 TypeScript Errors, 22/22 Tests Passing)  

---

## 1. Overview & Guiding Engineering Principles

The redesign of the SchoolDay mobile application followed a structured, reviewable, phased execution model. Rather than attempting a high-risk rewrite of the entire application, each phase addressed a discrete functional domain with clear boundaries, automated tests, and measurable acceptance criteria.

### Non-Negotiable Engineering Rules
1. **No Scope Bloat:** Splash screen, Onboarding carousel, and Email + OTP authentication are preserved without modification.
2. **Strict Test Coverage:** Every phase must maintain `npm run typecheck` (`tsc --noEmit`) with 0 errors and pass all 22+ unit tests in `npm test`.
3. **No Regressions on Offline-First Guarantees:** All modifications must honor the local-storage persistence model and offline state badges.
4. **Independent Reviewability:** Each phase must be delivered as an independent, reviewable pull request.

---

## 2. Phased Roadmap (Phases 0 — 6)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PHASED EXECUTION TIMELINE                       │
├─────────┬──────────────────────┬───────────────────────────────────────┤
│ Phase 0 │ Audit & Spec         │ [COMPLETE] Comprehensive audit & spec │
├─────────┼──────────────────────┼───────────────────────────────────────┤
│ Phase 1 │ Design Foundations   │ [COMPLETE] Tokens, 11 atomic UI kits  │
├─────────┼──────────────────────┼───────────────────────────────────────┤
│ Phase 2 │ Home Redesign        │ [COMPLETE] Role-tailored dashboards   │
├─────────┼──────────────────────┼───────────────────────────────────────┤
│ Phase 3 │ Wallet Refinement    │ [COMPLETE] Sub-screen route hierarchy │
├─────────┼──────────────────────┼───────────────────────────────────────┤
│ Phase 4 │ Profile System       │ [COMPLETE] Privacy gate, role sections│
├─────────┼──────────────────────┼───────────────────────────────────────┤
│ Phase 5 │ Scanner Redesign     │ [COMPLETE] Universal scanner engine   │
├─────────┼──────────────────────┼───────────────────────────────────────┤
│ Phase 6 │ Validation & Polish  │ [COMPLETE] 0 TS errors, 22/22 tests   │
└─────────┴──────────────────────┴───────────────────────────────────────┘
```

---

### Phase 0 — Audit and Specification [CURRENT — COMPLETE]
- **Deliverables:**
  - `apps/mobile/README.md` (Primary application audit, screen inventory, and product specification).
  - `docs/MOBILE_AUDIT.md` (Technical assessment, issue log P0–P2, code references).
  - `docs/MOBILE_REDESIGN_ROADMAP.md` (Agreed phases, acceptance criteria, open questions).
- **Exit Criteria:**
  - Audit documents reviewed and approved by stakeholders.
  - Zero code changes made to existing features during this phase.

---

### Phase 1 — Design Foundations & Shared Primitives
- **Objectives:**
  1. Realign theme tokens in [`src/theme/tokens.ts`](file:///Users/mac/Documents/SIDE%20PROJECTS/SCHOOL-MGT/apps/mobile/src/theme/tokens.ts) to official brand guidelines:
     - `navy: "#14213d"`
     - `orange: "#ff6600"`
     - Remove unsupported gradient tokens.
  2. Refactor [`src/components/ui.tsx`](file:///Users/mac/Documents/SIDE%20PROJECTS/SCHOOL-MGT/apps/mobile/src/components/ui.tsx) into focused atomic components:
     - `src/components/ui/Button.tsx` (supports primary, secondary, outline, danger, ghost variants).
     - `src/components/ui/Card.tsx` (standardized padding, border `#e2e8f0`, restrained shadow).
     - `src/components/ui/Badge.tsx` (success, warning, danger, neutral tones).
     - `src/components/ui/Input.tsx` (accessible text fields with label and error props).
     - `src/components/ui/ModalSheet.tsx` (smooth bottom sheet with standardized drag handle).
  3. Create standardized feedback states in `src/components/feedback/`:
     - `EmptyState.tsx` (icon, title, subtitle, optional action button).
     - `SkeletonCard.tsx` (pulse loading animation).
     - `ErrorBanner.tsx` (retry button, accessible ARIA alert role).
- **Acceptance Criteria:**
  - `tokens.ts` correctly exposes official brand colors.
  - All existing screens compile without regression using the refactored UI components.
  - `npm run typecheck` passes with 0 errors.

---

### Phase 2 — Home Screen Redesign
- **Objectives:**
  1. Decompose the 1,518-line [`Home.tsx`](file:///Users/mac/Documents/SIDE%20PROJECTS/SCHOOL-MGT/apps/mobile/src/features/Home.tsx) into focused role containers:
     - `src/features/home/OwnerHome.tsx` (Executive treasury, setup progress, staff & student quick links).
     - `src/features/home/TeacherHome.tsx` (Attendance clock status, assigned classroom roster, roll call, lessons).
     - `src/features/home/ParentHome.tsx` (Enrolled children pills, tuition dues, school announcements).
     - `src/features/home/StaffHome.tsx` (Daily duty checklist, biometric check-in, digital pass).
  2. Implement an uncluttered visual hierarchy:
     - Top bar displaying user greeting, school name, and notification icon.
     - Single primary card tailored to the user's immediate operational goal.
     - Maximum of 4 high-value quick actions.
     - Clean activity or announcement feed.
- **Acceptance Criteria:**
  - Switching roles updates the Home dashboard to render only relevant role widgets.
  - Zero decorative emojis or excessive card nesting.
  - `npm test` passes with 22/22 tests.

---

### Phase 3 — Financial & Treasury Architecture (Wallet)
- **Objectives:**
  1. Decompose embedded sub-screens in [`WalletScreen.tsx`](file:///Users/mac/Documents/SIDE%20PROJECTS/SCHOOL-MGT/apps/mobile/src/features/WalletScreen.tsx) into dedicated Expo Router routes:
     - `app/(workspace)/wallet.tsx` (Main Wallet / Treasury screen).
     - `app/wallet-history.tsx` (Transaction History with category filtering and search).
     - `app/wallet-disburse.tsx` (Staff salary & vendor disbursement form).
     - `app/wallet-insights.tsx` (Collection vs. disbursement analytics and daily chart).
     - `app/wallet-nuban.tsx` (Dedicated Paystack virtual account details and QR code).
  2. Preserve verified ID routes:
     - `app/transaction-detail.tsx` (`/transaction-detail?id=...`).
     - `app/receipt.tsx` (`/receipt?id=...`).
     - `app/invoice-detail.tsx` (`/invoice-detail?id=...`).
  3. Ensure hardware back buttons on Android and swipe-back gestures on iOS properly pop the navigation stack.
- **Acceptance Criteria:**
  - Android back button returns from Disburse to Wallet Home rather than exiting the tab.
  - Deep linking to `/transaction-detail?id=...` and `/receipt?id=...` functions cleanly.
  - Paystack modal prompts remain confirmation dialogs, not full screens.

---

### Phase 4 — Dynamic Role-Based Profile Architecture
- **Objectives:**
  1. Disentangle Settings from User Profile:
     - `app/(workspace)/more.tsx` -> School-wide operational settings, calendar setup, operating hours, debug reset.
     - `app/profile.tsx` -> Personal user profile and public member profile.
  2. Build a modular Profile Shell in `src/features/profiles/`:
     - `SharedProfileShell.tsx`: Avatar, cover image, full name, role badge, school affiliation, digital ID launcher.
     - `sections/ParentProfileSection.tsx`: Linked children list, enrollment status.
     - `sections/TeacherProfileSection.tsx`: Assigned class, subjects taught, staff ID code.
     - `sections/AdminProfileSection.tsx`: System permissions, security credentials.
  3. Implement Multi-Tiered Visibility Rules:
     - Public tier (Name, avatar, role, school motto).
     - Member tier (Class name, staff title, official email).
     - Admin/HR tier (Phone, emergency contacts, compensation).
- **Acceptance Criteria:**
  - Navigating to `/profile?userId=...` for another member displays only permitted information.
  - Sensitive phone numbers and payroll data are masked for unauthorized viewers.
  - Zero hardcoded mock strings; clean empty states for missing profile fields.

---

### Phase 5 — Intent-Driven Scanner Architecture
- **Objectives:**
  1. Fix the critical route guard in [`app/scanner.tsx`](file:///Users/mac/Documents/SIDE%20PROJECTS/SCHOOL-MGT/apps/mobile/app/scanner.tsx):
     - Update `<Guard permissions={["attendance"]}>` to allow all authenticated roles to access the scanner.
  2. Implement an Intent-Driven Scanner Engine in `src/features/scanner/`:
     - Case 1: Faculty / Staff Clock-In (`STAFF:{userId}`).
     - Case 2: Student Pass Verification (`STUDENT:{studentId}`).
     - Case 3: Receipt Authentication (`RECEIPT:{paymentId}`).
     - Case 4: Unknown / Invalid QR Code.
  3. Contextual Actions & Recovery Paths:
     - Student scan opens the student profile with authorized actions (e.g., assign class or record arrival).
     - Unknown code renders a helpful recovery screen with manual search fallback.
     - Offline clock-in persists locally with a clear amber badge: *"Waiting to sync"*.
- **Acceptance Criteria:**
  - Parents can successfully open the scanner without 403 permission errors.
  - Scanning a valid student pass routes to the student's profile.
  - Unknown codes display an accessible recovery dialog; zero crashes.

---

### Phase 6 — Validation, Accessibility & Final Polish
- **Objectives:**
  1. Automated End-to-End Regression Testing:
     - Verify complete journeys across all 7 user roles.
     - Test school context switching and tenant isolation.
  2. Accessibility Audit:
     - Ensure minimum 44x44 pt tap targets across all interactive elements.
     - Verify color contrast ratios (minimum 4.5:1 for body text, 3:1 for large headers).
     - Add `accessibilityRole` and `accessibilityLabel` to all interactive icons and buttons.
  3. Performance & Memory Profiling:
     - Audit memory leaks in image loading and modal sheets.
     - Ensure 60 FPS transitions during navigation.
- **Acceptance Criteria:**
  - All automated test suites pass.
  - Zero TypeScript errors (`tsc --noEmit`).
  - No visual regressions on Android or iOS simulators.

---

## 3. Unresolved Product Questions & Assumptions

The following design decisions require formal stakeholder confirmation before Phase 1 begins:

| # | Product Question | Current State / Default Assumption | Proposed Recommendation | Decision Status |
| :-: | :--- | :--- | :--- | :---: |
| **Q1** | **Camera Hardware Integration** | Scanner currently uses animated laser beam with simulated buttons. | Integrate native camera decoding (`expo-camera`) with simulated fallback for test environments. | Pending Stakeholder Confirmation |
| **Q2** | **Faculty Clock-In Geofence Policy** | Scanner records `locationName` locally without GPS validation. | Enforce real device geolocation (within 100m of campus bounds) when online; allow offline override with warning. | Pending Stakeholder Confirmation |
| **Q3** | **Public Directory Discoverability** | Directory is currently hidden from parents (`can(c.role, "directory")`). | Maintain strict privacy: Parents can only view their children's assigned teachers, not the full staff directory. | Recommended & Default |
| **Q4** | **Multi-Child Tuition Allocation** | Fee payments are targeted at specific invoice IDs. | Support both targeted invoice payment and lumped payment allocated to oldest outstanding levy. | Recommended & Default |
