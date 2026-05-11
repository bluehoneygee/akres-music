import { AppShell } from "@/components/app-shell";
import { ResourcePage } from "@/components/resource-page";

export default function CoursesPage() {
  return (
    <AppShell>
      <ResourcePage
        description="Program les musik privat berdasarkan instrumen, level, durasi, dan fee default."
        fields={[
          { key: "courseName", label: "Course name", required: true },
          { key: "instrumentId", label: "Instrument ID", required: true },
          { key: "courseLevel", label: "Course level", required: true },
          { key: "lessonType", label: "Lesson type", required: true },
          { key: "durationMinutes", label: "Duration minutes", type: "number", required: true },
          { key: "defaultFee", label: "Default fee", type: "number" },
        ]}
        resource="courses"
        title="Courses"
      />
    </AppShell>
  );
}
