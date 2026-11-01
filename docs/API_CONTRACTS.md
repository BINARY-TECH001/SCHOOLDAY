# API integration contract

The implemented in-process contract is SchoolServices in apps/mobile/src/services/contracts.ts. Every protected use case requires Context { schoolId, userId, role }; mock authorization checks seeded memberships. Production must derive user identity and allowed roles from verified authentication, never trust these fields.

Proposed HTTP surface (not implemented):

| Use case                     | Endpoint                                             |
| ---------------------------- | ---------------------------------------------------- |
| Current memberships          | GET /v1/me/memberships                               |
| School summary               | GET /v1/schools/:schoolId/summary                    |
| Linked children and invoices | GET /v1/schools/:schoolId/children; GET .../invoices |
| Start payment                | POST .../payments with Idempotency-Key               |
| Payment status/receipt       | GET .../payments/:id                                 |
| Attendance attempt           | POST .../attendance/attempts                         |
| Lesson draft                 | PUT .../lessons/:id with expectedVersion             |
| Leave request and decision   | POST .../leave; POST .../leave/:id/decision          |
| Notifications and read state | GET .../notifications; PATCH .../notifications/:id   |
| Sync batch                   | POST .../sync with client operation IDs              |

Use opaque IDs, ISO timestamps, explicit IANA school timezone, integer minor units and currency NGN. Responses need runtime validation and versioned pagination. Errors should use { error: { code, message, fieldErrors?, requestId } }. Distinguish 401, 403, 404, validation errors, conflict, throttling and retryable failures. Avoid resource enumeration across tenants.

Payment initiation is not settlement. Backend/provider verification alone may settle an invoice. Idempotency keys bind tenant, user and exact request payload; conflicting reuse returns a conflict. Reconciliation and webhook processing must be transactionally idempotent. The local demo's same-key retry behavior is intentionally simpler.

A future API adapter will make reads asynchronous through feature hooks and tenant-keyed query caches. Replace mock snapshot access without changing domain models; add cancellation/generation guards to discard late responses after switching schools.
