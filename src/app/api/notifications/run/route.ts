import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { listNotifications, runNotificationSchedulers } from "@/lib/notification-jobs";
import { sessionRole } from "@/lib/session";

function hasCronAccess(request: NextRequest) {
  const secret = String(process.env.CRON_SECRET ?? "").trim();
  if (!secret) return false;

  const bearer = request.headers.get("authorization");
  if (bearer === `Bearer ${secret}`) return true;
  const querySecret = request.nextUrl.searchParams.get("secret");
  return querySecret === secret;
}

async function hasUserAccess() {
  const session = await auth();
  if (!session?.user) return false;
  const role = sessionRole(session);
  return role === "System Manager" || role === "Academic Staff";
}

export async function POST(request: NextRequest) {
  const cronAllowed = hasCronAccess(request);
  const userAllowed = cronAllowed ? true : await hasUserAccess();
  if (!userAllowed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const modeRaw = String(request.nextUrl.searchParams.get("mode") ?? "all");
  const mode = modeRaw === "morning" || modeRaw === "preclass3h" ? modeRaw : "all";
  const force = String(request.nextUrl.searchParams.get("force") ?? "").toLowerCase() === "true";
  const result = await runNotificationSchedulers(mode, { force });
  return NextResponse.json({ data: result });
}

export async function GET(request: NextRequest) {
  const cronAllowed = hasCronAccess(request);
  const userAllowed = cronAllowed ? true : await hasUserAccess();
  if (!userAllowed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const modeRaw = String(request.nextUrl.searchParams.get("mode") ?? "all");
  const mode = modeRaw === "morning" || modeRaw === "preclass3h" ? modeRaw : "all";
  const force = String(request.nextUrl.searchParams.get("force") ?? "").toLowerCase() === "true";
  const [result, notifications] = await Promise.all([
    runNotificationSchedulers(mode, { force }),
    listNotifications(20),
  ]);
  return NextResponse.json({ data: result, notifications });
}
