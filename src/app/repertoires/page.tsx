import { AppShell } from "@/components/app-shell";
import { ResourcePage } from "@/components/resource-page";
import { levelOptions } from "@/lib/options";

export default function RepertoiresPage() {
  return (
    <AppShell>
      <ResourcePage
        description="Master lagu/repertoire yang dapat dipilih di Lesson Journal."
        fields={[
          { key: "title", label: "Title", required: true },
          { key: "composerArtist", label: "Composer/artist" },
          { key: "instrumentId", label: "Instrument ID", required: true },
          { key: "level", label: "Level", type: "select", options: levelOptions, required: true },
          { key: "genre", label: "Genre" },
          { key: "notes", label: "Notes", type: "textarea" },
          { key: "isActive", label: "Active", type: "checkbox" },
        ]}
        resource="repertoires"
        title="Repertoire"
      />
    </AppShell>
  );
}
