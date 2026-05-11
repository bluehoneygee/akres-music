import { AppShell } from "@/components/app-shell";
import { ResourcePage } from "@/components/resource-page";

export default function GuardiansPage() {
  return (
    <AppShell>
      <ResourcePage
        description="Data orang tua atau wali yang bisa dihubungkan ke student dan akun Parent Portal."
        fields={[
          { key: "guardianName", label: "Guardian name", required: true },
          { key: "emailAddress", label: "Email address", required: true },
          { key: "mobileNumber", label: "Mobile number" },
          { key: "user", label: "Portal user email" },
        ]}
        resource="guardians"
        title="Guardians"
      />
    </AppShell>
  );
}
