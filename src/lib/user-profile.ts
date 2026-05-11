import type { Db } from "mongodb";

type UserProfileInput = {
  email?: string;
  role?: string;
  studentId?: string;
  guardianId?: string;
  instructorId?: string;
};

export function normalizeUserLinks(input: UserProfileInput) {
  const role = input.role ?? "Academic Staff";

  return {
    role,
    studentId: role === "Student Portal User" ? input.studentId ?? "" : "",
    guardianId: role === "Parent Portal User" ? input.guardianId ?? "" : "",
    instructorId: role === "Music Instructor" ? input.instructorId ?? "" : "",
  };
}

export function validateUserLink(input: UserProfileInput) {
  const links = normalizeUserLinks(input);

  if (links.role === "Student Portal User" && !links.studentId) {
    return "Student Portal User must be linked to a student";
  }

  if (links.role === "Parent Portal User" && !links.guardianId) {
    return "Parent Portal User must be linked to a guardian";
  }

  if (links.role === "Music Instructor" && !links.instructorId) {
    return "Music Instructor must be linked to an instructor";
  }

  return "";
}

export async function resolveUserDisplayName(db: Db, input: UserProfileInput) {
  const links = normalizeUserLinks(input);

  if (links.role === "Student Portal User") {
    const student = await db
      .collection("students")
      .findOne<{ firstName?: string; lastName?: string }>({ id: links.studentId });
    const name = [student?.firstName, student?.lastName].filter(Boolean).join(" ");
    if (name) return name;
  }

  if (links.role === "Parent Portal User") {
    const guardian = await db
      .collection("guardians")
      .findOne<{ guardianName?: string }>({ id: links.guardianId });
    if (guardian?.guardianName) return guardian.guardianName;
  }

  if (links.role === "Music Instructor") {
    const instructor = await db
      .collection("instructors")
      .findOne<{ instructorName?: string }>({ id: links.instructorId });
    if (instructor?.instructorName) return instructor.instructorName;
  }

  return input.email ?? "";
}
