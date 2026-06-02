import { NextRequest, NextResponse } from "next/server";

import { runNotificationSchedulers } from "@/lib/notification-jobs";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  // Vercel Cron sends a special header
  const cronHeader = request.headers.get("x-vercel-cron");
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  // Allow either Vercel Cron header or Bearer token
  const isVercelCron = cronHeader !== null;
  const isAuthorized = authHeader === `Bearer ${cronSecret}`;

  if (!isVercelCron && !isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runNotificationSchedulers("morning");
  return NextResponse.json({ data: result });
}
