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

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = sessionRole(session) ?? "";
  if (!canAccessResource({ role, resource: "users", action: "read" })) {
    return NextResponse.json({ error: "Only System Manager can manage users" }, { status: 403 });
  }

  const db = await getMongoDb();
  const page = Math.max(Number(request.nextUrl.searchParams.get("page") || "1"), 1);
  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get("limit") || "50"), 1), 100);
  const search = request.nextUrl.searchParams.get("search")?.trim() ?? "";
  const filters = parseFilters(request.nextUrl.searchParams.get("filters"));
  const filter: Record<string, unknown> = { ...filters };
  if (search) {
    filter.$or = [
      { name: { $regex: escapeRegex(search), $options: "i" } },
      { email: { $regex: escapeRegex(search), $options: "i" } },
      { role: { $regex: escapeRegex(search), $options: "i" } },
    ];
  }
  const [users, total] = await Promise.all([
    db.collection("users").find(filter).sort({ email: 1 }).skip((page - 1) * limit).limit(limit).toArray(),
    db.collection("users").countDocuments(filter),
  ]);
  return NextResponse.json({ data: users.map(serializeUser), limit, page, role, total });
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

function parseFilters(value: string | null) {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as Record<string, string>;
    return Object.fromEntries(Object.entries(parsed).filter(([, filterValue]) => Boolean(filterValue)));
  } catch {
    return {};
  }
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
