# Data Model: ERPNext Music School Management

## Overview

Data model ini membagi entitas menjadi tiga kelompok:

- ERPNext standard DocTypes yang dipakai apa adanya.
- ERPNext standard DocTypes yang ditambah custom field.
- Custom DocTypes baru untuk kebutuhan sekolah musik.

## Standard ERPNext DocTypes

### Student

Mewakili murid.

Custom fields:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `primary_instrument` | Link: Instrument | Yes | Instrumen utama |
| `secondary_instruments` | Table: Student Instrument | No | Instrumen tambahan |
| `skill_level` | Select | Yes | Beginner, Intermediate, Advanced |
| `learning_goal` | Select | No | Hobby, Exam Prep, Performance, Competition, Theory |
| `preferred_lesson_mode` | Select | No | Studio, Home Visit |
| `parent_guardian` | Link: User/Customer/Guardian | No | Orang tua/wali utama |
| `portal_enabled` | Check | No | Akses portal murid aktif |
| `music_notes` | Small Text | No | Catatan internal |

Relationships:

- Student has many Student Instrument.
- Student has many Guardian records through child table `guardians`.
- Student has many Student Attendance.
- Student has many Lesson Journal.
- Student has many Sales Invoice or Fees.

### Guardian

Mewakili orang tua atau wali murid.

ERPNext Education memakai `Guardian` sebagai penghubung antara user orang tua dan data murid. Parent Portal tidak langsung membaca semua Student dari user login, tetapi mencari Guardian dengan `user = frappe.session.user`, lalu mencari Student yang terhubung ke Guardian tersebut.

Core fields:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `guardian_name` | Data | Yes | Nama orang tua/wali |
| `email_address` | Data | No | Email kontak |
| `mobile_number` | Data | No | Nomor telepon |
| `user` | Link: User | No | User login orang tua/wali |

Relationships:

- Guardian can belong to many Students.
- Student can have many Guardians.
- Parent Portal User must be linked through `Guardian.user`.

### Instructor

Mewakili guru musik.

Custom fields:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `employee` | Link: Employee | No | Karyawan terkait |
| `instruments_taught` | Table: Instructor Instrument | Yes | Instrumen yang diajarkan |
| `default_hourly_rate` | Currency | No | Tarif internal default |
| `portal_enabled` | Check | No | Akses portal guru aktif |

Relationships:

- Instructor has many Instructor Instrument.
- Instructor has many Course Schedule.
- Instructor has many Instructor Attendance.
- Instructor has many Lesson Journal.

### Course

Mewakili program les.

Custom fields:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `instrument` | Link: Instrument | Yes | Instrumen course |
| `course_level` | Select | Yes | Beginner, Intermediate, Advanced |
| `lesson_type` | Select | Yes | Private |
| `duration_minutes` | Int | Yes | Durasi default sesi |
| `default_fee_category` | Link: Fee Category | No | Kategori biaya default |

Relationships:

- Course has many Course Schedule.
- Course can be linked to Fee Schedule.

### Student Group

Mewakili wrapper teknis ERPNext Education untuk jadwal privat.

Business rule:

- Satu Student Group Akres hanya berisi satu murid.
- Nama disarankan mengikuti format `<Student Name> - <Course Name>`.
- Student Group tidak dipakai sebagai kelas grup bisnis.

Custom fields:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `instrument` | Link: Instrument | Yes | Instrumen les |
| `group_level` | Select | Yes | Level les |
| `max_students` | Int | No | Isi `1` untuk private lesson |

Relationships:

- Student Group has one Student for Akres private lesson flow.
- Student Group has many Course Schedule.

### Course Schedule

Mewakili jadwal les privat.

Custom fields:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `instrument` | Link: Instrument | Yes | Instrumen sesi |
| `lesson_mode` | Select | Yes | Studio, Home Visit |
| `studio_room` | Link: Studio Room | No | Ruang studio jika lesson_mode = Studio |
| `home_visit_address` | Small Text | No | Alamat rumah jika lesson_mode = Home Visit |
| `travel_notes` | Small Text | No | Catatan akses/perjalanan untuk home visit |
| `private_lesson` | Check | Yes | Selalu aktif |
| `recurring_pattern` | Select | No | None, Weekly, Biweekly, Monthly |
| `schedule_status` | Select | Yes | Scheduled, Completed, Cancelled, Rescheduled |
| `original_schedule` | Link: Course Schedule | No | Jadwal asal jika reschedule |

Relationships:

- Course Schedule belongs to Course.
- Course Schedule belongs to Instructor.
- Course Schedule belongs to one private Student Group wrapper.
- Course Schedule has many Student Attendance.
- Course Schedule has many Lesson Journal.
- Course Schedule has one or many Instructor Attendance records.

### Student Attendance

Mewakili absensi murid.

Custom fields:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `course_schedule` | Link: Course Schedule | Yes | Jadwal terkait |
| `instrument` | Link: Instrument | Yes | Instrumen sesi |
| `attendance_status_detail` | Select | Yes | Present, Absent, Sick, Permission, Late, Rescheduled |
| `absence_reason` | Small Text | No | Alasan absen |
| `makeup_required` | Check | No | Perlu kelas pengganti |
| `makeup_schedule` | Link: Course Schedule | No | Jadwal pengganti |
| `parent_notified` | Check | No | Notifikasi sudah dikirim |
| `absence_alert_key` | Data | No | Kunci idempotensi notifikasi |

Relationships:

- Student Attendance belongs to Student.
- Student Attendance belongs to Course Schedule.
- Student Attendance may have one Lesson Journal.

### Fees / Sales Invoice

Mewakili tagihan.

Custom fields:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `student` | Link: Student | Yes | Murid terkait |
| `instrument` | Link: Instrument | No | Instrumen terkait |
| `billing_period` | Data | Yes | Periode tagihan, contoh 2026-05 |
| `lesson_package` | Data | No | Paket les, contoh 4x per bulan |

Relationships:

- Student has many Fees/Sales Invoice.
- Sales Invoice has many Payment Entry references.

## Custom DocTypes

### Instrument

Purpose:

Master data instrumen.

Fields:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `instrument_name` | Data | Yes | Nama instrumen |
| `instrument_category` | Select | Yes | Piano, Strings, Vocal, Guitar, Drums, Woodwind, Brass, Theory, Other |
| `is_active` | Check | No | Status aktif |

Naming:

- Autoname by `instrument_name`.

### Student Instrument

Purpose:

Child table untuk instrumen yang dipelajari murid.

Fields:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `instrument` | Link: Instrument | Yes | Instrumen |
| `level` | Select | Yes | Beginner, Intermediate, Advanced |
| `start_date` | Date | No | Tanggal mulai |
| `teacher` | Link: Instructor | No | Guru utama |
| `is_primary` | Check | No | Instrumen utama |

### Instructor Instrument

Purpose:

Child table untuk instrumen yang diajarkan guru.

Fields:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `instrument` | Link: Instrument | Yes | Instrumen |
| `level_from` | Select | Yes | Level minimal |
| `level_to` | Select | Yes | Level maksimal |

### Studio Room

Purpose:

Master data ruang kelas/studio.

Fields:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `room_name` | Data | Yes | Nama ruangan |
| `capacity` | Int | No | Kapasitas |
| `available_instruments` | Table: Room Instrument | No | Instrumen/fasilitas tersedia |
| `is_active` | Check | No | Status aktif |

Naming:

- Autoname by `room_name`.

### Room Instrument

Purpose:

Child table untuk instrumen/fasilitas yang tersedia di ruangan.

Fields:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `instrument` | Link: Instrument | Yes | Instrumen tersedia |
| `notes` | Small Text | No | Catatan fasilitas |

### Instructor Attendance

Purpose:

Mencatat kehadiran guru per jadwal mengajar.

Fields:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `instructor` | Link: Instructor | Yes | Guru |
| `employee` | Link: Employee | No | Karyawan terkait |
| `course_schedule` | Link: Course Schedule | Yes | Jadwal mengajar |
| `attendance_date` | Date | Yes | Tanggal |
| `instrument` | Link: Instrument | Yes | Instrumen |
| `status` | Select | Yes | Present, Absent, Substitute, Cancelled |
| `substitute_instructor` | Link: Instructor | No | Guru pengganti |
| `notes` | Small Text | No | Catatan |

Rules:

- `substitute_instructor` wajib jika `status = Substitute`.
- Kombinasi `instructor + course_schedule + attendance_date` sebaiknya unik.

### Lesson Journal

Purpose:

Jurnal perkembangan belajar per murid per sesi.

Fields:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `student` | Link: Student | Yes | Murid |
| `instructor` | Link: Instructor | Yes | Guru |
| `course_schedule` | Link: Course Schedule | Yes | Jadwal |
| `lesson_date` | Date | Yes | Tanggal sesi |
| `instrument` | Link: Instrument | Yes | Instrumen |
| `level` | Select | Yes | Beginner, Intermediate, Advanced |
| `attendance` | Link: Student Attendance | No | Absensi terkait |
| `material_covered` | Text Editor | No | Materi sesi |
| `technique_focus` | Small Text | No | Fokus teknik |
| `repertoire_items` | Table: Lesson Repertoire Item | No | Lagu/repertoire |
| `homework` | Text Editor | No | Tugas rumah |
| `teacher_notes` | Text Editor | No | Catatan guru |
| `progress_rating` | Select | No | Needs Work, Improving, Good, Excellent |
| `parent_visible` | Check | No | Tampil di portal orang tua |
| `submitted_at` | Datetime | No | Waktu submit |

Rules:

- Satu Lesson Journal idealnya dibuat untuk satu Student dalam satu Course Schedule.
- Portal hanya menampilkan jurnal dengan `parent_visible = 1`.

### Lesson Repertoire Item

Purpose:

Child table untuk repertoire dalam Lesson Journal.

Fields:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `repertoire` | Link: Repertoire | Yes | Lagu/repertoire |
| `status` | Select | Yes | Introduced, Practicing, Polishing, Completed |
| `notes` | Small Text | No | Catatan lagu |

### Repertoire

Purpose:

Master lagu atau materi repertoire.

Fields:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `title` | Data | Yes | Judul lagu |
| `composer_artist` | Data | No | Komposer/artis |
| `instrument` | Link: Instrument | Yes | Instrumen |
| `level` | Select | Yes | Beginner, Intermediate, Advanced |
| `genre` | Select | No | Classical, Pop, Jazz, Rock, Worship, Traditional, Other |
| `notes` | Small Text | No | Catatan |
| `is_active` | Check | No | Status aktif |

Naming:

- Format disarankan: `{title} - {instrument}` jika judul berpotensi sama.

## Relationship Summary

```text
Student
  -> Student Instrument
  -> Student Attendance
  -> Lesson Journal
  -> Fees / Sales Invoice

Instructor
  -> Instructor Instrument
  -> Course Schedule
  -> Instructor Attendance
  -> Lesson Journal

Course
  -> Course Schedule

Course Schedule
  -> Student Attendance
  -> Instructor Attendance
  -> Lesson Journal

Lesson Journal
  -> Lesson Repertoire Item
  -> Repertoire

Instrument
  -> Student
  -> Instructor
  -> Course
  -> Course Schedule
  -> Lesson Journal
  -> Repertoire
```
