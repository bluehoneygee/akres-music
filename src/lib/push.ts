import webpush, { type PushSubscription as WebPushSubscription } from "web-push";

import { getMongoDb } from "@/lib/mongodb";

type PushPayload = {
  body: string;
  title: string;
  url?: string;
};

type StoredSubscription = {
  endpoint: string;
  keys?: { auth?: string; p256dh?: string };
};

function getPushConfig() {
  const publicKey = String(process.env.VAPID_PUBLIC_KEY ?? "").trim();
  const privateKey = String(process.env.VAPID_PRIVATE_KEY ?? "").trim();
  const subject = String(process.env.VAPID_SUBJECT ?? "").trim();
  const enabled = Boolean(publicKey && privateKey && subject);

  if (enabled) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
  }

  return { enabled, publicKey };
}

export function getPushPublicKey() {
  const { publicKey } = getPushConfig();
  return publicKey;
}

export async function savePushSubscription(userId: string, subscription: StoredSubscription) {
  const db = await getMongoDb();
  const now = new Date().toISOString();

  await db.collection("push-subscriptions").updateOne(
    { endpoint: subscription.endpoint },
    {
      $set: {
        userId,
        endpoint: subscription.endpoint,
        keys: subscription.keys ?? {},
        updatedAt: now,
      },
      $setOnInsert: {
        _id: `push-${Buffer.from(subscription.endpoint).toString("base64url").slice(0, 32)}`,
        createdAt: now,
      },
    },
    { upsert: true },
  );
}

export async function removePushSubscription(userId: string, endpoint: string) {
  const db = await getMongoDb();
  await db.collection("push-subscriptions").deleteOne({ userId, endpoint });
}

export async function sendPushToUsers(userIds: string[], payload: PushPayload) {
  const { enabled } = getPushConfig();
  if (!enabled || userIds.length === 0) return { sent: 0, skipped: userIds.length };

  const db = await getMongoDb();
  const subscriptions = (await db
    .collection("push-subscriptions")
    .find({ userId: { $in: userIds } })
    .project<StoredSubscription>({ endpoint: 1, keys: 1 })
    .toArray()) as StoredSubscription[];

  let sent = 0;
  let skipped = 0;

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(subscription as WebPushSubscription, JSON.stringify(payload));
        sent += 1;
      } catch {
        skipped += 1;
      }
    }),
  );

  return { sent, skipped: skipped + Math.max(0, userIds.length - subscriptions.length) };
}
