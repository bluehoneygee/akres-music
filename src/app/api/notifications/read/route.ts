import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { getMongoDb } from "@/lib/mongodb";

export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = String(session?.user?.id ?? "");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => ({}))) as {
    id?: string;
    ids?: string[];
  };

  const ids = [
    ...(Array.isArray(payload.ids) ? payload.ids : []),
    ...(payload.id ? [payload.id] : []),
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  if (ids.length === 0) {
    return NextResponse.json({ error: "Notification id is required" }, { status: 400 });
  }

  const db = await getMongoDb();
  const result = await db.collection("notifications").updateMany(
    { id: { $in: ids } },
    {
      $addToSet: { readByUserIds: userId },
      $set: { updatedAt: new Date().toISOString() },
    },
  );

  return NextResponse.json({ data: { matched: result.matchedCount, modified: result.modifiedCount } });
}
