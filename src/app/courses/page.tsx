import { AppShell } from "@/components/app-shell";
import { ResourcePage } from "@/components/resource-page";
import { levelOptions } from "@/lib/options";

export default function CoursesPage() {
  return (
    <AppShell>
      <ResourcePage
        description="Program les musik privat berdasarkan instrumen, level, durasi, dan fee default."
        fields={[
          { key: "courseName", label: "Course name", required: true },
          {
            key: "instrumentId",
            label: "Instrument",
            type: "relation",
            relation: { resource: "instruments", labelFields: ["instrumentName"] },
            required: true,
          },
          { key: "courseLevel", label: "Course level", type: "select", options: levelOptions, required: true },
          { key: "durationMinutes", label: "Duration minutes", type: "number", required: true },
          { key: "defaultFee", label: "Default fee", type: "number" },
        ]}
        resource="courses"
        title="Courses"
      />
    </AppShell>
  );
}
