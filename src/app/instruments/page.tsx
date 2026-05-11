import { AppShell } from "@/components/app-shell";
import { ResourcePage } from "@/components/resource-page";
import { instrumentCategoryOptions } from "@/lib/options";

export default function InstrumentsPage() {
  return (
    <AppShell>
      <ResourcePage
        description="Master data instrumen yang dipakai di student, instructor, course, schedule, dan journal."
        fields={[
          { key: "instrumentName", label: "Instrument name", required: true },
          {
            key: "instrumentCategory",
            label: "Category",
            type: "select",
            options: instrumentCategoryOptions,
            required: true,
          },
          { key: "isActive", label: "Active", type: "checkbox" },
        ]}
        resource="instruments"
        title="Instrument Master"
      />
    </AppShell>
  );
}
