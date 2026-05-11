import type { ResourceName } from "@/lib/models";

export const appRoles = [
  "System Manager",
  "Academic Staff",
  "Music Instructor",
  "Student Portal User",
  "Parent Portal User",
] as const;

export type AppRole = (typeof appRoles)[number];

export const roleOptions = appRoles.map((role) => ({ label: role, value: role }));

type Action = "read" | "create" | "update" | "delete";
type SecuredResource = ResourceName | "users";

const allResources: SecuredResource[] = [
  "users",
  "instruments",
  "students",
  "guardians",
  "instructors",
  "courses",
  "rooms",
  "schedules",
  "student-attendance",
  "instructor-attendance",
  "journals",
  "repertoires",
  "invoices",
  "notifications",
];

const academicResources: SecuredResource[] = [
  "instruments",
  "students",
  "guardians",
  "instructors",
  "courses",
  "rooms",
  "schedules",
  "student-attendance",
  "instructor-attendance",
  "journals",
  "repertoires",
  "invoices",
  "notifications",
];

const instructorReadResources: SecuredResource[] = [
  "students",
  "schedules",
  "student-attendance",
  "instructor-attendance",
  "journals",
  "repertoires",
];

const portalReadResources: SecuredResource[] = [
  "students",
  "schedules",
  "student-attendance",
  "journals",
  "invoices",
];

export function canAccessResource({
  role,
  resource,
  action,
}: {
  role?: string;
  resource: SecuredResource;
  action: Action;
}) {
  if (role === "System Manager") return true;

  if (role === "Academic Staff") {
    if (resource === "users") return false;
    if (resource === "invoices") return action === "read";
    return academicResources.includes(resource);
  }

  if (role === "Music Instructor") {
    if (!instructorReadResources.includes(resource)) return false;
    return action === "read" || resource === "student-attendance" || resource === "instructor-attendance" || resource === "journals";
  }

  if (role === "Student Portal User" || role === "Parent Portal User") {
    return portalReadResources.includes(resource) && action === "read";
  }

  return false;
}
