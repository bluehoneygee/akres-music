import bcrypt from "bcryptjs";
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

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAccessResource({ role: sessionRole(session), resource: "users", action: "read" })) {
    return NextResponse.json({ error: "Only System Manager can manage users" }, { status: 403 });
  }

  const db = await getMongoDb();
  const users = await db.collection("users").find({}).sort({ email: 1 }).toArray();
  return NextResponse.json({ data: users.map(serializeUser) });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAccessResource({ role: sessionRole(session), resource: "users", action: "create" })) {
    return NextResponse.json({ error: "Only System Manager can create users" }, { status: 403 });
  }

  const payload = (await request.json()) as {
    email?: string;
    password?: string;
    role?: string;
    studentId?: string;
    guardianId?: string;
    instructorId?: string;
  };
  const email = payload.email?.trim().toLowerCase();

  if (!email || !payload.password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const linkError = validateUserLink(payload);

  if (linkError) {
    return NextResponse.json({ error: linkError }, { status: 400 });
  }

  const db = await getMongoDb();
  const existing = await db.collection("users").findOne({ email });

  if (existing) {
    return NextResponse.json({ error: "Email already exists" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(payload.password, 12);
  const links = normalizeUserLinks(payload);
  const name = await resolveUserDisplayName(db, { ...links, email });
  const result = await db.collection("users").insertOne({
    name,
    email,
    emailVerified: null,
    passwordHash,
    ...links,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const user = await db.collection("users").findOne({ _id: result.insertedId });
  return NextResponse.json({ data: serializeUser(user!) }, { status: 201 });
}
