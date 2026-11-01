# Mobile Application Codebase & Architectural Audit

> **Document:** `docs/MOBILE_AUDIT.md`  
> **Author:** Senior Staff Mobile Engineer & UX Architect  
> **Target:** `apps/mobile` (`@school/mobile`)  
> **Scope:** Codebase Health, Component Coupling, Permission Boundaries & Technical Debt Analysis  

---

## 1. Codebase Size & Metric Analysis

An inspection of `apps/mobile/src` reveals significant concentration of complexity in five monolithic feature components:

| Source File | Total Lines | Primary Responsibilities | Major Architectural Smells |
| :--- | :---: | :--- | :--- |
| [`src/features/Home.tsx`](file:///Users/mac/Documents/SIDE%20PROJECTS/SCHOOL-MGT/apps/mobile/src/features/Home.tsx) | **1,518** | Main dashboard, attention items, setup checklist, metric grid, quick action chips, notice feed, classroom cards | Monolithic file; mixes 4 role views in nested ternary logic; excessive cards; arbitrary inline styles. |
| [`src/features/StaffDetailScreen.tsx`](file:///Users/mac/Documents/SIDE%20PROJECTS/SCHOOL-MGT/apps/mobile/src/features/StaffDetailScreen.tsx) | **1,351** | Staff record, role editing, class assignment, salary calculation, digital pass launcher | Combines view and administrative mutations; silent fallback to `data.staff[0]` on invalid ID. |
| [`src/features/More.tsx`](file:///Users/mac/Documents/SIDE%20PROJECTS/SCHOOL-MGT/apps/mobile/src/features/More.tsx) | **1,115** | Profile identity, school switcher, calendar upload, operating hours, debug reset, logout | Conflates personal user profile with school-wide administrative settings. Lacks public view. |
| [`src/features/WalletScreen.tsx`](file:///Users/mac/Documents/SIDE%20PROJECTS/SCHOOL-MGT/apps/mobile/src/features/WalletScreen.tsx) | **1,000+** | Treasury balance, transaction history, disburse funds, NUBAN card, fee request list | Sub-screens (History, Insights, Disburse, NUBAN) rendered via local React state instead of route files. |
| [`src/features/FullscreenScannerModal.tsx`](file:///Users/mac/Documents/SIDE%20PROJECTS/SCHOOL-MGT/apps/mobile/src/features/FullscreenScannerModal.tsx) | **919** | QR/Facial scanner simulation, attendance clock-in, entity preview modals | Simulated laser beam with mock bottom buttons; no camera feed; guarded by `attendance` permission only. |
| [`src/features/StudentDetailScreen.tsx`](file:///Users/mac/Documents/SIDE%20PROJECTS/SCHOOL-MGT/apps/mobile/src/features/StudentDetailScreen.tsx) | **800** | Student academics, fee invoice status, attendance history, guardian details | Hardcoded mock fallbacks (`"Chidubem Okafor"`, `INV-15000000`) instead of explicit missing record state. |
| [`src/components/ui.tsx`](file:///Users/mac/Documents/SIDE%20PROJECTS/SCHOOL-MGT/apps/mobile/src/components/ui.tsx) | **1,100+** | Export wrapper for Button, Badge, Card, Field, ListItem, ModalSheet, TopBar | Catch-all UI dump; violates single-responsibility principle. |

---

## 2. Technical Issue Log (P0, P1, P2)

### Priority P0: Critical Navigation, Correctness & Permission Defects

#### [P0-01] Scanner Route Blocks Parents from Validating Badges or Invoices
- **Location:** [`apps/mobile/app/scanner.tsx:9`](file:///Users/mac/Documents/SIDE%20PROJECTS/SCHOOL-MGT/apps/mobile/app/scanner.tsx#L9)
  ```tsx
  <Guard permissions={["attendance"]}>
    <FullscreenScannerModal visible={true} ... />
  </Guard>
  ```
- **Technical Flaw:** In [`src/domain/model.ts:15`](file:///Users/mac/Documents/SIDE%20PROJECTS/SCHOOL-MGT/apps/mobile/src/domain/model.ts#L15), the `parent` role permissions are defined as `["children", "fees", "payments", "profile"]`. Because `parent` lacks `"attendance"` permission, tapping any scanner link throws a permission rejection.
- **Impact:** Parents cannot scan their child's digital ID pass, physical entrance badge, or receipt QR code.
- **Remediation:** Remove the hardcoded `"attendance"` guard requirement. Allow the scanner route to load for all authenticated members, and perform intent-based permission checks *after* decoding the QR code.

#### [P0-02] Conflation of Personal Profile with School Configuration
- **Location:** [`apps/mobile/app/profile.tsx:8`](file:///Users/mac/Documents/SIDE%20PROJECTS/SCHOOL-MGT/apps/mobile/app/profile.tsx#L8) & [`src/features/More.tsx:716`](file:///Users/mac/Documents/SIDE%20PROJECTS/SCHOOL-MGT/apps/mobile/src/features/More.tsx#L716)
  ```tsx
  export function Profile() {
    return <More showBack />;
  }
  ```
- **Technical Flaw:** The `/profile` route simply renders the 1,115-line `<More />` component. `<More />` contains campus operating hours, school calendar PDF parsing, database reset actions, and staff management buttons.
- **Impact:** There is no distinct "User Profile" screen. If a user or parent navigates to view a teacher's or student's profile, the app renders the entire administrative settings screen.
- **Remediation:** Split into two distinct architectures:
  1. `app/(workspace)/more.tsx` -> School & Application Settings.
  2. `app/profile.tsx` -> Dedicated Role-Aware User Profile Shell with public vs. member visibility tiers.

#### [P0-03] Silent Mock Fallbacks Masking Missing Entities
- **Location:**
  - [`src/features/StudentDetailScreen.tsx:43-53`](file:///Users/mac/Documents/SIDE%20PROJECTS/SCHOOL-MGT/apps/mobile/src/features/StudentDetailScreen.tsx#L43-L53):
    ```tsx
    const found = data.students.find((s) => s.id === studentId);
    if (found) return found;
    return {
      id: studentId || "STD-2026-001",
      name: "Chidubem Okafor", ...
    };
    ```
  - [`src/features/StaffDetailScreen.tsx:91`](file:///Users/mac/Documents/SIDE%20PROJECTS/SCHOOL-MGT/apps/mobile/src/features/StaffDetailScreen.tsx#L91):
    ```tsx
    const staff = data.staff.find((s) => s.id === id) || data.staff[0];
    ```
- **Technical Flaw:** When an entity ID cannot be resolved within the active tenant snapshot, the UI silently synthesizes fake data or returns the first staff member in the database.
- **Impact:** Destroys data integrity; prevents engineers from diagnosing broken links or incorrect IDs; misleads end users.
- **Remediation:** Remove all synthetic mock fallbacks. Return an explicit, accessible empty state: *"Record Not Found: No student or staff matches ID {id} in this school."*

---

### Priority P1: Major Design, Interaction & Workflow Problems

#### [P1-01] Monolithic Home Screen & Information Overload
- **Location:** [`src/features/Home.tsx:1-1518`](file:///Users/mac/Documents/SIDE%20PROJECTS/SCHOOL-MGT/apps/mobile/src/features/Home.tsx#L1-L1518)
- **Technical Flaw:** A single file contains the fixed header, campus cover banner card, attention hub, setup checklist, executive metrics, horizontal quick-action chips, classroom roster, notice feed, and digital ID sheet.
- **Impact:** Cognitive overload; visual crowding on standard mobile displays; excessive re-renders during state mutations.
- **Remediation:** Refactor into role-tailored sub-modules (`TeacherHome`, `ParentHome`, `OwnerHome`, `StaffHome`) orchestrated by a lightweight layout container.

#### [P1-02] Token Divergence from Official Brand Guidelines
- **Location:** [`src/theme/tokens.ts:3-10`](file:///Users/mac/Documents/SIDE%20PROJECTS/SCHOOL-MGT/apps/mobile/src/theme/tokens.ts#L3-L10)
  ```ts
  navy: "#0f172a", // Tailwind Slate-900 instead of Brand Navy #14213d
  orange: "#ea580c", // Tailwind Orange-600 instead of Brand Orange #ff6600
  ```
- **Impact:** Visual inconsistency with verified institutional branding standards.
- **Remediation:** Update `tokens.ts` to `navy: "#14213d"` and `orange: "#ff6600"`, and remove unsupported gradients.

#### [P1-03] Embedded Sub-Screens in WalletScreen Breaking Navigation History
- **Location:** [`src/features/WalletScreen.tsx:49`](file:///Users/mac/Documents/SIDE%20PROJECTS/SCHOOL-MGT/apps/mobile/src/features/WalletScreen.tsx#L49)
  ```ts
  const [currentScreen, setCurrentScreen] = useState<WalletSubScreen>("home");
  ```
- **Technical Flaw:** History, Insights, Disburse, and NUBAN are rendered conditionally inside `WalletScreen.tsx` based on local state rather than Expo Router routes.
- **Impact:** The hardware back button on Android exits the wallet tab entirely rather than popping the active sub-screen. Deep-linking to `/wallet/disburse` or `/wallet/history` is impossible.
- **Remediation:** Move sub-screens to dedicated nested routes: `app/wallet/history.tsx`, `app/wallet/disburse.tsx`, `app/wallet/insights.tsx`, `app/wallet/nuban.tsx`.

#### [P1-04] Scanner Lacks Native Camera Feed Integration
- **Location:** [`src/features/FullscreenScannerModal.tsx:89-183`](file:///Users/mac/Documents/SIDE%20PROJECTS/SCHOOL-MGT/apps/mobile/src/features/FullscreenScannerModal.tsx#L89-L183)
- **Technical Flaw:** The screen renders an animated laser overlay over an empty container and relies on bottom simulation test buttons (`FACE-VERIFIED`, `STAFF-ED-042`).
- **Impact:** The app cannot be evaluated on physical devices to scan real QR badges, ID cards, or tuition slips.
- **Remediation:** Implement intent-driven QR decoder engine with standard hardware camera fallback.

---

### Priority P2: Refinements & Maintainability Improvements

#### [P2-01] Monolithic UI Component Export Hub
- **Location:** [`src/components/ui.tsx`](file:///Users/mac/Documents/SIDE%20PROJECTS/SCHOOL-MGT/apps/mobile/src/components/ui.tsx)
- **Technical Flaw:** Over 1,100 lines exporting `Button`, `Card`, `Badge`, `Field`, `ListItem`, `Section`, `Screen`, and `ModalSheet`.
- **Remediation:** Decompose into `src/components/ui/` (`Button.tsx`, `Card.tsx`, `Badge.tsx`, `Input.tsx`, `ModalSheet.tsx`).

#### [P2-02] Inconsistent Corner Radii & Arbitrary Spacing
- **Location:** Various inline style declarations across `src/features/*.tsx` (e.g., `borderRadius: 14`, `18`, `20`, `24`, `30`).
- **Remediation:** Enforce design token scale: `radius.sm (8)`, `radius.md (12)`, `radius.lg (16)`, `radius.xl (20)`, `radius.full (9999)`.

---

## 3. Architecture & Domain Evaluation

### A. State Management & Offline Synchronization
- The application uses a central provider [`AppProvider.tsx`](file:///Users/mac/Documents/SIDE%20PROJECTS/SCHOOL-MGT/apps/mobile/src/providers/AppProvider.tsx) that wraps [`MockSchoolServices`](file:///Users/mac/Documents/SIDE%20PROJECTS/SCHOOL-MGT/apps/mobile/src/services/mock/service.ts).
- All mutations (`act`) serialize writes through an asynchronous mutex queue (`this.queue`), validate drafts against Zod schemas, write to `AsyncStorage`, and notify consumers via `revision` increments.
- **Finding:** The offline transactional engine is mathematically sound (22/22 unit tests passing). However, the frontend lacks a persistent outbox queue UI to display pending sync operations to users.

### B. Role & Permission Boundaries
- Permissions are strictly defined in [`src/domain/model.ts`](file:///Users/mac/Documents/SIDE%20PROJECTS/SCHOOL-MGT/apps/mobile/src/domain/model.ts) and enforced via `can(role, action)`.
- **Finding:** While service-level authorization is enforced in `snapshot(c)` and `authorize(c)`, the UI layer frequently checks `context.role === "owner"` directly rather than using `can(context.role, permission)`. This makes introducing new roles (e.g., "Vice Principal", "Accountant") difficult without auditing every UI conditional.

---

## 4. Component Refactoring & Replacement Matrix

| Existing Component | Current Status | Recommended Action | Justification |
| :--- | :--- | :--- | :--- |
| `src/features/Entry.tsx` | Excellent | **Preserve** | Clean, modular state-machine managing onboarding and login. |
| `src/features/Onboarding.tsx` | Excellent | **Preserve** | High-quality 3-step value carousel; accessible and responsive. |
| `src/features/LoginScreen.tsx` | Excellent | **Preserve** | Verified passwordless OTP flow integrated with Resend API. |
| `src/features/CreateSchoolScreen.tsx` | Excellent | **Preserve** | 4-step school onboarding setup with virtual NUBAN generation. |
| `src/features/Home.tsx` | Monolithic (1,518 lines) | **Redesign & Decompose** | High cognitive load; lacks role specialization. |
| `src/features/WalletScreen.tsx` | Functional (1,000+ lines) | **Refine & Decompose** | Good navy aesthetics; needs sub-screens moved to standalone routes. |
| `src/features/More.tsx` | Monolithic (1,115 lines) | **Replace** | Split into `app/(workspace)/more.tsx` (Settings) and `app/profile.tsx` (User Profile). |
| `src/features/FullscreenScannerModal.tsx` | Simulated (919 lines) | **Redesign** | Remove mock buttons; fix Parent guard; implement intent-driven decoding. |
| `src/features/StaffDetailScreen.tsx` | Monolithic (1,351 lines) | **Decompose** | Split into Read-Only Profile and Admin Management Sheet. |
| `src/features/StudentDetailScreen.tsx` | Mock Fallback (800 lines) | **Refactor** | Remove fake fallbacks; implement strict permission-gated contact cards. |
| `src/components/ui.tsx` | Monolithic (1,100+ lines) | **Refactor to Atomic** | Extract into `components/ui/{Button,Card,Badge,Input}.tsx`. |
