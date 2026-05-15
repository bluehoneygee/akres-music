import { AppShell } from "@/components/app-shell";
import { ResourcePage } from "@/components/resource-page";
import {
  lessonDayOptions,
  lessonModeOptions,
  lessonPackageStatusOptions,
} from "@/lib/options";

export default function LessonPackagesPage() {
  return (
    <AppShell>
      <ResourcePage
        description="Paket les privat 4 sesi. Buat paket baru saat murid mulai atau memperpanjang les, lalu sistem otomatis membuat schedules dan attendance."
        fields={[
          {
            key: "courseId",
            label: "Course",
            type: "relation",
            relation: { resource: "courses", labelFields: ["courseName"] },
            required: true,
          },
          {
            key: "instrumentId",
            label: "Instrument",
            type: "relation",
            relation: { resource: "instruments", labelFields: ["instrumentName"] },
            deriveFrom: { sourceField: "courseId", sourceOptionField: "instrumentId" },
            hidden: true,
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
          { key: "billingPeriod", label: "Billing period", type: "month", required: true },
          { key: "lessonStartDate", label: "Lesson start date", type: "date", required: true },
          {
            key: "lessonDays",
            label: "Lesson days",
            type: "select",
            options: lessonDayOptions,
            multiple: true,
          },
          { key: "lessonCount", label: "Lesson count", type: "number" },
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
            key: "status",
            label: "Status",
            type: "select",
            options: lessonPackageStatusOptions,
          },
        ]}
        resource="lesson-packages"
        title="Lesson Packages"
      />
    </AppShell>
  );
}
