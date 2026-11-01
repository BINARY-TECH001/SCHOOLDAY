# Product specification

Schoolday helps private nursery, primary and secondary schools in Nigeria reduce daily administration. Parent fee clarity and staff daily tasks take precedence over dashboard density.

Phase 1 covers onboarding, transparent demo entry, three branded schools, seven role types, guardian-linked children, invoice breakdowns, full/partial/combined mock payments, transfer approval, receipts, staff identities, attendance, lesson drafts, leave drafts/submission/decisions, directory, illustrative payslips and local notifications.

Money is integer kobo. A payment can fail, await confirmation or settle. Only settlement changes balances and permits a mock receipt. Combined allocation follows selected invoice order. Parent access is constrained to linked children; finance accesses school records. Student accounts are out of scope.

Attendance uses device time displayed in Africa/Lagos, with one arrival per day and an open-record guard. Offline attempts are unverified and waiting to sync. Demo sync can deterministically accept or reject pending attempts; no evidence is collected and no physical presence is claimed.

Three fixtures: Cedar Grove School in Lagos, Horizon Academy in Abuja, Royal Springs College in Ibadan. Parent and staff names, IDs, emails, amounts and school data are fictional. Dates reflect first term 2026/27. Invoice overdue status uses the current date.

Native permission requests are unnecessary for these flows. Real invitations, device evidence collection, payments, notification delivery, staff/student CRUD, school configuration and payroll processing require later work. Settings and payslips clearly identify preview/draft status.
