import bcrypt from "bcryptjs";
import { Filter, ObjectId, type Document } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { getMongoDb } from "@/lib/mongodb";
import { canAccessResource } from "@/lib/roles";
import { sessionRole } from "@/lib/session";
import {
  normalizeUserLinks,
  resolveUserDisplayName,
  validateUserLink,
} from "@/lib/user-profile";

function userQuery(id: string) {
  return (ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id }) as Filter<Document>;
}

function serializeUser(user: {
  _id: unknown;
  name?: string;
  email?: string;
  role?: string;
  studentId?: string;
  guardianId?: string;
  instructorId?: string;
}) {
  return {
    id: String(user._id),
    name: user.name ?? "",
    email: user.email ?? "",
    role: user.role ?? "Academic Staff",
    studentId: user.studentId ?? "",
    guardianId: user.guardianId ?? "",
    instructorId: user.instructorId ?? "",
  };
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAccessResource({ role: sessionRole(session), resource: "users", action: "update" })) {
    return NextResponse.json({ error: "Only System Manager can update users" }, { status: 403 });
  }

  const payload = (await request.json()) as Record<string, string>;
  const db = await getMongoDb();
  const linkError = validateUserLink(payload);

  if (linkError) {
    return NextResponse.json({ error: linkError }, { status: 400 });
  }

  const links = normalizeUserLinks(payload);
  const email = payload.email?.trim().toLowerCase();
  const update: Record<string, unknown> = {
    name: await resolveUserDisplayName(db, { ...links, email }),
    ...links,
    updatedAt: new Date().toISOString(),
  };

  if (email) {
    update.email = email;
  }

  if (payload.password) {
    update.passwordHash = await bcrypt.hash(payload.password, 12);
  }

  const user = await db
    .collection("users")
    .findOneAndUpdate(userQuery(id), { $set: update }, { returnDocument: "after" });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ data: serializeUser(user) });
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAccessResource({ role: sessionRole(session), resource: "users", action: "delete" })) {
    return NextResponse.json({ error: "Only System Manager can delete users" }, { status: 403 });
  }

  const db = await getMongoDb();
  const result = await db.collection("users").deleteOne(userQuery(id));

  if (!result.deletedCount) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ data: { id } });
}
