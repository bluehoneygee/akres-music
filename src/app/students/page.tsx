import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { ResourcePage } from "@/components/resource-page";
import { learningGoalOptions, levelOptions } from "@/lib/options";
import { sessionRole } from "@/lib/session";

export default async function StudentsPage() {
  const session = await auth();
  const role = session ? sessionRole(session) : "";
  const isMusicInstructor = role === "Music Instructor";

  return (
    <AppShell>
      <ResourcePage
        description="Profil musik murid: level, learning goal, guardian, dan akses portal."
        fields={[
          { key: "firstName", label: "First name", required: true },
          { key: "lastName", label: "Last name", required: true },
          { key: "skillLevel", label: "Skill level", type: "select", options: levelOptions, required: true },
          {
            key: "learningGoal",
            label: "Learning goal",
            type: "select",
            options: learningGoalOptions,
            required: true,
          },
          ...(isMusicInstructor
            ? []
            : [
                {
                  key: "guardianIds",
                  label: "Guardians",
                  type: "relation" as const,
                  relation: {
                    resource: "guardians" as const,
                    labelFields: ["guardianName", "name", "firstName", "lastName"],
                  },
                  multiple: true,
                  quickCreate: {
                    title: "Guardian",
                    resource: "guardians" as const,
                    fields: [
                      { key: "guardianName", label: "Guardian name", required: true },
                      { key: "mobileNumber", label: "Mobile number" },
                    ],
                  },
                },
              ]),
          { key: "portalEnabled", label: "Portal enabled", type: "checkbox" },
          { key: "musicNotes", label: "Music notes", type: "textarea" },
        ]}
        resource="students"
        title="Students"
      />
    </AppShell>
  );
}
