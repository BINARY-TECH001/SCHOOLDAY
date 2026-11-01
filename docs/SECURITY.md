# Security and privacy boundaries

Phase 1 is a local synthetic-data demo. Frontend authorization is not a security boundary. A person with device storage access can inspect or change the demo data. No authentication, encryption claim, payment processing, real invitation acceptance or production attendance verification exists.

The mock validates membership and permission on mutations; scoped snapshots filter school, guardian and ownership. Route guards are additional usability controls. Sign-out removes the selected demo session but retains records; confirmed reset removes local changes. Do not enter real student, medical, salary or banking data.

Phase 2 requirements:

- Verified authentication, secure token lifecycle, invitation expiry and membership-based access.
- Resolve tenant membership server-side for every query/mutation. Composite tenant-resource constraints, policy tests and audited role changes.
- Narrow payroll/PII access, access logging, retention/deletion policy, secure backups and transport encryption.
- Auditable financial ledger, provider verification, replay-safe webhooks, idempotency, rate limits and reconciliation.
- Attendance policy/evidence validation, duplicate prevention and server/device time checks. GPS and selfies alone do not prove presence.
- Contextual camera/location consent, minimal collection, safe storage and explicit retention.
- Notification delivery adapters with consent and recipient isolation.
- No secrets in source. Future backend configuration uses validated environment variables and placeholder-only .env.example.

Human-readable IDs are synthetic permanent school references. Future QR payloads must be opaque references resolved only by authorized services, never names, contact details or salary data.
