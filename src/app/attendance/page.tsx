import { AppShell } from "@/components/app-shell";
import { ResourcePage } from "@/components/resource-page";
import {
  instructorAttendanceStatusOptions,
  studentAttendanceStatusOptions,
} from "@/lib/options";

export default function AttendancePage() {
  return (
    <AppShell>
      <div className="space-y-4">
        <ResourcePage
          description="Absensi murid per jadwal, termasuk status detail, alasan absen, dan makeup lesson."
          fields={[
            {
              key: "studentId",
              label: "Student",
              type: "relation",
              relation: { resource: "students", labelFields: ["firstName", "lastName"] },
              required: true,
            },
            {
              key: "courseScheduleId",
              label: "Schedule",
              type: "relation",
              relation: { resource: "schedules", labelFields: ["scheduleDate", "fromTime"] },
              required: true,
            },
            {
              key: "instrumentId",
              label: "Instrument",
              type: "relation",
              relation: { resource: "instruments", labelFields: ["instrumentName"] },
              required: true,
            },
            { key: "date", label: "Date", type: "date", required: true },
            {
              key: "status",
              label: "Status",
              type: "select",
              options: studentAttendanceStatusOptions,
              required: true,
            },
            { key: "absenceReason", label: "Absence reason" },
            { key: "makeupRequired", label: "Makeup required", type: "checkbox" },
          ]}
          allowCreate={false}
          resource="student-attendance"
          title="Student Attendance"
        />
        <ResourcePage
          description="Absensi guru per jadwal, termasuk substitute instructor bila status Substitute."
          fields={[
            {
              key: "instructorId",
              label: "Instructor",
              type: "relation",
              relation: { resource: "instructors", labelFields: ["instructorName"] },
              required: true,
            },
            {
              key: "courseScheduleId",
              label: "Schedule",
              type: "relation",
              relation: { resource: "schedules", labelFields: ["scheduleDate", "fromTime"] },
              required: true,
            },
            { key: "attendanceDate", label: "Date", type: "date", required: true },
            {
              key: "instrumentId",
              label: "Instrument",
              type: "relation",
              relation: { resource: "instruments", labelFields: ["instrumentName"] },
              required: true,
            },
            {
              key: "status",
              label: "Status",
              type: "select",
              options: instructorAttendanceStatusOptions,
              required: true,
            },
            {
              key: "substituteInstructorId",
              label: "Substitute Instructor",
              type: "relation",
              relation: { resource: "instructors", labelFields: ["instructorName"] },
            },
            { key: "notes", label: "Notes", type: "textarea" },
          ]}
          allowCreate={false}
          resource="instructor-attendance"
          title="Instructor Attendance"
        />
      </div>
    </AppShell>
  );
}
