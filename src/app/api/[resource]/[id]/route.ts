import { NextRequest, NextResponse } from "next/server";

import { deleteRecord, isResourceName, updateRecord } from "@/lib/db";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ resource: string; id: string }> },
) {
  const { resource, id } = await context.params;

  if (!isResourceName(resource)) {
    return NextResponse.json({ error: "Unknown resource" }, { status: 404 });
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

  const deleted = await deleteRecord(resource, id);

  if (!deleted) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }

  return NextResponse.json({ data: { id } });
}
