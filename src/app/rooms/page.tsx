import { AppShell } from "@/components/app-shell";
import { ResourcePage } from "@/components/resource-page";

export default function RoomsPage() {
  return (
    <AppShell>
      <ResourcePage
        description="Master studio room untuk jadwal studio dan pemakaian ruang."
        fields={[
          { key: "roomName", label: "Room name", required: true },
          { key: "capacity", label: "Capacity", type: "number" },
          { key: "instrumentIds", label: "Instrument IDs" },
          { key: "isActive", label: "Active", type: "checkbox" },
        ]}
        resource="rooms"
        title="Studio Rooms"
      />
    </AppShell>
  );
}
