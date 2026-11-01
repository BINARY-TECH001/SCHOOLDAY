# Schoolday mobile redesign

## Direction

A calm, task-oriented mobile product: concise copy, expressive typography, one prominent next action, and optional detail revealed when needed. Navy #14213e and orange #ff6600 are the brand anchors. Manrope is bundled locally in five weights; it does not download from a font CDN at runtime. Iconsax Linear/Bold is the app's icon family. Icons are wrapped behind a typed component.

Orange buttons use navy labels for readable contrast. Small orange-toned text uses a darker accessible brown. Large amounts and headlines use bold typography; metadata uses a smaller, muted scale. Rounded controls are distinct from softer content cards. No gradients or decorative emoji.

## Research and interpretation

- [Apple: Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars): labelled top-level destinations and consistent placement. The requested five-slot dock contains four destinations and a visually distinct central action launcher. The plus opens a sheet rather than masquerading as a navigation destination.
- [Apple: Liquid Glass](https://developer.apple.com/documentation/TechnologyOverviews/liquid-glass): hierarchy and restrained material use. Glass is confined to the floating dock and action sheet; finance and form content stays on solid readable surfaces.
- [Figma: Mobile-first design](https://www.figma.com/resource-library/mobile-first-design/): prioritised content, thumb-friendly controls, readable hierarchy and fewer distractions.
- [Figma: How to design an app](https://www.figma.com/resource-library/how-to-design-an-app/): design connected journeys rather than isolated screens. Entry → school context → role home → task → result forms the main sequence.
- [Expo: GlassEffect](https://docs.expo.dev/versions/latest/sdk/glass-effect/): native availability checks and reduce-transparency handling.
- [Iconsax React Native](https://iconsax-react.pages.dev/): SVG icons supported by the existing Expo-compatible react-native-svg installation.

These public resources informed the design; no private Figma file was accessed or copied.

## Entry and onboarding

Three full-screen carousel pages use short headlines and custom code-drawn product illustrations. A fixed footer holds pagination, primary action and login link. Swipe or tap dots to navigate. Auto-advance runs every six seconds while the app is active; manual navigation pauses it. A pause/resume control is available. Screen readers and reduced-motion preferences disable auto-advance.

Login and create-account forms replace the demo-entry funnel. Any login can proceed; the form states that authentication is not connected. Passwords are held only in local component state and cleared before navigation; email/name inputs are not sent or persisted. No real account is created. Workspace roles and sample schools still use the existing validated local memberships. The /demo route only redirects old links to /account.

## Navigation and hierarchy

Dock: Home / Children, My work, Finance or School / + / Updates / You.

The action sheet resolves current permissions. Staff can clock in/out immediately, prepare a lesson or request leave. Parents can start a payment; finance can review transfers; HR/leadership can review requests and find colleagues. Forms launched from quick actions open in creation mode.

Parent home highlights the outstanding balance and compact child rows. Staff home highlights attendance and preparation. Finance/leadership surfaces balances and approvals; HR highlights requests. School identity remains visible without dominating the page.

Fees use child selection followed by a focused breakdown. Payment uses selectable invoice rows, a simple amount field, payment-method controls and a separate review. Receipts visually distinguish completed, failed and pending transactions. Finance separates transfer review and reminders. You groups identity, school switching and settings; preview controls are collapsed.

## Material and accessibility

On compatible iOS versions, native GlassView is used after both availability checks. Web uses blur with a translucent surface. Android and reduced-transparency preferences use opaque surfaces. This is a cross-platform interpretation, not a claim that Android/web implement Apple's native optical effect.

Safe-area spacing, keyboard avoidance, labelled icon buttons, selected-state semantics, minimum touch targets, scalable text and visible statuses are shared primitives. Narrow-screen and real-device QA remain necessary; exported bundles alone do not establish native accessibility compliance.
