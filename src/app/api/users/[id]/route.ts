import bcrypt from "bcryptjs";
import { Filter, ObjectId, type Document } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

import { getMongoDb } from "@/lib/mongodb";

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
  const payload = (await request.json()) as Record<string, string>;
  const db = await getMongoDb();
  const update: Record<string, unknown> = {
    name: payload.name ?? "",
    role: payload.role ?? "Academic Staff",
    studentId: payload.studentId ?? "",
    guardianId: payload.guardianId ?? "",
    instructorId: payload.instructorId ?? "",
    updatedAt: new Date().toISOString(),
  };

  if (payload.email) {
    update.email = payload.email.trim().toLowerCase();
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
  const db = await getMongoDb();
  const result = await db.collection("users").deleteOne(userQuery(id));

  if (!result.deletedCount) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ data: { id } });
}
