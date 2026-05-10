# Quickstart: ERPNext Music School Management

## Purpose

Dokumen ini menjelaskan langkah awal untuk menjalankan implementasi custom app `akres_music` pada instalasi ERPNext/Frappe.

## Prerequisites

- Frappe bench sudah terpasang.
- ERPNext sudah terpasang pada site target.
- Developer mode aktif untuk membuat dan export customizations.
- Akses terminal ke server development.

## Create Custom App

```bash
bench new-app akres_music
```

Install app ke site:

```bash
bench --site your-site.local install-app akres_music
```

Aktifkan developer mode:

```bash
bench --site your-site.local set-config developer_mode 1
bench restart
```

## Create DocTypes

Buat DocTypes berikut lewat Desk atau fixture JSON:

- Instrument
- Student Instrument
- Instructor Instrument
- Studio Room
- Room Instrument
- Instructor Attendance
- Lesson Journal
- Lesson Repertoire Item
- Repertoire

Pastikan child table ditandai sebagai `Is Child Table`.

## Add Custom Fields

Tambahkan custom fields pada:

- Student
- Guardian
- Instructor
- Course
- Student Group
- Course Schedule
- Student Attendance
- Fees
- Sales Invoice

Gunakan [data-model.md](./data-model.md) sebagai referensi field.

## Export Fixtures

Tambahkan konfigurasi fixtures di `hooks.py`:

```python
fixtures = [
    "Custom Field",
    "Property Setter",
    "Role",
]
```

Export fixtures:

```bash
bench --site your-site.local export-fixtures
```

## Run Migration

```bash
bench --site your-site.local migrate
```

## Setup Roles

Buat role:

- Academic Staff
- Music Instructor
- Student Portal User
- Parent Portal User

Lalu atur permission untuk DocTypes custom dan standard DocTypes yang dipakai.

## Setup Demo Data

Minimal demo data:

- Instrument: Piano, Vocal, Guitar, Violin, Drum.
- Studio Room: Studio A, Studio B, Piano Room.
- Instructor: minimal 2 guru.
- Guardian: minimal 1 orang tua/wali dengan `user` terhubung ke User orang tua.
- Student: minimal 3 murid, masing-masing terhubung ke Guardian.
- Course: Piano Beginner Private, Vocal Intermediate Private.
- Private Lesson Group: Student Group teknis berisi satu murid.
- Course Schedule: jadwal minggu ini untuk Studio dan Home Visit.
- Repertoire: minimal 5 lagu.

## MVP Smoke Test

### Admin/Staff

1. Buat instrument.
2. Buat student dengan primary instrument dan skill level.
3. Buat instructor dengan instruments taught.
4. Buat course.
5. Buat course schedule.

Expected result:

- Semua data tersimpan.
- Course Schedule menampilkan instructor, course, lesson mode, studio room atau home visit address.

### Teacher

1. Login sebagai Music Instructor.
2. Buka jadwal hari ini.
3. Buat Student Attendance.
4. Buat Instructor Attendance.
5. Buat Lesson Journal.

Expected result:

- Guru hanya melihat jadwal miliknya.
- Absensi dan jurnal tersimpan.
- Lesson Journal otomatis terhubung ke student, schedule, instrument, dan instructor.

### Parent

1. Login sebagai Parent Portal User.
2. Buka `/parent-portal`.
3. Lihat jadwal, absensi, dan progress anak yang terhubung.

Expected result:

- Orang tua hanya melihat anak yang terhubung.
- Lesson Journal yang tidak `parent_visible` tidak tampil.

### Student

1. Login sebagai Student Portal User.
2. Buka `/student-portal`.
3. Lihat jadwal, absensi, dan progress.

Expected result:

- Murid hanya melihat data miliknya.

## Notification Test

### Repeated Absence

1. Buat 3 absensi dengan status Absent/Sick/Permission dalam 30 hari.
2. Jalankan scheduled job absensi.

Expected result:

- Orang tua menerima notifikasi.
- Sistem menyimpan flag atau key agar notifikasi tidak dikirim ulang.

### Invoice Reminder

Payment integration belum masuk MVP saat ini. Bagian invoice/reminder disiapkan sebagai fase lanjutan setelah flow akademik stabil.

## Development Commands

```bash
bench --site your-site.local migrate
bench --site your-site.local clear-cache
bench --site your-site.local console
bench --site your-site.local execute akres_music.scheduler.check_repeated_absences
```

## Next Documents

- [spec.md](./spec.md)
- [plan.md](./plan.md)
- [data-model.md](./data-model.md)
- [tasks.md](./tasks.md)
