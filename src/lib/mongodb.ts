import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017";

const options = {};

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

export const client =
  global._mongoClientPromise ??
  new MongoClient(uri, options).connect();

if (process.env.NODE_ENV !== "production") {
  global._mongoClientPromise = client;
}

export async function getMongoDb() {
  const mongoClient = await client;
  return mongoClient.db(process.env.MONGODB_DB ?? "akres_music_academic");
}

export async function getMongoClient() {
  return client;
}
