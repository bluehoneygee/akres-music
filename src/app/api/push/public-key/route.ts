import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getPushPublicKey } from "@/lib/push";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const publicKey = getPushPublicKey();
  if (!publicKey) {
    return NextResponse.json({ error: "Push not configured" }, { status: 400 });
  }

  return NextResponse.json({ data: { publicKey } });
}
