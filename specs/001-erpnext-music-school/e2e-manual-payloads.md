# E2E Manual Payloads: Akres Music Backend

Dokumen ini berisi payload manual untuk mencoba flow end-to-end Akres Music dengan backend Next.js + MongoDB.

## Environment

MongoDB lokal:

```text
mongodb://127.0.0.1:27017
```

Database:

```text
akres_music_academic
```

Login admin default:

```text
admin@akres.test / admin123
```

## Flow Terbaru

Flow normal sekarang:

1. Buat master data: Instrument, Instructor, Guardian, Course, Studio Room.
2. Buat Student sebagai profil murid saja.
3. Buat Lesson Package: student, course, instructor, billing period, lesson start date, hari, dan jam.
4. Sistem otomatis generate 4 sesi sejak `lessonStartDate` sesuai `lessonDays`.
5. Sistem otomatis generate Student Attendance dan Instructor Attendance dengan status `Pending`.
6. Menu Schedules dan Attendance dipakai untuk review/edit, bukan create manual.

Catatan pemakaian manual:

- API `POST /api/{resource}` menerima satu object per request.
- Array di tiap bagian bawah adalah 3 contoh payload; submit object-nya satu per satu.
- Untuk attendance, gunakan halaman Attendance atau `PUT /api/{resource}/{id}` karena record-nya sudah dibuat otomatis dari Lesson Package.

Catatan:

- `billingPeriod` dipakai sebagai billing period.
- `lessonStartDate` dipakai sebagai tanggal mulai paket 4x les.
- Jadwal boleh lanjut ke bulan berikutnya kalau 4 sesi belum selesai di billing period yang sama.
- ID schedule dari Lesson Package dibuat deterministik:

```text
schedule-{lessonPackageId}
schedule-{lessonPackageId}-2
schedule-{lessonPackageId}-3
schedule-{lessonPackageId}-4
```

## 1. Instruments

Resource: `instruments`

```json
[
  {
    "id": "inst-violin",
    "instrumentName": "Violin",
    "instrumentCategory": "Strings",
    "isActive": true
  },
  {
    "id": "inst-piano",
    "instrumentName": "Piano",
    "instrumentCategory": "Piano",
    "isActive": true
  },
  {
    "id": "inst-vocal",
    "instrumentName": "Vocal",
    "instrumentCategory": "Vocal",
    "isActive": true
  }
]
```

## 2. Instructors

Resource: `instructors`

```json
[
  {
    "id": "instructor-sari",
    "instructorName": "Sari Wijaya",
    "instrumentIds": ["inst-violin"],
    "levelFrom": "Beginner",
    "levelTo": "Advanced",
    "portalEnabled": true
  },
  {
    "id": "instructor-budi",
    "instructorName": "Budi Santoso",
    "instrumentIds": ["inst-piano"],
    "levelFrom": "Beginner",
    "levelTo": "Advanced",
    "portalEnabled": true
  },
  {
    "id": "instructor-maya",
    "instructorName": "Maya Putri",
    "instrumentIds": ["inst-vocal"],
    "levelFrom": "Beginner",
    "levelTo": "Intermediate",
    "portalEnabled": true
  }
]
```

## 3. Guardians

Resource: `guardians`

```json
[
  {
    "id": "guardian-dewi",
    "guardianName": "Dewi Hartono",
    "mobileNumber": "081234567891"
  },
  {
    "id": "guardian-rina",
    "guardianName": "Rina Prameswari",
    "mobileNumber": "081234567892"
  },
  {
    "id": "guardian-andi",
    "guardianName": "Andi Saputra",
    "mobileNumber": "081234567893"
  }
]
```

## 4. Courses

Resource: `courses`

`lessonType` tidak perlu dikirim. Backend otomatis menyimpan `Private`.

```json
[
  {
    "id": "course-violin-beginner",
    "courseName": "Violin Beginner Private",
    "instrumentId": "inst-violin",
    "courseLevel": "Beginner",
    "durationMinutes": 60,
    "defaultFee": 900000
  },
  {
    "id": "course-piano-beginner",
    "courseName": "Piano Beginner Private",
    "instrumentId": "inst-piano",
    "courseLevel": "Beginner",
    "durationMinutes": 60,
    "defaultFee": 850000
  },
  {
    "id": "course-vocal-intermediate",
    "courseName": "Vocal Intermediate Private",
    "instrumentId": "inst-vocal",
    "courseLevel": "Intermediate",
    "durationMinutes": 60,
    "defaultFee": 800000
  }
]
```

## 5. Studio Rooms

Resource: `rooms`

```json
[
  {
    "id": "room-strings-1",
    "roomName": "Strings Room 1",
    "capacity": 2,
    "instrumentIds": ["inst-violin"],
    "isActive": true
  },
  {
    "id": "room-piano-1",
    "roomName": "Piano Room 1",
    "capacity": 2,
    "instrumentIds": ["inst-piano"],
    "isActive": true
  },
  {
    "id": "room-vocal-1",
    "roomName": "Vocal Room 1",
    "capacity": 2,
    "instrumentIds": ["inst-vocal"],
    "isActive": true
  }
]
```

## 6. Students

Resource: `students`

Payload Student fokus ke profil murid. Jadwal dibuat dari Lesson Package.

```json
[
  {
    "id": "student-luna",
    "firstName": "Luna",
    "lastName": "Hartono",
    "primaryInstrumentId": "inst-violin",
    "skillLevel": "Beginner",
    "learningGoal": "Performance",
    "preferredLessonMode": "Studio",
    "guardianIds": ["guardian-dewi"],
    "portalEnabled": true,
    "musicNotes": "Mulai dari postur bowing dasar."
  },
  {
    "id": "student-ayu",
    "firstName": "Ayu",
    "lastName": "Prameswari",
    "primaryInstrumentId": "inst-piano",
    "skillLevel": "Beginner",
    "learningGoal": "Technique",
    "preferredLessonMode": "Studio",
    "guardianIds": ["guardian-rina"],
    "portalEnabled": true,
    "musicNotes": "Fokus koordinasi tangan kanan dan kiri."
  },
  {
    "id": "student-nara",
    "firstName": "Nara",
    "lastName": "Saputra",
    "primaryInstrumentId": "inst-vocal",
    "skillLevel": "Intermediate",
    "learningGoal": "Confidence",
    "preferredLessonMode": "Home Visit",
    "guardianIds": ["guardian-andi"],
    "portalEnabled": true,
    "musicNotes": "Latihan pernapasan dan artikulasi."
  }
]
```

## 7. Lesson Packages

Resource: `lesson-packages`

Payload Lesson Package di bawah membuat 4 schedules dan attendance otomatis.

```json
[
  {
    "id": "package-luna-2026-05",
    "studentId": "student-luna",
    "courseId": "course-violin-beginner",
    "instructorId": "instructor-sari",
    "instrumentId": "inst-violin",
    "billingPeriod": "2026-05",
    "lessonStartDate": "2026-05-15",
    "lessonDays": ["6"],
    "lessonCount": 4,
    "fromTime": "09:00",
    "toTime": "10:00",
    "lessonMode": "Studio",
    "studioRoomId": "room-strings-1",
    "status": "Active"
  },
  {
    "id": "package-ayu-2026-05",
    "studentId": "student-ayu",
    "courseId": "course-piano-beginner",
    "instructorId": "instructor-budi",
    "instrumentId": "inst-piano",
    "billingPeriod": "2026-05",
    "lessonStartDate": "2026-05-01",
    "lessonDays": ["1"],
    "lessonCount": 4,
    "fromTime": "15:00",
    "toTime": "16:00",
    "lessonMode": "Studio",
    "studioRoomId": "room-piano-1",
    "status": "Active"
  },
  {
    "id": "package-nara-2026-05",
    "studentId": "student-nara",
    "courseId": "course-vocal-intermediate",
    "instructorId": "instructor-maya",
    "instrumentId": "inst-vocal",
    "billingPeriod": "2026-05",
    "lessonStartDate": "2026-05-15",
    "lessonDays": ["3"],
    "lessonCount": 4,
    "fromTime": "19:00",
    "toTime": "20:00",
    "lessonMode": "Home Visit",
    "homeVisitAddress": "Jl. Melodi No. 22, Jakarta Selatan",
    "travelNotes": "Parkir di depan rumah.",
    "status": "Active"
  }
]
```

Schedule yang otomatis dibuat:

```text
package-luna-2026-05 -> 2026-05-16, 2026-05-23, 2026-05-30, 2026-06-06
package-ayu-2026-05  -> 2026-05-04, 2026-05-11, 2026-05-18, 2026-05-25
package-nara-2026-05 -> 2026-05-20, 2026-05-27, 2026-06-03, 2026-06-10
```

Attendance juga otomatis dibuat:

```text
student-attendance-schedule-package-luna-2026-05
instructor-attendance-schedule-package-luna-2026-05
```

## 8. Repertoires

Resource: `repertoires`

```json
[
  {
    "id": "rep-twinkle-violin",
    "title": "Twinkle Twinkle Little Star",
    "composerArtist": "Traditional",
    "instrumentId": "inst-violin",
    "level": "Beginner",
    "genre": "Traditional",
    "notes": "Latihan intonasi dan bowing dasar.",
    "isActive": true
  },
  {
    "id": "rep-minuet-g",
    "title": "Minuet in G",
    "composerArtist": "J. S. Bach",
    "instrumentId": "inst-piano",
    "level": "Beginner",
    "genre": "Classical",
    "notes": "Latihan koordinasi dua tangan.",
    "isActive": true
  },
  {
    "id": "rep-stand-by-me",
    "title": "Stand by Me",
    "composerArtist": "Ben E. King",
    "instrumentId": "inst-vocal",
    "level": "Intermediate",
    "genre": "Pop",
    "notes": "Latihan phrasing dan kontrol napas.",
    "isActive": true
  }
]
```

## 9. Attendance Updates

Resource: `student-attendance`

Record attendance sudah otomatis dibuat. Gunakan payload ini untuk update record yang sudah ada, bukan create baru.

```json
[
  {
    "id": "student-attendance-schedule-package-luna-2026-05",
    "status": "Present",
    "absenceReason": "",
    "makeupRequired": false
  },
  {
    "id": "student-attendance-schedule-package-ayu-2026-05",
    "status": "Sick",
    "absenceReason": "Flu",
    "makeupRequired": true
  },
  {
    "id": "student-attendance-schedule-package-nara-2026-05",
    "status": "Permission",
    "absenceReason": "Family event",
    "makeupRequired": true
  }
]
```

Resource: `instructor-attendance`

```json
[
  {
    "id": "instructor-attendance-schedule-package-luna-2026-05",
    "status": "Present",
    "substituteInstructorId": "",
    "notes": "Kelas berjalan sesuai jadwal."
  },
  {
    "id": "instructor-attendance-schedule-package-ayu-2026-05",
    "status": "Present",
    "substituteInstructorId": "",
    "notes": "Kelas berjalan sesuai jadwal."
  },
  {
    "id": "instructor-attendance-schedule-package-nara-2026-05",
    "status": "Substitute",
    "substituteInstructorId": "instructor-sari",
    "notes": "Guru utama berhalangan."
  }
]
```

## 10. Lesson Journals

Resource: `journals`

```json
[
  {
    "id": "journal-luna-1",
    "studentId": "student-luna",
    "instructorId": "instructor-sari",
    "courseScheduleId": "schedule-package-luna-2026-05",
    "lessonDate": "2026-05-16",
    "instrumentId": "inst-violin",
    "level": "Beginner",
    "materialCovered": "Postur biola, posisi bow, dan open string.",
    "techniqueFocus": "Bowing lurus pada open string A dan D.",
    "homework": "Latihan open string 10 menit per hari.",
    "progressRating": "Improving",
    "parentVisible": true
  },
  {
    "id": "journal-ayu-1",
    "studentId": "student-ayu",
    "instructorId": "instructor-budi",
    "courseScheduleId": "schedule-package-ayu-2026-05",
    "lessonDate": "2026-05-04",
    "instrumentId": "inst-piano",
    "level": "Beginner",
    "materialCovered": "Finger number dan posisi duduk.",
    "techniqueFocus": "Koordinasi tangan kanan.",
    "homework": "Latihan C-D-E-F-G perlahan.",
    "progressRating": "Good",
    "parentVisible": true
  },
  {
    "id": "journal-nara-1",
    "studentId": "student-nara",
    "instructorId": "instructor-maya",
    "courseScheduleId": "schedule-package-nara-2026-05",
    "lessonDate": "2026-05-20",
    "instrumentId": "inst-vocal",
    "level": "Intermediate",
    "materialCovered": "Breathing, humming, dan phrasing verse.",
    "techniqueFocus": "Kontrol napas dan artikulasi.",
    "homework": "Latihan humming 5 menit sebelum bernyanyi.",
    "progressRating": "Improving",
    "parentVisible": true
  }
]
```

## 11. Billing

Resource: `invoices`

```json
[
  {
    "id": "invoice-luna-2026-05",
    "studentId": "student-luna",
    "instrumentId": "inst-violin",
    "billingPeriod": "2026-05",
    "lessonPackage": "4 sesi sejak start date",
    "amount": 900000,
    "dueDate": "2026-05-20",
    "status": "Unpaid"
  },
  {
    "id": "invoice-ayu-2026-05",
    "studentId": "student-ayu",
    "instrumentId": "inst-piano",
    "billingPeriod": "2026-05",
    "lessonPackage": "4 sesi sejak start date",
    "amount": 850000,
    "dueDate": "2026-05-20",
    "status": "Unpaid"
  },
  {
    "id": "invoice-nara-2026-05",
    "studentId": "student-nara",
    "instrumentId": "inst-vocal",
    "billingPeriod": "2026-05",
    "lessonPackage": "4 sesi sejak start date",
    "amount": 800000,
    "dueDate": "2026-05-20",
    "status": "Unpaid"
  }
]
```

## 12. Users

Resource: `users`

Nama user otomatis diambil dari Student, Guardian, atau Instructor.

```json
[
  {
    "email": "luna.student@akres.test",
    "password": "admin123",
    "role": "Student Portal User",
    "studentId": "student-luna",
    "guardianId": "",
    "instructorId": ""
  },
  {
    "email": "dewi.parent@akres.test",
    "password": "admin123",
    "role": "Parent Portal User",
    "studentId": "",
    "guardianId": "guardian-dewi",
    "instructorId": ""
  },
  {
    "email": "sari.teacher@akres.test",
    "password": "admin123",
    "role": "Music Instructor",
    "studentId": "",
    "guardianId": "",
    "instructorId": "instructor-sari"
  }
]
```
