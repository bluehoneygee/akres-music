import { AppShell } from "@/components/app-shell";
import { ResourcePage } from "@/components/resource-page";
import { levelOptions } from "@/lib/options";

export default function InstructorsPage() {
  return (
    <AppShell>
      <ResourcePage
        description="Data guru, instrumen yang diajarkan, rentang level, dan akses portal instruktur."
        fields={[
          { key: "instructorName", label: "Instructor name", required: true },
          {
            key: "instrumentIds",
            label: "Instruments",
            type: "relation",
            relation: { resource: "instruments", labelFields: ["instrumentName"] },
            multiple: true,
          },
          { key: "levelFrom", label: "Level from", type: "select", options: levelOptions },
          { key: "levelTo", label: "Level to", type: "select", options: levelOptions },
          { key: "portalEnabled", label: "Portal enabled", type: "checkbox" },
        ]}
        resource="instructors"
        title="Instructors"
      />
    </AppShell>
  );
}
