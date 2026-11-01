# Data model

Runtime-validated schemas live in apps/mobile/src/domain/model.ts. All school-owned rows carry schoolId; permanent student/staff IDs are separate from user IDs, class names and terms.

- School: name, short identity, brand color, address and current term.
- Membership: userId + schoolId + allowed role array. A chosen role must be a member of that array.
- Student: permanent local ID, guardianId, class/arm. Phase 2 replaces the single guardian field with an explicit many-to-many relationship.
- Staff: permanent local ID, userId, role/title and synthetic contact.
- Invoice: student reference, line items in integer kobo, paid kobo and due date. Status is derived, never stored separately.
- Payment: selected invoice IDs, amount, method, explicit state, creation time, reference and idempotency key. Demo allocation is ordered; production requires immutable ledger/allocation rows and currency.
- Attendance: user, arrival/departure timestamps and explicit verification/sync state.
- Lesson: subject, class, topic, date, objectives, content and saved-on-device status.
- Leave: type, dates, reason and draft/queued/submitted/approved/rejected state.
- Notice: optional recipient, per-account read receipts, timestamp, target kind and optional record ID.
- Payroll: school/user ownership, period, integer-kobo basic pay, allowances and deductions; draft-only demo status.

Database schema version is 1. Cached invalid data does not silently reset. Demo paid balances include earlier term payments; this is not a complete accounting ledger. Payroll figures are illustrative service-backed records, not authoritative employee salary records.
