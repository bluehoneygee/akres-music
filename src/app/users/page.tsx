import { AppShell } from "@/components/app-shell";
import { ResourcePage } from "@/components/resource-page";
import { roleOptions } from "@/lib/roles";

export default function UsersPage() {
  return (
    <AppShell>
      <ResourcePage
        description="Kelola akun login seperti ERPNext: staff, guru, murid, dan orang tua."
        fields={[
          { key: "name", label: "Name", required: true },
          { key: "email", label: "Email", required: true },
          { key: "password", label: "Password", writeOnly: true },
          { key: "role", label: "Role", type: "select", options: roleOptions, required: true },
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
