# Feature Specification: ERPNext Music School Management

## Status

Draft

## Objective

Membangun sistem manajemen sekolah musik berbasis ERPNext/Frappe untuk mengelola murid, guru, jadwal les, absensi, jurnal perkembangan, portal orang tua/murid, billing manual, dan notifikasi.

## Background

ERPNext memiliki modul Education, HR, Accounts, dan Portal yang bisa menjadi fondasi. Namun ERPNext tidak spesifik untuk sekolah musik, sehingga perlu customisasi untuk instrumen, level murid, repertoire, jurnal per sesi, absensi guru per jadwal, dan portal orang tua.

## User Roles

### Admin

Mengelola konfigurasi sistem, master data, role, permission, jadwal, billing, dan laporan.

### Staff Akademik

Mengelola data murid, guru, course, jadwal, absensi, reschedule, dan laporan akademik.

### Guru/Instruktur

Melihat jadwal mengajar, mencatat absensi murid, mencatat kehadiran dirinya per sesi, dan menulis jurnal/progress belajar.

### Murid

Melihat jadwal, absensi, progress belajar, dan tagihan miliknya.

### Orang Tua/Wali

Melihat data anak yang terhubung, termasuk jadwal, absensi, progress belajar, invoice, dan status pembayaran.

## Scope

### In Scope

- Master data instrumen.
- Data murid dengan instrumen dan level.
- Data guru dengan instrumen yang diajarkan.
- Course/program les musik.
- Jadwal les privat di studio dan home visit.
- Absensi murid per jadwal.
- Absensi guru/instruktur per jadwal.
- Lesson journal/progress belajar per sesi.
- Repertoire/lagu yang dipelajari murid.
- Portal murid dan orang tua.
- Billing dasar dengan Fees/Sales Invoice.
- Notifikasi absensi berulang dan reminder pembayaran.
- Laporan akademik, operasional, dan keuangan dasar.

### Out of Scope untuk MVP

- Payroll guru berbasis sesi.
- Integrasi payment gateway.
- Mobile app native.
- Integrasi WhatsApp official.
- Penjadwalan otomatis berbasis availability.
- Sistem ujian musik lengkap.

## Functional Requirements

### FR-001: Master Instrument

Sistem harus menyediakan master data instrumen yang aktif digunakan oleh sekolah musik.

Acceptance criteria:

- Admin dapat membuat, mengubah, menonaktifkan instrumen.
- Instrumen dapat dipakai di Student, Instructor, Course, Course Schedule, dan Lesson Journal.

### FR-002: Student Music Profile

Sistem harus menyimpan profil musik murid.

Acceptance criteria:

- Staff dapat mengisi instrumen utama murid.
- Staff dapat menambahkan instrumen tambahan.
- Staff dapat mengisi level murid: Beginner, Intermediate, Advanced.
- Staff dapat mengisi tujuan belajar murid.

### FR-003: Instructor Music Profile

Sistem harus menyimpan instrumen dan level yang bisa diajarkan oleh guru.

Acceptance criteria:

- Staff dapat mengisi nama instruktur.
- Staff dapat mengisi daftar instrumen yang diajarkan.
- Staff dapat mengisi rentang level yang dapat diajarkan.

### FR-004: Course Musik

Sistem harus memungkinkan pembuatan course/program les privat berdasarkan instrumen, level, dan durasi.

Acceptance criteria:

- Course memiliki instrumen.
- Course memiliki level.
- Course memakai tipe kelas Private.
- Course memiliki durasi default.

### FR-005: Jadwal Les

Sistem harus menyediakan jadwal les privat per course, guru, murid, lokasi, tanggal, dan waktu.

Acceptance criteria:

- Staff dapat membuat jadwal les privat di studio.
- Staff dapat membuat jadwal les privat home visit ke rumah murid.
- Jadwal memiliki `lesson_mode`: Studio atau Home Visit.
- Jadwal studio terhubung ke Studio Room.
- Jadwal home visit menyimpan alamat dan catatan perjalanan.
- Staff dapat membuat jadwal berulang mingguan, dua mingguan, atau bulanan sampai tanggal akhir.
- Jadwal memiliki status: Scheduled, Completed, Cancelled, Rescheduled.
- Jadwal dapat menunjuk jadwal asal jika merupakan reschedule.

### FR-006: Absensi Murid

Guru atau staff harus bisa mencatat absensi murid per jadwal.

Acceptance criteria:

- Guru dapat membuka jadwal miliknya.
- Guru dapat memilih status absensi: Present, Absent, Sick, Permission, Late, Rescheduled.
- Staff dapat melihat riwayat absensi per murid.
- Jika absen membutuhkan makeup lesson, sistem dapat menandai `makeup_required`.

### FR-007: Absensi Guru

Sistem harus bisa mencatat kehadiran guru per jadwal mengajar.

Acceptance criteria:

- Guru atau staff dapat mencatat status guru: Present, Absent, Substitute, Cancelled.
- Jika memakai guru pengganti, sistem menyimpan `substitute_instructor`.
- Absensi guru terhubung ke Course Schedule.

### FR-008: Lesson Journal

Guru harus bisa menulis jurnal perkembangan murid per sesi.

Acceptance criteria:

- Jurnal terhubung ke Student, Instructor, Course Schedule, Instrument, dan Attendance.
- Guru dapat mengisi materi yang dipelajari.
- Guru dapat mengisi lagu/repertoire.
- Guru dapat mengisi homework.
- Guru dapat mengisi progress rating.
- Guru dapat menentukan apakah jurnal terlihat di portal orang tua.

### FR-009: Repertoire

Sistem harus memiliki master lagu/repertoire.

Acceptance criteria:

- Staff dapat membuat repertoire dengan judul, komposer/artis, instrumen, level, dan genre.
- Repertoire dapat dipilih di Lesson Journal.

### FR-010: Portal Murid

Murid harus bisa melihat informasi akademik dan billing pribadi.

Acceptance criteria:

- Murid dapat melihat jadwal mendatang.
- Murid dapat melihat riwayat absensi.
- Murid dapat melihat jurnal yang visible.
- Murid dapat melihat invoice dan status pembayaran.

### FR-011: Portal Orang Tua

Orang tua harus bisa melihat informasi anak yang terhubung.

Acceptance criteria:

- Orang tua login memakai User dengan role `Parent Portal User`.
- User orang tua harus terhubung ke DocType `Guardian` melalui field `Guardian.user`.
- Student harus terhubung ke Guardian melalui child table `guardians`.
- Orang tua dapat melihat daftar anak.
- Orang tua dapat melihat jadwal anak.
- Orang tua dapat melihat absensi anak.
- Orang tua dapat melihat progress journal yang visible.
- Orang tua dapat melihat invoice dan status pembayaran anak.

### FR-012: Billing Les

Sistem harus bisa membuat dan menampilkan tagihan les.

Acceptance criteria:

- Admin/staff dapat membuat Fee Schedule.
- Sistem dapat membuat Fees atau Sales Invoice.
- Invoice terhubung ke Student dan billing period.
- Orang tua dapat melihat status tagihan di portal.

### FR-013: Notifikasi Absensi

Sistem harus mengirim notifikasi jika murid terlalu sering absen.

Acceptance criteria:

- Sistem menghitung jumlah absen dalam periode tertentu.
- Jika murid absen minimal 3 kali dalam 30 hari, sistem mengirim notifikasi ke orang tua.
- Jika murid absen 2 kali berturut-turut, sistem mengirim notifikasi ke staff akademik.
- Sistem menandai absensi yang sudah memicu notifikasi agar tidak duplikat.

### FR-014: Notifikasi Tagihan

Sistem harus mengirim reminder tagihan yang belum lunas.

Acceptance criteria:

- Sistem mengirim reminder 7 hari sebelum jatuh tempo.
- Sistem mengirim reminder pada tanggal jatuh tempo.
- Sistem mengirim reminder 3 hari setelah jatuh tempo jika invoice belum ditandai lunas.

### FR-015: Reports

Sistem harus menyediakan laporan dasar.

Acceptance criteria:

- Laporan absensi per murid.
- Laporan absensi per course/jadwal.
- Laporan progress per murid.
- Laporan pemakaian ruangan.
- Laporan outstanding invoice.

## Non-Functional Requirements

- Customisasi tidak boleh mengubah source ERPNext langsung.
- Semua custom DocType dan Custom Field harus berada di custom app.
- Permission harus membatasi akses guru, murid, dan orang tua hanya ke data yang relevan.
- Portal harus mudah dipakai di mobile browser.
- Data billing harus tetap mengikuti standar ERPNext Accounts.
- Semua automation notifikasi harus idempotent agar tidak mengirim pesan duplikat.

## Key Business Rules

- Satu murid bisa belajar lebih dari satu instrumen.
- Satu guru bisa mengajar lebih dari satu instrumen.
- Semua jadwal les adalah privat untuk satu murid. `Student Group` tetap dipakai sebagai wrapper teknis ERPNext Education dengan isi satu murid per group.
- Lesson Journal dibuat per murid per sesi.
- Orang tua hanya dapat melihat jurnal dengan `parent_visible = 1`.
- Absensi `Sick`, `Permission`, dan `Absent` dihitung sebagai ketidakhadiran untuk aturan notifikasi, kecuali bisnis memutuskan lain.
- Reschedule tidak dihitung sebagai absen jika sudah ada jadwal pengganti.

## MVP Definition

MVP selesai jika:

- Admin dapat membuat master instrumen, murid, guru, course, jadwal.
- Guru dapat melihat jadwal hari ini.
- Guru dapat mencatat absensi murid.
- Guru dapat mencatat lesson journal.
- Staff dapat melihat ringkasan absensi dan progress.
- Orang tua dapat login portal dan melihat jadwal, absensi, progress, dan invoice anak.
- Sistem dapat mengirim notifikasi absensi berulang.
