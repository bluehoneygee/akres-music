import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { createRecord, isResourceName, listRecords } from "@/lib/db";
import { canAccessResource } from "@/lib/roles";
import { sessionRole } from "@/lib/session";
import { filterRecordsForSession } from "@/lib/visibility";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ resource: string }> },
) {
  const { resource } = await context.params;

  if (!isResourceName(resource)) {
    return NextResponse.json({ error: "Unknown resource" }, { status: 404 });
  }

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAccessResource({ role: sessionRole(session), resource, action: "read" })) {
    return NextResponse.json({ error: "You do not have access to this menu" }, { status: 403 });
  }

  const records = await listRecords(resource);
  const data = await filterRecordsForSession(resource, records, session);
  return NextResponse.json({ data });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ resource: string }> },
) {
  const { resource } = await context.params;

  if (!isResourceName(resource)) {
    return NextResponse.json({ error: "Unknown resource" }, { status: 404 });
  }

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAccessResource({ role: sessionRole(session), resource, action: "create" })) {
    return NextResponse.json({ error: "You do not have permission to create records here" }, { status: 403 });
  }

  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const record = await createRecord(resource, payload);
    return NextResponse.json({ data: record }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create record" },
      { status: 400 },
    );
  }
}
