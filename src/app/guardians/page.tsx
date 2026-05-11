import { AppShell } from "@/components/app-shell";
import { ResourcePage } from "@/components/resource-page";

export default function GuardiansPage() {
  return (
    <AppShell>
      <ResourcePage
        description="Data orang tua atau wali yang bisa dihubungkan ke student dan akun Parent Portal."
        fields={[
          { key: "guardianName", label: "Guardian name", required: true },
          { key: "mobileNumber", label: "Mobile number" },
        ]}
        resource="guardians"
        title="Guardians"
      />
    </AppShell>
  );
}
