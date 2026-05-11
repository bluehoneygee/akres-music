import { AppShell } from "@/components/app-shell";
import { ResourcePage } from "@/components/resource-page";
import { lessonModeOptions, scheduleStatusOptions } from "@/lib/options";

export default function SchedulesPage() {
  return (
    <AppShell>
      <ResourcePage
        description="Jadwal les privat studio atau home visit dengan status schedule dan relasi ke course, student, instructor."
        fields={[
          {
            key: "courseId",
            label: "Course",
            type: "relation",
            relation: { resource: "courses", labelFields: ["courseName"] },
            required: true,
          },
          {
            key: "studentId",
            label: "Student",
            type: "relation",
            relation: { resource: "students", labelFields: ["firstName", "lastName"] },
            required: true,
          },
          {
            key: "instructorId",
            label: "Instructor",
            type: "relation",
            relation: { resource: "instructors", labelFields: ["instructorName"] },
            required: true,
          },
          {
            key: "instrumentId",
            label: "Instrument",
            type: "relation",
            relation: { resource: "instruments", labelFields: ["instrumentName"] },
            required: true,
          },
          { key: "scheduleDate", label: "Date", type: "date", required: true },
          { key: "fromTime", label: "From", type: "time", required: true },
          { key: "toTime", label: "To", type: "time", required: true },
          { key: "lessonMode", label: "Lesson mode", type: "select", options: lessonModeOptions },
          {
            key: "studioRoomId",
            label: "Studio Room",
            type: "relation",
            relation: { resource: "rooms", labelFields: ["roomName"] },
          },
          { key: "homeVisitAddress", label: "Home visit address" },
          { key: "scheduleStatus", label: "Status", type: "select", options: scheduleStatusOptions },
        ]}
        resource="schedules"
        title="Course Schedules"
      />
    </AppShell>
  );
}
