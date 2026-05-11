import { AppShell } from "@/components/app-shell";
import { ResourcePage } from "@/components/resource-page";

export default function UsersPage() {
  return (
    <AppShell>
      <ResourcePage
        description="Kelola akun login seperti ERPNext: staff, guru, murid, dan orang tua."
        fields={[
          { key: "name", label: "Name", required: true },
          { key: "email", label: "Email", required: true },
          { key: "password", label: "Password" },
          { key: "role", label: "Role", required: true },
          { key: "studentId", label: "Student ID" },
          { key: "guardianId", label: "Guardian ID" },
          { key: "instructorId", label: "Instructor ID" },
        ]}
        resource="users"
        title="Users"
      />
    </AppShell>
  );
}
