import fs from "node:fs";
import path from "node:path";

import bcrypt from "bcryptjs";
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

function readArg(flag, fallback) {
  const index = process.argv.indexOf(flag);
  if (index < 0) return fallback;
  return process.argv[index + 1] || fallback;
}

async function main() {
  loadEnvFile(path.resolve(".env.local"));

  const uri = String(process.env.MONGODB_URI ?? "").trim();
  const dbName = String(process.env.MONGODB_DB ?? "").trim();

  if (!uri || !dbName) {
    throw new Error("Missing MONGODB_URI or MONGODB_DB in environment");
  }

  const email = readArg("--email", "admin@akres.test").toLowerCase();
  const password = readArg("--password", "admin123");
  const name = readArg("--name", "Administrator Akres");
  const role = "System Manager";

  const client = await new MongoClient(uri).connect();
  const db = client.db(dbName);
  try {
    const exists = await db.collection("users").findOne({ email });
    if (exists) {
      console.log(`Skipped: admin with email ${email} already exists.`);
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const now = new Date().toISOString();
    await db.collection("users").insertOne({
      email,
      emailVerified: null,
      name,
      role,
      studentId: "",
      guardianId: "",
      instructorId: "",
      passwordHash,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`Created admin user: ${email} (${role})`);
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error("seed-admin failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
