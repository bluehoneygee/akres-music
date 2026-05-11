import { NextRequest, NextResponse } from "next/server";

import { createRecord, isResourceName, listRecords } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ resource: string }> },
) {
  const { resource } = await context.params;

  if (!isResourceName(resource)) {
    return NextResponse.json({ error: "Unknown resource" }, { status: 404 });
  }

  const data = await listRecords(resource);
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

  const payload = (await request.json()) as Record<string, unknown>;
  const record = await createRecord(resource, payload);
  return NextResponse.json({ data: record }, { status: 201 });
}
