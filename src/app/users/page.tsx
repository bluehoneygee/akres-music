import { AppShell } from "@/components/app-shell";
import { ResourcePage } from "@/components/resource-page";
import { roleOptions } from "@/lib/roles";

export default function UsersPage() {
  return (
    <AppShell>
      <ResourcePage
        description="Kelola akun login seperti ERPNext: staff, guru, murid, dan orang tua."
        fields={[
          { key: "email", label: "Email", required: true },
          { key: "password", label: "Password", writeOnly: true },
          { key: "role", label: "Role", type: "select", options: roleOptions, required: true },
          {
            key: "studentId",
            label: "Student",
            type: "relation",
            relation: { resource: "students", labelFields: ["firstName", "lastName"] },
            visibleWhen: { field: "role", value: "Student Portal User" },
          },
          {
            key: "guardianId",
            label: "Guardian",
            type: "relation",
            relation: { resource: "guardians", labelFields: ["guardianName"] },
            visibleWhen: { field: "role", value: "Parent Portal User" },
          },
          {
            key: "instructorId",
            label: "Instructor",
            type: "relation",
            relation: { resource: "instructors", labelFields: ["instructorName"] },
            visibleWhen: { field: "role", value: "Music Instructor" },
          },
        ]}
        resource="users"
        title="Users"
      />
    </AppShell>
  );
}
