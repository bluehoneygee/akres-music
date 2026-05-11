import { AppShell } from "@/components/app-shell";
import { ResourcePage } from "@/components/resource-page";
import { levelOptions, progressRatingOptions } from "@/lib/options";

export default function JournalsPage() {
  return (
    <AppShell>
      <ResourcePage
        description="Jurnal perkembangan per sesi, termasuk materi, teknik, homework, rating, dan parent visibility."
        fields={[
          {
            key: "studentId",
            label: "Student",
            type: "relation",
            relation: { resource: "students", labelFields: ["firstName", "lastName"] },
            required: true,
          },
          {
            key: "instructorId",
            label: "Instructor",
            type: "relation",
            relation: { resource: "instructors", labelFields: ["instructorName"] },
            required: true,
          },
          {
            key: "courseScheduleId",
            label: "Schedule",
            type: "relation",
            relation: { resource: "schedules", labelFields: ["scheduleDate", "fromTime"] },
            required: true,
          },
          { key: "lessonDate", label: "Lesson date", type: "date", required: true },
          {
            key: "instrumentId",
            label: "Instrument",
            type: "relation",
            relation: { resource: "instruments", labelFields: ["instrumentName"] },
            required: true,
          },
          { key: "level", label: "Level", type: "select", options: levelOptions },
          { key: "materialCovered", label: "Material covered", type: "textarea" },
          { key: "techniqueFocus", label: "Technique focus" },
          { key: "homework", label: "Homework", type: "textarea" },
          {
            key: "progressRating",
            label: "Progress rating",
            type: "select",
            options: progressRatingOptions,
          },
          { key: "parentVisible", label: "Parent visible", type: "checkbox" },
        ]}
        resource="journals"
        title="Lesson Journals"
      />
    </AppShell>
  );
}
