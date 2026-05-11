import { AppShell } from "@/components/app-shell";
import { ResourcePage } from "@/components/resource-page";

export default function StudioRoomsPage() {
  return (
    <AppShell>
      <ResourcePage
        description="Master ruang studio Akres untuk lesson mode Studio."
        fields={[
          { key: "roomName", label: "Room name", required: true },
          { key: "capacity", label: "Capacity", type: "number" },
          {
            key: "instrumentIds",
            label: "Instruments",
            type: "relation",
            relation: { resource: "instruments", labelFields: ["instrumentName"] },
            multiple: true,
          },
          { key: "isActive", label: "Active", type: "checkbox" },
        ]}
        resource="rooms"
        title="Studio Rooms"
      />
    </AppShell>
  );
}
