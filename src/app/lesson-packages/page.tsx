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
            required: true,
          },
          { key: "billingPeriod", label: "Billing period", type: "month", required: true },
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
            key: "availabilitySlotId",
            label: "Available slot",
            type: "relation",
            relation: {
              resource: "instructor-availability",
              labelFields: ["dayOfWeek", "fromTime", "toTime"],
            },
            relationFilter: {
              sourceField: "instructorId",
              optionField: "instructorId",
              mode: "equals",
            },
            writeOnly: true,
          },
          {
            key: "availableDate",
            label: "Available date",
            type: "select",
            availabilityDateFrom: {
              monthField: "billingPeriod",
              slotField: "availabilitySlotId",
            },
            writeOnly: true,
          },
          {
            key: "lessonStartDate",
            label: "Lesson start date",
            type: "date",
            hidden: true,
            required: true,
          },
          {
            key: "lessonDays",
            label: "Lesson days",
            type: "select",
            options: lessonDayOptions,
            multiple: true,
            deriveFrom: { sourceField: "availabilitySlotId", sourceOptionField: "dayOfWeek" },
          },
          { key: "lessonCount", label: "Lesson count", type: "number" },
          {
            key: "fromTime",
            label: "From",
            type: "time",
            deriveFrom: { sourceField: "availabilitySlotId", sourceOptionField: "fromTime" },
            required: true,
          },
          {
            key: "toTime",
            label: "To",
            type: "time",
            deriveFrom: { sourceField: "availabilitySlotId", sourceOptionField: "toTime" },
            required: true,
          },
          {
            key: "lessonMode",
            label: "Lesson mode",
            type: "select",
            options: lessonModeOptions,
            required: true,
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
            roomAvailabilityFrom: {
              startDateField: "lessonStartDate",
              lessonDaysField: "lessonDays",
              lessonCountField: "lessonCount",
              fromTimeField: "fromTime",
              toTimeField: "toTime",
              lessonModeField: "lessonMode",
            },
          },
          {
            key: "homeVisitAddress",
            label: "Home visit address",
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
