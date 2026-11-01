# Architecture and decisions

## Phases and dependency direction

Only mobile is implemented. Backend and web each have one explanatory README, not fake entry points or empty module trees. There are no shared packages yet: with one consumer, extraction would not establish a useful boundary. Move stable domain schemas and contracts into framework-independent packages when Phase 2 provides a second consumer.

Routes → feature components → application provider / SchoolServices interface → mock implementation → storage adapter. The domain module imports only Zod. Screens never import seeds, AsyncStorage or an HTTP client. Route guards and service checks use the same explicit permission map.

The SchoolServices interface is the integration seam. Its grouped methods cover catalog, scoped snapshots, payments, attendance, drafts, leave decisions, notifications and sync. The mock is an in-process transactional demo, not a production backend. Replace with asynchronous query adapters as API integration begins; preserve use-case inputs and outputs. Split independently growing service modules then rather than create twelve empty wrappers now.

## Persistence

A versioned JSON database uses AsyncStorage through StorageAdapter. The small deterministic seed fits a single atomic value. Writes are serialized, mutate a clone, validate the result and publish in-memory state only after persistence succeeds. Errors leave the previous state intact. Invalid cache versions stop initialization and offer retry/reset rather than silently destroy drafts.

SQLite was evaluated: it is preferable for larger offline datasets, partial queries, migrations and a durable outbox. For this bounded demo, a single value gives atomic writes with less native setup and permits a browser evaluator. This decision must be revisited before real student records. No credentials are stored; SecureStore is deferred until there are actual authentication tokens.

Preferences hold onboarding completion, non-secret synthetic membership and offline simulation. Shared state uses a small React provider; a single local snapshot does not justify a server-cache library. Feature editor state remains local. Do not infer production authentication from this provider.

## Context and navigation

Membership is validated on every service operation. Each snapshot filters by school and role, then by child guardian or staff ownership. A context change remounts the workspace and feature components, clearing selections and forms. All detail IDs are resolved against the active scoped snapshot. Catalog contains only synthetic membership data for the demo chooser; a production catalog must contain the authenticated user's memberships only.

A floating five-slot dock contains four destinations (Home, role workspace, Updates and You) plus a central quick-action launcher. Home prioritizes fees for parents, attendance and preparation for staff, and review work for finance/HR/leadership. Detail routes are thin and guarded, including direct links.

## Design

Navy #14213e, orange #ff6600, neutral surfaces, contextual school identity, bundled Manrope, Iconsax, 56-point buttons, safe areas, keyboard avoidance and scalable text. No gradients, decorative emoji or browser-only feedback packages. Feedback is a native accessible inline status region. Screens show explicit demo and offline states.

## Integration constraints

The mobile-export web target exists for testing, not as apps/web. Add server queries through dedicated feature hooks, tenant-keyed caches, cancellation on context changes and SecureStore-backed authentication in Phase 2. Client permissions remain usability controls; backend authorization is mandatory.

## Dependency verification

Expo SDK 58 was selected from the registry and native dependencies were installed with Expo's compatibility-aware installer. TypeScript, React types and ESLint configuration were aligned using `expo install --fix`; `expo install --check` reported dependencies up to date. Follow the [official installation instructions](https://docs.expo.dev/router/installation/) when changing SDK versions.

## Automated browser review

`scripts/browser-smoke.mjs` drives the Expo web target with Chrome DevTools Protocol at a 390 × 844 viewport. It covers onboarding, parent partial payment/receipt, transfer approval, tenant switching, teacher offline attendance, lesson persistence, leave sync/HR approval, payroll access rejection and all seven role homes. It requires the mobile dev server on 8081 and a disposable Chromium browser debugging port on 9223. It clears only the app origin's demo storage in that disposable profile. This does not substitute for native device QA.

The October redesign replaces demo entry with local login/create-account preview and progressive workspace selection. See DESIGN_SYSTEM.md for research, carousel behavior and glass fallbacks. Credentials are never persisted.
