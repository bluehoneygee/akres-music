import { AppShell } from "@/components/app-shell";
import { ResourcePage } from "@/components/resource-page";

export default function SchedulesPage() {
  return (
    <AppShell>
      <ResourcePage
        description="Jadwal les privat studio atau home visit dengan status schedule dan relasi ke course, student, instructor."
        fields={[
          { key: "courseId", label: "Course ID", required: true },
          { key: "studentId", label: "Student ID", required: true },
          { key: "instructorId", label: "Instructor ID", required: true },
          { key: "instrumentId", label: "Instrument ID", required: true },
          { key: "scheduleDate", label: "Date", type: "date", required: true },
          { key: "fromTime", label: "From", type: "time", required: true },
          { key: "toTime", label: "To", type: "time", required: true },
          { key: "lessonMode", label: "Lesson mode" },
          { key: "studioRoomId", label: "Studio room ID" },
          { key: "homeVisitAddress", label: "Home visit address" },
          { key: "scheduleStatus", label: "Status" },
        ]}
        resource="schedules"
        title="Course Schedules"
      />
    </AppShell>
  );
}
