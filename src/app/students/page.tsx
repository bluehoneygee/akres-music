import { AppShell } from "@/components/app-shell";
import { ResourcePage } from "@/components/resource-page";
import { lessonDayOptions, lessonModeOptions, levelOptions } from "@/lib/options";

export default function StudentsPage() {
  return (
    <AppShell>
      <ResourcePage
        description="Profil musik murid: instrumen utama, level, learning goal, guardian, dan akses portal."
        fields={[
          { key: "firstName", label: "First name", required: true },
          { key: "lastName", label: "Last name", required: true },
          {
            key: "primaryInstrumentId",
            label: "Primary Instrument",
            type: "relation",
            relation: { resource: "instruments", labelFields: ["instrumentName"] },
            deriveFrom: { sourceField: "onboardingCourseId", sourceOptionField: "instrumentId" },
            hidden: true,
            required: true,
          },
          { key: "skillLevel", label: "Skill level", type: "select", options: levelOptions, required: true },
          { key: "learningGoal", label: "Learning goal" },
          {
            key: "preferredLessonMode",
            label: "Preferred mode",
            type: "select",
            options: lessonModeOptions,
          },
          {
            key: "guardianIds",
            label: "Guardians",
            type: "relation",
            relation: { resource: "guardians", labelFields: ["guardianName"] },
            multiple: true,
            quickCreate: {
              title: "Guardian",
              resource: "guardians",
              fields: [
                { key: "guardianName", label: "Guardian name", required: true },
                { key: "mobileNumber", label: "Mobile number" },
              ],
            },
          },
          { key: "portalEnabled", label: "Portal enabled", type: "checkbox" },
          { key: "musicNotes", label: "Music notes", type: "textarea" },
          {
            key: "onboardingCourseId",
            label: "Course",
            type: "relation",
            relation: { resource: "courses", labelFields: ["courseName"] },
          },
          {
            key: "onboardingInstructorId",
            label: "Instructor",
            type: "relation",
            relation: { resource: "instructors", labelFields: ["instructorName"] },
            relationFilter: {
              sourceField: "onboardingCourseId",
              sourceOptionField: "instrumentId",
              optionField: "instrumentIds",
              mode: "includes",
            },
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
          { key: "fromTime", label: "From", type: "time" },
          { key: "toTime", label: "To", type: "time" },
          {
            key: "studioRoomId",
            label: "Studio Room",
            type: "relation",
            relation: { resource: "rooms", labelFields: ["roomName"] },
            visibleWhen: { field: "preferredLessonMode", value: "Studio" },
            relationFilter: {
              sourceField: "primaryInstrumentId",
              optionField: "instrumentIds",
              mode: "includes",
            },
          },
          {
            key: "homeVisitAddress",
            label: "Home visit address",
            visibleWhen: { field: "preferredLessonMode", value: "Home Visit" },
          },
          {
            key: "travelNotes",
            label: "Travel notes",
            type: "textarea",
            visibleWhen: { field: "preferredLessonMode", value: "Home Visit" },
          },
        ]}
        resource="students"
        title="Students"
      />
    </AppShell>
  );
}
