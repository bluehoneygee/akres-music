import fs from "node:fs";
import path from "node:path";

import { MongoClient } from "mongodb";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

async function main() {
  loadEnvFile(path.resolve(".env.local"));

  const uri = String(process.env.MONGODB_URI ?? "").trim();
  const dbName = String(process.env.MONGODB_DB ?? "").trim();
  if (!uri || !dbName) {
    throw new Error("Missing MONGODB_URI or MONGODB_DB in environment");
  }

  const client = await new MongoClient(uri).connect();
  const db = client.db(dbName);
  const now = new Date().toISOString();
  const defaultRooms = [
    { id: "room-a", roomName: "Studio A", capacity: 1, instrumentIds: [] },
    { id: "room-b", roomName: "Studio B", capacity: 1, instrumentIds: [] },
  ];

  try {
    await Promise.all(
      defaultRooms.map((room) =>
        db.collection("rooms").updateOne(
          { id: room.id },
          {
            $setOnInsert: {
              _id: room.id,
              id: room.id,
              createdAt: now,
            },
            $set: {
              roomName: room.roomName,
              capacity: room.capacity,
              instrumentIds: room.instrumentIds,
              isActive: true,
              updatedAt: now,
            },
          },
          { upsert: true },
        ),
      ),
    );
    console.log("Seeded default studio rooms: Studio A, Studio B");
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error("seed-rooms failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
