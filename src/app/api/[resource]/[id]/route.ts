import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { deleteRecord, isResourceName, updateRecord } from "@/lib/db";
import { canAccessResource } from "@/lib/roles";
import { sessionRole } from "@/lib/session";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ resource: string; id: string }> },
) {
  const { resource, id } = await context.params;

  if (!isResourceName(resource)) {
    return NextResponse.json({ error: "Unknown resource" }, { status: 404 });
  }

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAccessResource({ role: sessionRole(session), resource, action: "update" })) {
    return NextResponse.json({ error: "You do not have permission to update this record" }, { status: 403 });
  }

  const payload = (await request.json()) as Record<string, unknown>;
  const record = await updateRecord(resource, id, payload);

  if (!record) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }

  return NextResponse.json({ data: record });
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ resource: string; id: string }> },
) {
  const { resource, id } = await context.params;

  if (!isResourceName(resource)) {
    return NextResponse.json({ error: "Unknown resource" }, { status: 404 });
  }

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAccessResource({ role: sessionRole(session), resource, action: "delete" })) {
    return NextResponse.json({ error: "You do not have permission to delete this record" }, { status: 403 });
  }

  const deleted = await deleteRecord(resource, id);

  if (!deleted) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }

  return NextResponse.json({ data: { id } });
}
