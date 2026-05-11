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

## Payload Sequence

### 1. Instrument

Resource: `instruments`

```json
{
  "id": "inst-violin",
  "instrumentName": "Violin",
  "instrumentCategory": "Strings",
  "isActive": true
}
```

### 2. Instructor

Resource: `instructors`

`instrumentIds` memakai ID dari Instrument.

```json
{
  "id": "instructor-sari",
  "instructorName": "Sari Wijaya",
  "instrumentIds": ["inst-violin"],
  "levelFrom": "Beginner",
  "levelTo": "Advanced",
  "portalEnabled": true
}
```

### 3. Student

Resource: `students`

```json
{
  "id": "student-luna",
  "firstName": "Luna",
  "lastName": "Hartono",
  "primaryInstrumentId": "inst-violin",
  "skillLevel": "Beginner",
  "learningGoal": "Performance",
  "preferredLessonMode": "Studio",
  "portalEnabled": true,
  "musicNotes": "Mulai dari postur bowing dasar."
}
```

### 4. Course

Resource: `courses`

```json
{
  "id": "course-violin-beginner",
  "courseName": "Violin Beginner Private",
  "instrumentId": "inst-violin",
  "courseLevel": "Beginner",
  "lessonType": "Private",
  "durationMinutes": 60,
  "defaultFee": 900000
}
```

### 5. Studio Room

Resource: `rooms`

```json
{
  "id": "room-strings-1",
  "roomName": "Strings Room 1",
  "capacity": 2,
  "instrumentIds": "inst-violin",
  "isActive": true
}
```

### 6. Schedule Studio

Resource: `schedules`

```json
{
  "id": "schedule-luna-studio-1",
  "courseId": "course-violin-beginner",
  "studentId": "student-luna",
  "instructorId": "instructor-sari",
  "instrumentId": "inst-violin",
  "scheduleDate": "2026-05-18",
  "fromTime": "15:00",
  "toTime": "16:00",
  "lessonMode": "Studio",
  "studioRoomId": "room-strings-1",
  "homeVisitAddress": "",
  "scheduleStatus": "Scheduled"
}
```

### 7. Schedule Home Visit

Resource: `schedules`

```json
{
  "id": "schedule-luna-home-1",
  "courseId": "course-violin-beginner",
  "studentId": "student-luna",
  "instructorId": "instructor-sari",
  "instrumentId": "inst-violin",
  "scheduleDate": "2026-05-25",
  "fromTime": "15:00",
  "toTime": "16:00",
  "lessonMode": "Home Visit",
  "studioRoomId": "",
  "homeVisitAddress": "Jl. Melodi No. 22, Jakarta Selatan",
  "scheduleStatus": "Scheduled"
}
```

### 8. Student Attendance

Resource: `student-attendance`

```json
{
  "id": "attendance-luna-1",
  "studentId": "student-luna",
  "courseScheduleId": "schedule-luna-studio-1",
  "instrumentId": "inst-violin",
  "date": "2026-05-18",
  "status": "Present",
  "absenceReason": "",
  "makeupRequired": false
}
```

### 9. Instructor Attendance

Resource: `instructor-attendance`

```json
{
  "id": "instructor-attendance-sari-1",
  "instructorId": "instructor-sari",
  "courseScheduleId": "schedule-luna-studio-1",
  "attendanceDate": "2026-05-18",
  "instrumentId": "inst-violin",
  "status": "Present",
  "substituteInstructorId": "",
  "notes": "Kelas berjalan sesuai jadwal."
}
```

### 10. Repertoire

Resource: `repertoires`

```json
{
  "id": "rep-twinkle-violin",
  "title": "Twinkle Twinkle Little Star",
  "composerArtist": "Traditional",
  "instrumentId": "inst-violin",
  "level": "Beginner",
  "genre": "Traditional",
  "notes": "Latihan intonasi dan bowing dasar.",
  "isActive": true
}
```

### 11. Lesson Journal

Resource: `journals`

```json
{
  "id": "journal-luna-1",
  "studentId": "student-luna",
  "instructorId": "instructor-sari",
  "courseScheduleId": "schedule-luna-studio-1",
  "lessonDate": "2026-05-18",
  "instrumentId": "inst-violin",
  "level": "Beginner",
  "materialCovered": "Postur biola, posisi bow, dan open string.",
  "techniqueFocus": "Bowing lurus pada open string A dan D.",
  "homework": "Latihan open string 10 menit per hari.",
  "progressRating": "Improving",
  "parentVisible": true
}
```

### 12. Billing

Resource: `invoices`

```json
{
  "id": "invoice-luna-2026-05",
  "studentId": "student-luna",
  "instrumentId": "inst-violin",
  "billingPeriod": "2026-05",
  "lessonPackage": "4x per bulan",
  "amount": 900000,
  "dueDate": "2026-05-20",
  "status": "Unpaid"
}
```

### 13. User Murid

Resource: `users`

```json
{
  "name": "Luna Hartono",
  "email": "luna.student@akres.test",
  "password": "admin123",
  "role": "Student Portal User",
  "studentId": "student-luna",
  "guardianId": "",
  "instructorId": ""
}
```

### 14. User Instructor

Resource: `users`

```json
{
  "name": "Sari Wijaya",
  "email": "sari.teacher@akres.test",
  "password": "admin123",
  "role": "Music Instructor",
  "studentId": "",
  "guardianId": "",
  "instructorId": "instructor-sari"
}
```
