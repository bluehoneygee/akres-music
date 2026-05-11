import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

import { getMongoDb } from "@/lib/mongodb";

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
  const db = await getMongoDb();
  const users = await db.collection("users").find({}).sort({ email: 1 }).toArray();
  return NextResponse.json({ data: users.map(serializeUser) });
}

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as {
    name?: string;
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

  const db = await getMongoDb();
  const existing = await db.collection("users").findOne({ email });

  if (existing) {
    return NextResponse.json({ error: "Email already exists" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(payload.password, 12);
  const result = await db.collection("users").insertOne({
    name: payload.name ?? email,
    email,
    emailVerified: null,
    passwordHash,
    role: payload.role ?? "Academic Staff",
    studentId: payload.studentId ?? "",
    guardianId: payload.guardianId ?? "",
    instructorId: payload.instructorId ?? "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const user = await db.collection("users").findOne({ _id: result.insertedId });
  return NextResponse.json({ data: serializeUser(user!) }, { status: 201 });
}
