import { setServers } from "node:dns";
import { MongoClient } from "mongodb";
import { env, isDeployed } from "../config/env.js";

// Some local Windows setups point Node's resolver at 127.0.0.1, which refuses
// the SRV lookup needed by mongodb+srv://. Allow a public resolver override.
if (env.MONGODB_DNS_SERVERS) {
  setServers(
    env.MONGODB_DNS_SERVERS.split(",")
      .map((server) => server.trim())
      .filter(Boolean),
  );
}

// tsx watch can reload server modules during development; reuse one client.
const globalForMongo = globalThis as unknown as {
  fixmateMongoClient?: MongoClient;
};

export const mongoClient =
  globalForMongo.fixmateMongoClient ??
  new MongoClient(env.MONGODB_URI, {
    // Fail health checks and startup work quickly instead of hanging.
    serverSelectionTimeoutMS: 5_000,
  });

if (!isDeployed) {
  globalForMongo.fixmateMongoClient = mongoClient;
}

export const mongoDb = mongoClient.db(env.MONGODB_DB);
