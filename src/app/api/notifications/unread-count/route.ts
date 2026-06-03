import { NextResponse } from "next/server";
import type { Document, Filter } from "mongodb";

import { auth } from "@/auth";
import { getMongoDb } from "@/lib/mongodb";
import { canAccessResource } from "@/lib/roles";
import { sessionRole } from "@/lib/session";
import { mongoScopeFilterForSession } from "@/lib/visibility";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAccessResource({ role: sessionRole(session), resource: "notifications", action: "read" })) {
    return NextResponse.json({ error: "You do not have access to notifications" }, { status: 403 });
  }

  const userId = String(session.user.id ?? "");
  if (!userId) return NextResponse.json({ count: 0 });

  const db = await getMongoDb();
  const scopeFilter = await mongoScopeFilterForSession("notifications", session);
  const filters: Filter<Document>[] = [scopeFilter, { readByUserIds: { $ne: userId } }];
  const count = await db
    .collection("notifications")
    .countDocuments(filters.length > 1 ? { $and: filters } : filters[0]);

  return NextResponse.json({ count });
}
