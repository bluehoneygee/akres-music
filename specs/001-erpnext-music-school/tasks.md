# Tasks: ERPNext Music School Management

## Phase 1: Project and Core Setup

- [x] T001 Create Frappe custom app `akres_music`.
- [x] T002 Install `akres_music` on target ERPNext site.
- [x] T003 Add app module metadata.
- [x] T004 Configure fixtures for Custom Field, Property Setter, Role, and Workflow if needed.
- [x] T005 Add roles: `Academic Staff`, `Music Instructor`, `Student Portal User`, `Parent Portal User`.

## Phase 2: Master Data DocTypes

- [x] T006 Create DocType `Instrument`.
- [x] T007 Create child DocType `Student Instrument`.
- [x] T008 Create child DocType `Instructor Instrument`.
- [x] T009 Create DocType `Studio Room`.
- [x] T010 Create child DocType `Room Instrument`.
- [x] T011 Create DocType `Repertoire`.
- [ ] T012 Add default instrument records if approved by admin.

## Phase 3: Custom Fields on ERPNext DocTypes

- [ ] T013 Add custom fields to `Student`.
- [ ] T014 Add custom fields to `Instructor`.
- [ ] T015 Add custom fields to `Course`.
- [ ] T016 Add or document `Student Group` as private lesson wrapper with one student.
- [x] T017 Add custom fields to `Course Schedule` for Studio/Home Visit.
- [ ] T018 Add custom fields to `Student Attendance`.
- [ ] T019 Add custom fields to `Fees` later when billing phase resumes.
- [x] T020 Add custom fields to `Sales Invoice`.
- [ ] T021 Export custom fields to fixtures.

## Phase 4: Attendance

- [x] T022 Create DocType `Instructor Attendance`.
- [x] T023 Add validation for substitute instructor.
- [ ] T024 Add uniqueness guard for instructor attendance per schedule.
- [ ] T025 Add helper action from Course Schedule to create Instructor Attendance.
- [ ] T026 Add helper action from Course Schedule to create Student Attendance.
- [ ] T027 Add report `Student Attendance Summary`.
- [ ] T028 Add report `Instructor Attendance Summary`.

## Phase 5: Lesson Journal

- [x] T029 Create DocType `Lesson Journal`.
- [x] T030 Create child DocType `Lesson Repertoire Item`.
- [ ] T031 Add validation for `parent_visible`.
- [ ] T032 Add helper action from Course Schedule to create Lesson Journal.
- [ ] T033 Auto-fill instrument, instructor, lesson date, and level when possible.
- [ ] T034 Add report `Student Progress Summary`.
- [ ] T035 Add report `Repertoire Progress`.

## Phase 6: Permissions

- [x] T036 Configure Admin permissions.
- [x] T037 Configure Academic Staff permissions.
- [x] T038 Configure Music Instructor permissions.
- [ ] T039 Add permission query for instructors to see only their schedules.
- [ ] T040 Add permission query for students to see only their own data.
- [ ] T041 Add permission query for parents to see only linked children.
- [ ] T042 Add tests or manual test cases for cross-user access.

## Phase 7: Portal

- [x] T043 Create `/student-portal` page.
- [x] T044 Add student dashboard section: upcoming schedule.
- [x] T045 Add student dashboard section: attendance history.
- [x] T046 Add student dashboard section: progress journal.
- [ ] T047 Add student dashboard section: invoice list later when billing phase resumes.
- [x] T048 Create `/parent-portal` page.
- [ ] T049 Add parent child selector for multi-child guardians.
- [x] T050 Add parent dashboard section: child schedule.
- [x] T051 Add parent dashboard section: child attendance.
- [x] T052 Add parent dashboard section: child progress journal.
- [ ] T053 Add parent dashboard section: child invoice list later when billing phase resumes.
- [ ] T054 Validate portal mobile layout.

## Phase 8: Billing Manual Later

- [ ] T055 Configure Fee Schedule mapping for lesson programs when payment/billing resumes.
- [ ] T056 Ensure Fees/Sales Invoice contains Student and billing period.
- [ ] T057 Add report `Outstanding Lesson Invoice`.
- [ ] T058 Document manual payment recording flow using ERPNext Payment Entry.
- [ ] T059 Add staff-facing notes for confirming manual transfer payments.

## Phase 9: Notifications

- [ ] T060 Create email template for repeated absence.
- [ ] T061 Create email template for consecutive absence.
- [ ] T062 Create email template for schedule reschedule.
- [ ] T063 Create email template for invoice reminder.
- [ ] T064 Add scheduled job for 3 absences in 30 days.
- [ ] T065 Add scheduled job for 2 consecutive absences.
- [ ] T066 Add scheduled job for invoice due reminder.
- [ ] T067 Add notification log or idempotency key.
- [ ] T068 Test notification duplicate prevention.

## Phase 10: Reports and QA

- [ ] T069 Create academic report filters by student, instructor, instrument, date range.
- [ ] T070 Create operational report filters by room, schedule status, instructor.
- [ ] T071 Create finance report filters by billing period and payment status.
- [ ] T072 Run desk form smoke test.
- [ ] T073 Run portal access smoke test.
- [ ] T074 Run notification smoke test.
- [ ] T075 Prepare MVP demo data.

## MVP Completion Checklist

- [ ] Admin can create instruments.
- [ ] Staff can create students with instrument and level.
- [ ] Staff can create instructors with instruments taught.
- [ ] Staff can create courses and schedules.
- [ ] Teacher can submit student attendance.
- [ ] Teacher can submit instructor attendance.
- [ ] Teacher can submit lesson journal.
- [ ] Parent can view child schedule, attendance, and progress.
- [ ] Student can view own schedule, attendance, and progress.
- [ ] System sends repeated absence notification.
- [ ] Staff can view attendance and progress reports.
