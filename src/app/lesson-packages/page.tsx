import { AppShell } from "@/components/app-shell";
import { ResourcePage } from "@/components/resource-page";
import {
  lessonDayOptions,
  lessonModeOptions,
  lessonPackageSessionOptions,
  lessonPackageStatusOptions,
} from "@/lib/options";

export default function LessonPackagesPage() {
  return (
    <AppShell>
      <ResourcePage
        description="Paket les privat bulanan. Pilih Paket A untuk 4 sesi per bulan atau Paket B untuk 8 sesi per bulan, lalu sistem otomatis membuat schedules dan attendance."
        fields={[
          {
            key: "lessonCount",
            label: "Package",
            type: "select",
            options: lessonPackageSessionOptions,
            required: true,
          },
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
            label: "Available slots",
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
            multiple: true,
            writeOnly: true,
          },
          {
            key: "availableDate",
            label: "Available date",
            type: "select",
            multiple: true,
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
            hidden: true,
          },
          {
            key: "fromTime",
            label: "From",
            type: "time",
            deriveFrom: { sourceField: "availabilitySlotId", sourceOptionField: "fromTime" },
            hidden: true,
            required: true,
          },
          {
            key: "toTime",
            label: "To",
            type: "time",
            deriveFrom: { sourceField: "availabilitySlotId", sourceOptionField: "toTime" },
            hidden: true,
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
            relation: { resource: "rooms", labelFields: ["roomName"], activeOnly: true },
            visibleWhen: { field: "lessonMode", value: "Studio" },
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
