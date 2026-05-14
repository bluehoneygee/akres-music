import { AppShell } from "@/components/app-shell";
import { ResourcePage } from "@/components/resource-page";
import { lessonDayOptions, lessonModeOptions, scheduleStatusOptions } from "@/lib/options";

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
            relationFilter: {
              sourceField: "courseId",
              sourceOptionField: "instrumentId",
              optionField: "primaryInstrumentId",
            },
            required: true,
          },
          {
            key: "instructorId",
            label: "Instructor",
            type: "relation",
            relation: { resource: "instructors", labelFields: ["instructorName"] },
            relationFilter: {
              sourceField: "courseId",
              sourceOptionField: "instrumentId",
              optionField: "instrumentIds",
              mode: "includes",
            },
            required: true,
          },
          {
            key: "instrumentId",
            label: "Instrument",
            type: "relation",
            relation: { resource: "instruments", labelFields: ["instrumentName"] },
            relationFilter: {
              sourceField: "courseId",
              sourceOptionField: "instrumentId",
              optionField: "id",
            },
            autoSelectSingleOption: true,
            required: true,
          },
          { key: "scheduleMonth", label: "Schedule month", type: "month" },
          {
            key: "lessonDays",
            label: "Lesson days",
            type: "select",
            options: lessonDayOptions,
            multiple: true,
          },
          { key: "lessonCount", label: "Lesson count", type: "number" },
          {
            key: "scheduleDate",
            label: "Single/reschedule date",
            type: "date",
            hideOnCreate: true,
          },
          { key: "fromTime", label: "From", type: "time", required: true },
          { key: "toTime", label: "To", type: "time", required: true },
          {
            key: "lessonMode",
            label: "Lesson mode",
            type: "select",
            options: lessonModeOptions,
            deriveFrom: { sourceField: "studentId", sourceOptionField: "preferredLessonMode" },
            hidden: true,
          },
          {
            key: "studioRoomId",
            label: "Studio Room",
            type: "relation",
            relation: { resource: "rooms", labelFields: ["roomName"] },
            visibleWhen: { field: "lessonMode", value: "Studio" },
            relationFilter: {
              sourceField: "instrumentId",
              optionField: "instrumentIds",
              mode: "includes",
            },
          },
          {
            key: "homeVisitAddress",
            label: "Home visit address",
            visibleWhen: { field: "lessonMode", value: "Home Visit" },
          },
          {
            key: "travelNotes",
            label: "Travel notes",
            type: "textarea",
            visibleWhen: { field: "lessonMode", value: "Home Visit" },
          },
          {
            key: "scheduleStatus",
            label: "Status",
            type: "select",
            options: scheduleStatusOptions,
            hideOnCreate: true,
          },
          {
            key: "originalScheduleId",
            label: "Original schedule",
            type: "relation",
            relation: { resource: "schedules", labelFields: ["scheduleDate", "fromTime"] },
            hideOnCreate: true,
          },
          {
            key: "rescheduleReason",
            label: "Reschedule reason",
            type: "textarea",
            hideOnCreate: true,
          },
        ]}
        allowCreate={false}
        resource="schedules"
        title="Course Schedules"
      />
    </AppShell>
  );
}
