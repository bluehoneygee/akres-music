# Research Notes: ERPNext Music School Management

## Decision: Use ERPNext Education as the Academic Base

ERPNext Education already provides Student, Course, Student Group, Course Schedule, Student Attendance, Fees, and related academic records. These should be reused to avoid rebuilding generic education workflows.

Rationale:

- Reduces custom code.
- Keeps compatibility with ERPNext reports and education workflows.
- Makes billing easier because Education can connect to Accounts.

Tradeoff:

- Some forms need custom fields to fit music school operations.

## Decision: Use Custom App, Not Direct ERPNext Modification

All customizations should live in `akres_music`.

Rationale:

- Safer ERPNext upgrades.
- Custom DocTypes, fixtures, and hooks are portable.
- Easier to version control.

Tradeoff:

- Requires slightly more setup than editing directly from Desk only.

## Decision: Custom DocType for Lesson Journal

ERPNext does not provide a music-specific per-session journal with repertoire, technique focus, homework, and parent visibility.

Rationale:

- Progress reports are core to the business.
- Teachers need a simple per-session workflow.
- Parents need filtered visibility.

Tradeoff:

- Requires custom portal views and reports.

## Decision: Custom DocType for Instructor Attendance

ERPNext HR Attendance is useful for daily employee attendance, but music schools often need attendance per teaching session.

Rationale:

- Instructor attendance should link to Course Schedule.
- Supports substitute teacher tracking.
- Supports session-based reports and future payroll.

Tradeoff:

- If payroll integration is needed later, mapping to HR/Payroll must be added.

## Decision: Use Sales Invoice/Fees for Manual Billing

Billing should remain in ERPNext Accounts/Education, not a separate custom invoice system. Payment gateway integration is not part of the initial scope; payments can be recorded manually by staff using ERPNext's standard accounting flow.

Rationale:

- Keeps accounting accurate.
- Enables manual Payment Entry when staff confirms payment.
- Supports standard ERPNext financial reports.

Tradeoff:

- Music-specific fields must be added to invoice/fees records.

## Decision: Portal via Frappe Website Pages

Student and parent portals should be custom portal pages, backed by permission-aware server queries.

Rationale:

- Better user experience than exposing Desk.
- Easier to limit data.
- Mobile-friendly layout can be controlled.

Tradeoff:

- Requires custom Jinja/Python/JS code.

## Decision: Scheduled Jobs for Absence and Invoice Reminder Rules

Absence thresholds and invoice reminders are time-window rules, so scheduled jobs are more reliable than only document events.

Rationale:

- Can calculate 30-day absence windows.
- Can detect due and overdue invoices.
- Easier to retry safely.

Tradeoff:

- Must implement idempotency to prevent duplicate notifications.
