# Checklists: ERPNext Music School Management

## Specification Quality

- [ ] Requirements are clear and testable.
- [ ] MVP scope is separated from future scope.
- [ ] Every role has defined capabilities.
- [ ] Portal data visibility rules are explicit.
- [ ] Billing uses ERPNext standard accounting flow.
- [ ] Notification rules define threshold and period.

## Data Model Quality

- [ ] Every custom DocType has a clear purpose.
- [ ] Child tables are identified.
- [ ] Required fields are marked.
- [ ] Link fields point to valid DocTypes.
- [ ] Naming rules are defined for master data.
- [ ] Relationship summary is understandable.

## Security and Permission

- [ ] Instructor cannot see unrelated schedules.
- [ ] Student cannot see other students.
- [ ] Parent cannot see unrelated children.
- [ ] Hidden journals do not appear in portal.
- [ ] Billing data is read-only in portal.
- [ ] Staff access to accounting data is limited.

## MVP Readiness

- [ ] Master data can be created.
- [ ] Jadwal can be created for private studio lesson.
- [ ] Jadwal can be created for private home visit lesson.
- [ ] Student attendance can be submitted.
- [ ] Instructor attendance can be submitted.
- [ ] Lesson journal can be submitted.
- [ ] Parent portal can show child progress.
- [ ] Student portal can show own progress.
- [ ] Absence notification works.
- [ ] Basic reports work.

## Current Next.js Backend Implementation Status

Catatan: checklist asli di atas masih mengacu ke ERPNext/Frappe. Karena arah implementasi
berubah ke backend sendiri, status aktual MVP Next.js dicatat terpisah di bawah ini.

- [x] Next.js app shell dibuat dengan route per menu utama.
- [x] Backend API sendiri dibuat dengan route handler Next.js.
- [x] MongoDB persistence dibuat dengan Docker Compose.
- [x] Seed data dibuat dari payload/demo Akres.
- [x] Master Instrument API dan page tersedia.
- [x] Student API dan page tersedia.
- [x] Instructor API dan page tersedia.
- [x] Course API dan page tersedia.
- [x] Studio Room API dan page tersedia.
- [x] Schedule API dan page tersedia untuk Studio/Home Visit fields.
- [x] Student Attendance API dan page tersedia.
- [x] Instructor Attendance API dan page tersedia.
- [x] Lesson Journal API dan page tersedia.
- [x] Repertoire API dan page tersedia.
- [x] Billing/Invoice API dan page tersedia.
- [x] Portal preview page tersedia dengan aturan Guardian -> Student dan `parentVisible`.
- [x] Basic reports page tersedia.
- [x] Authentication/session backend.
- [x] Role options tersedia untuk System Manager, Staff, Instructor, Student, Parent.
- [x] Role-based authorization dasar untuk Admin, Staff, Instructor, Student, Parent.
- [ ] Validasi relasi antar record di API.
- [x] Permission query dasar agar instructor/student/parent hanya melihat data terkait.
- [ ] Scheduler notifikasi absensi berulang.
- [ ] Scheduler reminder invoice.
- [x] Production database adapter baseline memakai MongoDB.
