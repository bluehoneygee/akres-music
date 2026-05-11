import { AppShell } from "@/components/app-shell";
import { ResourcePage } from "@/components/resource-page";

export default function AttendancePage() {
  return (
    <AppShell>
      <div className="space-y-4">
        <ResourcePage
          description="Absensi murid per jadwal, termasuk status detail, alasan absen, dan makeup lesson."
          fields={[
            { key: "studentId", label: "Student ID", required: true },
            { key: "courseScheduleId", label: "Schedule ID", required: true },
            { key: "instrumentId", label: "Instrument ID", required: true },
            { key: "date", label: "Date", type: "date", required: true },
            { key: "status", label: "Status", required: true },
            { key: "absenceReason", label: "Absence reason" },
            { key: "makeupRequired", label: "Makeup required", type: "checkbox" },
          ]}
          resource="student-attendance"
          title="Student Attendance"
        />
        <ResourcePage
          description="Absensi guru per jadwal, termasuk substitute instructor bila status Substitute."
          fields={[
            { key: "instructorId", label: "Instructor ID", required: true },
            { key: "courseScheduleId", label: "Schedule ID", required: true },
            { key: "attendanceDate", label: "Date", type: "date", required: true },
            { key: "instrumentId", label: "Instrument ID", required: true },
            { key: "status", label: "Status", required: true },
            { key: "substituteInstructorId", label: "Substitute instructor ID" },
            { key: "notes", label: "Notes", type: "textarea" },
          ]}
          resource="instructor-attendance"
          title="Instructor Attendance"
        />
      </div>
    </AppShell>
  );
}
