# Implementation Plan: ERPNext Music School Management

## Technical Approach

Bangun custom Frappe app bernama `akres_music` yang berjalan berdampingan dengan ERPNext. App ini menyimpan semua Custom DocType, Custom Field, permission, portal page, report, fixture, dan scheduled jobs yang spesifik untuk sekolah musik.

Source ERPNext tidak boleh diubah langsung agar upgrade ERPNext tetap aman.

## Target Stack

- Frappe Framework
- ERPNext
- MariaDB
- Redis
- Python
- JavaScript
- Jinja templates untuk portal

## App Structure

```text
akres_music/
  akres_music/
    akres_music/
      doctype/
        instrument/
        studio_room/
        instructor_attendance/
        lesson_journal/
        repertoire/
      report/
        student_attendance_summary/
        student_progress_summary/
        outstanding_lesson_invoice/
      www/
        student_portal.py
        student_portal.html
        parent_portal.py
        parent_portal.html
      hooks.py
      permissions.py
      notifications.py
      scheduler.py
  fixtures/
    custom_field.json
    property_setter.json
    role.json
```

## ERPNext Extension Strategy

### Standard DocTypes yang Dipakai

- Student
- Guardian
- Instructor
- Course
- Student Group
- Course Schedule
- Student Attendance
- Fees
- Sales Invoice
- Payment Entry
- Customer
- User

### Standard DocTypes yang Ditambah Custom Field

- Student
- Guardian
- Instructor
- Course
- Student Group
- Course Schedule
- Student Attendance
- Fees
- Sales Invoice

### Custom DocTypes Baru

- Instrument
- Student Instrument
- Instructor Instrument
- Studio Room
- Room Instrument
- Instructor Attendance
- Lesson Journal
- Lesson Repertoire Item
- Repertoire

## Phases

### Phase 1: Academic Core

Deliverables:

- Custom app scaffold.
- Custom DocType master data.
- Custom fields pada Student, Instructor, Course, Course Schedule, Student Attendance.
- Course Schedule mendukung dua mode lokasi: Studio dan Home Visit.
- Student Group dipakai sebagai wrapper teknis private lesson berisi satu murid.
- Permission dasar untuk Admin, Staff Akademik, Instructor.
- Basic fixtures.

Validation:

- Admin dapat membuat instrument.
- Staff dapat membuat student dengan instrumen dan level.
- Staff dapat menghubungkan Parent Portal User ke Guardian dan Student.
- Staff dapat membuat instructor dengan instrumen yang diajarkan.
- Staff dapat membuat course private dan jadwal studio/home visit.

### Phase 2: Attendance and Journal

Deliverables:

- Instructor Attendance.
- Lesson Journal.
- Repertoire.
- Client script untuk mempermudah input absensi/jurnal dari jadwal.
- Report absensi murid.
- Report progress murid.

Validation:

- Guru dapat melihat jadwal sendiri.
- Guru dapat input absensi murid.
- Guru dapat input lesson journal.
- Staff dapat melihat laporan absensi dan progress.

### Phase 3: Portal

Deliverables:

- Student portal.
- Parent portal.
- Query permission untuk membatasi data.
- Portal views untuk jadwal, absensi, dan progress.

Validation:

- Murid hanya melihat data miliknya.
- Orang tua hanya melihat data anak yang terhubung melalui `Guardian.user`.
- Relasi parent wajib mengikuti alur `User -> Guardian -> Student`.
- Jurnal yang tidak `parent_visible` tidak tampil di portal.

### Phase 4: Notifications

Deliverables:

- Notification template.
- Scheduled job untuk absensi berulang.
- Scheduled job untuk reminder tagihan.
- Audit field untuk mencegah notifikasi duplikat.

Validation:

- Murid absen 3 kali dalam 30 hari memicu notifikasi ke orang tua.
- Murid absen 2 kali berturut-turut memicu notifikasi ke staff akademik.
- Invoice overdue memicu reminder tagihan.

### Phase 5: Billing Manual

Deliverables:

- Custom fields billing pada Fees/Sales Invoice.
- Portal invoice list.
- Pencatatan status pembayaran manual melalui ERPNext Accounts.

Validation:

- Orang tua bisa melihat invoice.
- Status invoice berubah setelah staff mencatat pembayaran.

## Permissions Strategy

### System Manager / Admin

Full access.

### Academic Staff

Read/write:

- Student
- Guardian
- Instructor
- Course
- Student Group
- Course Schedule
- Student Attendance
- Instructor Attendance
- Lesson Journal
- Repertoire

Read:

- Sales Invoice
- Fees
- Payment Entry

### Instructor

Read:

- Course Schedule miliknya
- Student pada jadwal miliknya
- Repertoire

Write:

- Student Attendance untuk jadwal miliknya
- Instructor Attendance miliknya
- Lesson Journal untuk murid pada jadwal miliknya

### Student Portal User

Read only:

- Jadwal miliknya
- Absensi miliknya
- Lesson Journal miliknya yang visible

### Parent Portal User

Read only:

- Data anak yang terhubung melalui Guardian
- Jadwal anak
- Absensi anak
- Lesson Journal anak yang visible

## Automation Strategy

Gunakan scheduled job untuk aturan berbasis periode dan document event untuk notifikasi langsung.

Document event:

- Saat Course Schedule berubah ke Rescheduled.
- Saat invoice dibuat.
- Saat Payment Entry tercatat.

Scheduled job:

- Cek absensi berulang harian.
- Cek invoice due dan overdue harian.
- Kirim ringkasan mingguan progress ke orang tua, opsional.

## Reporting Strategy

Gunakan Query Report atau Script Report sesuai kebutuhan.

Query Report cukup untuk:

- Outstanding invoice.
- Student attendance summary sederhana.

Script Report digunakan untuk:

- Progress report gabungan dari Lesson Journal dan Repertoire.
- Attendance trend dengan logika status khusus.

## Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Permission portal terlalu longgar | Data murid bisa terlihat oleh user lain | Buat query condition dan test akses antar user |
| Custom field terlalu banyak di DocType standar | Form menjadi berat dan membingungkan | Gunakan Section Break dan hanya field penting |
| Notifikasi duplikat | Orang tua menerima pesan berulang | Simpan log notifikasi dan flag pada dokumen |
| Billing tidak sinkron dengan Accounts | Laporan keuangan tidak akurat | Tetap pakai Sales Invoice/Payment Entry standar |
| Reschedule dihitung absen | Laporan absensi salah | Definisikan status dan business rule dengan jelas |

## Open Questions

- Apakah guru dibayar per sesi, per bulan, atau kombinasi?
- Apakah kelas trial memiliki alur billing berbeda?
- Apakah orang tua bisa mengajukan reschedule lewat portal?
- Apakah notifikasi utama memakai email, SMS, atau WhatsApp?
