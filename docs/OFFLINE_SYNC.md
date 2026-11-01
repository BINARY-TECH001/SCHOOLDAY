# Offline and recovery semantics

This implementation is entirely local. “Offline simulation” is an evaluator control, not a network probe. Reads and saved lesson/leave drafts work without a backend. Demo sync does not send data anywhere.

| Record                       | Local behavior                         | Demo sync                         |
| ---------------------------- | -------------------------------------- | --------------------------------- |
| Lesson draft                 | Saved on device after successful write | Remains local                     |
| Leave draft                  | Draft                                  | Explicit submission required      |
| Offline leave submission     | Waiting to sync                        | Submitted to local approval queue |
| Attendance offline           | Waiting to sync, unverified            | Demo verified or Needs attention  |
| Attendance online simulation | Verification pending                   | Demo verified or Needs attention  |
| Payment while offline        | Blocked, no settlement                 | Never auto-retried                |
| Bank transfer                | Awaiting confirmation                  | Finance review required           |

The provider exposes busy state while writes execute; errors display a native accessible feedback region. Retry demo sync recovers rejected attendance. Cached data is validated at initialization; unsupported/corrupt data requires explicit reset. Storage failure never publishes a financial mutation.

Future protocol: persist operation UUID, tenant, actor, entity ID, base version, device timestamp, attempt count and last error in a SQLite outbox in the same transaction as the local write. Send only under verified session/membership. Server returns canonical versions and per-operation results. Retry transient failures with bounded exponential backoff/jitter; retain permanent rejections as Needs attention. Avoid retries for invalid credentials, denied access and payments of unknown status.

Draft conflict: retain both versions and ask the editor to merge; do not discard text. Attendance conflict: server evaluates duplicates and evidence; preserve rejected attempt for audit. Financial conflict: server ledger wins, fetch status by idempotency key before retry. User/school switches cancel in-flight reads and isolate queues by tenant and actor. Revoked membership disables sends and follows a documented local retention policy.
