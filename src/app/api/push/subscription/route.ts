import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { removePushSubscription, savePushSubscription } from "@/lib/push";

type PushSubscriptionPayload = {
  endpoint?: string;
  keys?: {
    auth?: string;
    p256dh?: string;
  };
};

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as PushSubscriptionPayload;
  const endpoint = String(payload.endpoint ?? "");
  if (!endpoint) {
    return NextResponse.json({ error: "Invalid subscription endpoint" }, { status: 400 });
  }

  await savePushSubscription(String(session.user.id ?? ""), {
    endpoint,
    keys: payload.keys ?? {},
  });

  return NextResponse.json({ data: { ok: true } });
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as PushSubscriptionPayload;
  const endpoint = String(payload.endpoint ?? "");
  if (!endpoint) {
    return NextResponse.json({ error: "Invalid subscription endpoint" }, { status: 400 });
  }

  await removePushSubscription(String(session.user.id ?? ""), endpoint);
  return NextResponse.json({ data: { ok: true } });
}
