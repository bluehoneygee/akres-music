import bcrypt from "bcryptjs";
import type { Collection, Document, Filter } from "mongodb";

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
    await Promise.all(
      seedDatabase[resource].map((record) =>
        db.collection(resource).updateOne(
          { _id: record.id } as unknown as Filter<Document>,
          {
            $setOnInsert: {
              _id: record.id,
              ...record,
            },
          },
          { upsert: true },
        ),
      ),
    );
  }

  await ensureDefaultUsers();

  await marker.updateOne(
    { key: "seeded" },
    { $set: { value: true, seededAt: new Date() } },
    { upsert: true },
  );
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

  if (resource === "schedules") {
    const scheduleRecords = buildScheduleRecords(payload, now);
    const records = await collection(resource);
    await records.insertMany(scheduleRecords as Document[]);
    return fromMongo(scheduleRecords[0] as Document);
  }

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

function buildScheduleRecords(payload: Record<string, unknown>, now: string) {
  const pattern = String(payload.recurringPattern || "None");
  const startDate = String(payload.scheduleDate || "");
  const endDate = String(payload.recurrenceEndDate || "");
  const dates =
    pattern === "None" || !endDate ? [startDate] : expandScheduleDates(startDate, endDate, pattern);
  const baseId = String(payload.id || `schedules-${crypto.randomUUID()}`);

  return dates.map((scheduleDate, index) => {
    const id = index === 0 ? baseId : `${baseId}-${index + 1}`;

    return {
      _id: id,
      ...payload,
      id,
      scheduleDate,
      recurringPattern: pattern,
      recurrenceEndDate: endDate,
      createdAt: now,
      updatedAt: now,
    };
  });
}

function expandScheduleDates(startDate: string, endDate: string, pattern: string) {
  const stepDays = pattern === "Weekly" ? 7 : pattern === "Biweekly" ? 14 : 0;
  const dates: string[] = [];
  const current = parseDate(startDate);
  const end = parseDate(endDate);

  if (!current || !end || current > end) return [startDate];

  while (current <= end) {
    dates.push(formatDate(current));

    if (pattern === "Monthly") {
      current.setUTCMonth(current.getUTCMonth() + 1);
    } else if (stepDays > 0) {
      current.setUTCDate(current.getUTCDate() + stepDays);
    } else {
      break;
    }
  }

  return dates;
}

function parseDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return new Date(`${value}T00:00:00.000Z`);
}

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
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
