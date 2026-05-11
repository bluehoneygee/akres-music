import bcrypt from "bcryptjs";
import type { Collection, Document } from "mongodb";

import type { AnyRecord, Database, ResourceName } from "@/lib/models";
import { getMongoDb } from "@/lib/mongodb";
import { seedDatabase } from "@/lib/seed";

export const resources: ResourceName[] = [
  "instruments",
  "students",
  "guardians",
  "instructors",
  "courses",
  "rooms",
  "schedules",
  "student-attendance",
  "instructor-attendance",
  "journals",
  "repertoires",
  "invoices",
  "notifications",
];

export function isResourceName(value: string): value is ResourceName {
  return resources.includes(value as ResourceName);
}

async function collection(resource: ResourceName): Promise<Collection<Document>> {
  const db = await getMongoDb();
  await ensureSeedData();
  return db.collection(resource);
}

let seedPromise: Promise<void> | null = null;

export async function ensureSeedData() {
  if (!seedPromise) {
    seedPromise = seed();
  }

  await seedPromise;
}

async function seed() {
  const db = await getMongoDb();
  const marker = db.collection("_meta");
  const seeded = await marker.findOne({ key: "seeded" });

  if (seeded) {
    await ensureDefaultUsers();
    return;
  }

  for (const resource of resources) {
    const docs = seedDatabase[resource].map((record) => ({
      _id: record.id,
      ...record,
    }));

    if (docs.length > 0) {
      await db.collection(resource).insertMany(docs as unknown as Document[], {
        ordered: false,
      });
    }
  }

  await ensureDefaultUsers();

  await marker.insertOne({ key: "seeded", value: true, seededAt: new Date() });
}

async function ensureDefaultUsers() {
  const db = await getMongoDb();
  const passwordHash = await bcrypt.hash("admin123", 12);
  const users = [
    {
      email: "admin@akres.test",
      emailVerified: null,
      name: "Administrator Akres",
      role: "System Manager",
      passwordHash,
    },
    {
      email: "staff@akres.test",
      emailVerified: null,
      name: "Staff Akres",
      role: "Academic Staff",
      passwordHash,
    },
    {
      email: "budi.teacher@akres.test",
      emailVerified: null,
      name: "Budi Santoso",
      role: "Music Instructor",
      instructorId: "instructor-budi",
      passwordHash,
    },
    {
      email: "rina.parent@akres.test",
      emailVerified: null,
      name: "Rina Prameswari",
      role: "Parent Portal User",
      guardianId: "guardian-rina",
      passwordHash,
    },
  ];

  await Promise.all(
    users.map((user) => {
      const { name, role, ...insertOnly } = user;

      return db.collection("users").updateOne(
        { email: user.email },
        {
          $setOnInsert: {
            ...insertOnly,
            createdAt: new Date().toISOString(),
          },
          $set: {
            name,
            role,
            updatedAt: new Date().toISOString(),
          },
        },
        { upsert: true },
      );
    }),
  );
}

function fromMongo<T extends Document>(record: T): Omit<T, "_id"> & { id: string } {
  const { _id, ...rest } = record;
  return {
    id: String("id" in rest ? rest.id : _id),
    ...rest,
  } as Omit<T, "_id"> & { id: string };
}

export async function readDatabase(): Promise<Database> {
  await ensureSeedData();
  const db = await getMongoDb();
  const entries = await Promise.all(
    resources.map(async (resource) => {
      const records = await db.collection(resource).find({}).sort({ createdAt: -1 }).toArray();
      return [resource, records.map(fromMongo)] as const;
    }),
  );

  return Object.fromEntries(entries) as Database;
}

export async function listRecords(resource: ResourceName) {
  const records = await (await collection(resource)).find({}).sort({ createdAt: -1 }).toArray();
  return records.map(fromMongo);
}

export async function createRecord(resource: ResourceName, payload: Record<string, unknown>) {
  const now = new Date().toISOString();
  const id = String(payload.id || `${resource}-${crypto.randomUUID()}`);
  const record = {
    _id: id,
    ...payload,
    id,
    createdAt: now,
    updatedAt: now,
  };

  await (await collection(resource)).insertOne(record as Document);
  return fromMongo(record);
}

export async function updateRecord(
  resource: ResourceName,
  id: string,
  payload: Record<string, unknown>,
) {
  const records = await collection(resource);
  const updatedAt = new Date().toISOString();
  const result = await records.findOneAndUpdate(
    { id },
    { $set: { ...payload, id, updatedAt } },
    { returnDocument: "after" },
  );

  return result ? (fromMongo(result) as AnyRecord) : null;
}

export async function deleteRecord(resource: ResourceName, id: string) {
  const result = await (await collection(resource)).deleteOne({ id });
  return result.deletedCount > 0;
}
