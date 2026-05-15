import { AppShell } from "@/components/app-shell";
import { ResourcePage } from "@/components/resource-page";
import { lessonModeOptions, levelOptions } from "@/lib/options";

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
        ]}
        resource="students"
        title="Students"
      />
    </AppShell>
  );
}
