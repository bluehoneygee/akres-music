import { MongoClient } from "mongodb";

function requireEnv(name) {
  const value = String(process.env[name] ?? "").trim();
  if (!value) throw new Error(`Missing ${name} in environment`);
  return value;
}

function scheduleMonthFromDate(value) {
  const date = String(value ?? "");
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.slice(0, 7) : "";
}

async function main() {
  const client = new MongoClient(requireEnv("MONGODB_URI"));

  await client.connect();

  try {
    const db = client.db(requireEnv("MONGODB_DB"));
    const schedules = db.collection("schedules");
    const rows = await schedules
      .find(
        { scheduleDate: { $type: "string", $regex: /^\d{4}-\d{2}-\d{2}$/ } },
        { projection: { _id: 1, id: 1, scheduleDate: 1, scheduleMonth: 1 } },
      )
      .toArray();

    const updates = rows
      .map((row) => ({
        row,
        expectedMonth: scheduleMonthFromDate(row.scheduleDate),
      }))
      .filter(({ row, expectedMonth }) => expectedMonth && row.scheduleMonth !== expectedMonth);

    if (updates.length === 0) {
      console.log("No scheduleMonth backfill needed.");
      return;
    }

    const result = await schedules.bulkWrite(
      updates.map(({ row, expectedMonth }) => ({
        updateOne: {
          filter: { _id: row._id },
          update: {
            $set: {
              scheduleMonth: expectedMonth,
              updatedAt: new Date().toISOString(),
            },
          },
        },
      })),
    );

    console.log(
      `Backfilled scheduleMonth for ${result.modifiedCount} schedules (${updates.length} mismatches found).`,
    );
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
