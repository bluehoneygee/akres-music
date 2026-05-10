# Demo Payloads: Akres Music dari Nol

Dokumen ini berisi urutan input data dummy untuk mencoba flow Akres Music di ERPNext.

Base URL lokal:

```text
http://localhost:8080
```

Login admin:

```text
Administrator / admin
```

Untuk API, endpoint umumnya:

```bash
curl -X POST "http://localhost:8080/api/resource/<DocType>" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -b cookies.txt \
  -d '<JSON_PAYLOAD>'
```

Catatan penting: beberapa DocType memakai autoname. Setelah create, simpan nilai `data.name` dari response, lalu pakai untuk payload berikutnya.

## Urutan Minimal

1. User dan role
2. Academic Year
3. Master data musik: Instrument, Repertoire
4. Master data Education: Course, Room, Instructor
5. Guardian dan Student
6. Private Lesson Group
7. Course Schedule untuk Studio atau Home Visit
8. Student Attendance
9. Instructor Attendance
10. Lesson Journal

## 1. Users

### Staff Admin Operasional

```json
{
  "doctype": "User",
  "email": "staff@akres.test",
  "first_name": "Staff",
  "last_name": "Akres",
  "enabled": 1,
  "user_type": "System User",
  "send_welcome_email": 0,
  "new_password": "admin123",
  "roles": [
    { "role": "Academic Staff" }
  ]
}
```

### Guru / Instruktur

```json
{
  "doctype": "User",
  "email": "budi.teacher@akres.test",
  "first_name": "Budi",
  "last_name": "Santoso",
  "enabled": 1,
  "user_type": "System User",
  "send_welcome_email": 0,
  "new_password": "admin123",
  "roles": [
    { "role": "Music Instructor" }
  ]
}
```

### Murid Portal

```json
{
  "doctype": "User",
  "email": "ayu.student@akres.test",
  "first_name": "Ayu",
  "last_name": "Prameswari",
  "enabled": 1,
  "user_type": "Website User",
  "send_welcome_email": 0,
  "new_password": "admin123",
  "roles": [
    { "role": "Student Portal User" }
  ]
}
```

### Orang Tua Portal

```json
{
  "doctype": "User",
  "email": "rina.parent@akres.test",
  "first_name": "Rina",
  "last_name": "Prameswari",
  "enabled": 1,
  "user_type": "Website User",
  "send_welcome_email": 0,
  "new_password": "admin123",
  "roles": [
    { "role": "Parent Portal User" }
  ]
}
```

## 2. Academic Year

```json
{
  "doctype": "Academic Year",
  "academic_year_name": "2026",
  "year_start_date": "2026-01-01",
  "year_end_date": "2026-12-31"
}
```

Pakai nama ini di payload berikut:

```text
<ACADEMIC_YEAR_2026> = 2026
```

## 3. Instrument

### Piano

```json
{
  "doctype": "Instrument",
  "instrument_name": "Piano",
  "instrument_category": "Piano",
  "is_active": 1
}
```

### Vocal

```json
{
  "doctype": "Instrument",
  "instrument_name": "Vocal",
  "instrument_category": "Vocal",
  "is_active": 1
}
```

## 4. Repertoire

```json
{
  "doctype": "Repertoire",
  "title": "Minuet in G",
  "composer_artist": "J. S. Bach",
  "instrument": "Piano",
  "level": "Beginner",
  "genre": "Classical",
  "notes": "Materi awal untuk koordinasi tangan kanan dan kiri.",
  "is_active": 1
}
```

```json
{
  "doctype": "Repertoire",
  "title": "Twinkle Twinkle Little Star",
  "composer_artist": "Traditional",
  "instrument": "Vocal",
  "level": "Beginner",
  "genre": "Traditional",
  "notes": "Latihan pitch dasar dan artikulasi.",
  "is_active": 1
}
```

## 5. Course

```json
{
  "doctype": "Course",
  "course_name": "Piano Beginner Private",
  "description": "Les piano privat level beginner.",
  "instrument": "Piano",
  "course_level": "Beginner",
  "duration_minutes": 60,
  "lesson_type": "Private"
}
```

Pakai nama ini:

```text
<COURSE_PIANO_BEGINNER> = Piano Beginner Private
```

## 6. Room

`Course Schedule` bawaan Education mewajibkan DocType `Room`.

Untuk Akres:

- Jika les di studio, isi `room` dengan room ERPNext dan `studio_room` dengan Studio Room Akres.
- Jika home visit, isi `room` dengan room teknis `Home Visit`, lalu isi `home_visit_address`.

```json
{
  "doctype": "Room",
  "room_name": "Piano Room 1",
  "room_number": "PR-01",
  "seating_capacity": 2
}
```

Simpan `data.name` sebagai:

```text
<ROOM_PIANO_1>
```

### Room Teknis untuk Home Visit

Biasanya ini sudah dibuat otomatis oleh app saat migrate. Kalau belum ada, payload-nya:

```json
{
  "doctype": "Room",
  "room_name": "Home Visit",
  "room_number": "HV-00",
  "seating_capacity": 1
}
```

Simpan sebagai:

```text
<ROOM_HOME_VISIT>
```

Jika dibuat otomatis oleh app, nama record biasanya terlihat seperti `HTL-ROOM-2026-00001`. Pakai nilai `data.name`/`name` tersebut, bukan teks `Home Visit`.

### Studio Room Akres

```json
{
  "doctype": "Studio Room",
  "room_name": "Piano Room 1",
  "capacity": 2,
  "available_instruments": [
    { "instrument": "Piano", "notes": "Upright piano" }
  ],
  "is_active": 1
}
```

## 7. Instructor

```json
{
  "doctype": "Instructor",
  "instructor_name": "Budi Santoso",
  "status": "Active"
}
```

Simpan `data.name` sebagai:

```text
<INSTRUCTOR_BUDI>
```

## 8. Guardian

```json
{
  "doctype": "Guardian",
  "guardian_name": "Rina Prameswari",
  "email_address": "rina.parent@akres.test",
  "mobile_number": "081234567890",
  "user": "rina.parent@akres.test",
  "occupation": "Parent"
}
```

Simpan `data.name` sebagai:

```text
<GUARDIAN_RINA>
```

## 9. Student

```json
{
  "doctype": "Student",
  "enabled": 1,
  "first_name": "Ayu",
  "last_name": "Prameswari",
  "student_email_id": "ayu.student@akres.test",
  "student_mobile_number": "081298765432",
  "joining_date": "2026-05-10",
  "date_of_birth": "2015-03-12",
  "gender": "Female",
  "nationality": "Indonesia",
  "user": "ayu.student@akres.test",
  "guardians": [
    {
      "guardian": "<GUARDIAN_RINA>",
      "relation": "Mother"
    }
  ]
}
```

Simpan `data.name` sebagai:

```text
<STUDENT_AYU>
```

## 10. Private Lesson Group

ERPNext Education tetap mewajibkan `Student Group` untuk `Course Schedule`. Untuk Akres, ini hanya wrapper teknis berisi satu murid, bukan kelas grup.

```json
{
  "doctype": "Student Group",
  "academic_year": "2026",
  "group_based_on": "Course",
  "student_group_name": "Ayu - Piano Beginner Private",
  "course": "Piano Beginner Private",
  "max_strength": 1,
  "students": [
    {
      "student": "<STUDENT_AYU>",
      "active": 1
    }
  ],
  "instructors": [
    {
      "instructor": "<INSTRUCTOR_BUDI>"
    }
  ]
}
```

Pakai nama ini:

```text
<PRIVATE_GROUP_AYU_PIANO> = Ayu - Piano Beginner Private
```

## 11A. Course Schedule - Studio

```json
{
  "doctype": "Course Schedule",
  "student_group": "Ayu - Piano Beginner Private",
  "instructor": "<INSTRUCTOR_BUDI>",
  "course": "Piano Beginner Private",
  "schedule_date": "2026-05-17",
  "room": "<ROOM_PIANO_1>",
  "from_time": "10:00:00",
  "to_time": "11:00:00",
  "class_schedule_color": "blue",
  "lesson_mode": "Studio",
  "studio_room": "Piano Room 1",
  "private_lesson": 1,
  "schedule_status": "Scheduled"
}
```

Simpan `data.name` sebagai:

```text
<COURSE_SCHEDULE_1>
```

## 11B. Course Schedule - Home Visit

Gunakan payload ini kalau guru datang ke rumah murid.

```json
{
  "doctype": "Course Schedule",
  "student_group": "Ayu - Piano Beginner Private",
  "instructor": "<INSTRUCTOR_BUDI>",
  "course": "Piano Beginner Private",
  "schedule_date": "2026-05-24",
  "room": "<ROOM_HOME_VISIT>",
  "from_time": "10:00:00",
  "to_time": "11:00:00",
  "class_schedule_color": "green",
  "lesson_mode": "Home Visit",
  "home_visit_address": "Jl. Melodi No. 12, Jakarta Selatan",
  "travel_notes": "Parkir di depan rumah, hubungi Rina saat sampai.",
  "private_lesson": 1,
  "schedule_status": "Scheduled"
}
```

Simpan `data.name` sebagai:

```text
<COURSE_SCHEDULE_HOME_VISIT_1>
```

## 12. Student Attendance

```json
{
  "doctype": "Student Attendance",
  "student": "<STUDENT_AYU>",
  "course_schedule": "<COURSE_SCHEDULE_1>",
  "student_group": "Ayu - Piano Beginner Private",
  "date": "2026-05-17",
  "status": "Present"
}
```

Simpan `data.name` sebagai:

```text
<STUDENT_ATTENDANCE_1>
```

Kalau ingin submit attendance:

```bash
curl -X POST "http://localhost:8080/api/resource/Student%20Attendance/<STUDENT_ATTENDANCE_1>?run_method=submit" \
  -H "Accept: application/json" \
  -b cookies.txt
```

## 13. Instructor Attendance

```json
{
  "doctype": "Instructor Attendance",
  "instructor": "<INSTRUCTOR_BUDI>",
  "course_schedule": "<COURSE_SCHEDULE_1>",
  "attendance_date": "2026-05-17",
  "instrument": "Piano",
  "status": "Present",
  "notes": "Kelas berjalan sesuai jadwal."
}
```

## 14. Lesson Journal

```json
{
  "doctype": "Lesson Journal",
  "student": "<STUDENT_AYU>",
  "instructor": "<INSTRUCTOR_BUDI>",
  "course_schedule": "<COURSE_SCHEDULE_1>",
  "lesson_date": "2026-05-17",
  "instrument": "Piano",
  "level": "Beginner",
  "attendance": "<STUDENT_ATTENDANCE_1>",
  "material_covered": "Postur duduk, finger number, dan latihan tangan kanan.",
  "technique_focus": "Koordinasi jari 1-2-3 tangan kanan.",
  "repertoire_items": [
    {
      "repertoire": "Minuet in G - Piano",
      "status": "Introduced",
      "notes": "Mulai bagian intro 4 bar pertama."
    }
  ],
  "homework": "Latihan finger number 10 menit per hari.",
  "teacher_notes": "Ayu cepat menangkap instruksi, perlu latihan tempo stabil.",
  "progress_rating": "Improving",
  "parent_visible": 1,
  "submitted_at": "2026-05-17 11:05:00"
}
```

## 15. Test Login

### Staff

```text
Email: staff@akres.test
Password: admin123
Expected: masuk ke /app/akres-music
```

### Guru

```text
Email: budi.teacher@akres.test
Password: admin123
Expected: masuk ke /app/akres-music, bisa input attendance dan journal
```

### Murid

```text
Email: ayu.student@akres.test
Password: admin123
Expected: masuk ke /student-portal
```

### Orang Tua

```text
Email: rina.parent@akres.test
Password: admin123
Expected: masuk ke /parent-portal dan melihat data Ayu
```

## Ringkasan Data yang Wajib Ada

Minimal sebelum jadwal bisa dibuat:

- `Academic Year`
- `Course`
- `Room`
- `Instructor`
- `Student`
- `Student Group` privat berisi satu murid

Minimal sebelum jurnal bisa dibuat:

- `Instrument`
- `Course Schedule`
- `Student Attendance`
- `Instructor Attendance`
- `Lesson Journal`

Minimal agar portal murid/orang tua menampilkan data:

- Student punya `user = email murid`
- Guardian punya `user = email orang tua`
- Student terhubung ke Guardian di child table `guardians`
- Lesson Journal punya `parent_visible = 1`
