import bcrypt from "bcryptjs";
import { MongoClient } from "mongodb";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

async function main() {
  const uri = requireEnv("MONGODB_URI");
  const dbName = requireEnv("MONGODB_DB");

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@akres.test";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "admin123";
  const adminName = process.env.SEED_ADMIN_NAME ?? "Administrator Akres";

  const client = new MongoClient(uri);
  await client.connect();

  try {
    const db = client.db(dbName);
    const users = db.collection("users");
    const now = new Date().toISOString();
    const passwordHash = await bcrypt.hash(adminPassword, 12);

    const result = await users.updateOne(
      { email: adminEmail },
      {
        $setOnInsert: {
          email: adminEmail,
          emailVerified: null,
          createdAt: now,
        },
        $set: {
          name: adminName,
          role: "System Manager",
          studentId: "",
          guardianId: "",
          instructorId: "",
          passwordHash,
          updatedAt: now,
        },
      },
      { upsert: true },
    );

    const created = result.upsertedCount > 0;
    console.log(`Seed completed for database "${dbName}".`);
    console.log(
      created
        ? `Created admin user: ${adminEmail}`
        : `Updated admin user password/profile: ${adminEmail}`,
    );
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error("Seed failed:", error.message);
  process.exit(1);
});
