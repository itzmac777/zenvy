import mongoose from "mongoose";
import { config } from "./config.js";

let connectionPromise: Promise<typeof mongoose> | null = null;

export function connectDatabase() {
  connectionPromise ??= mongoose.connect(config.mongoUri);
  return connectionPromise;
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
  connectionPromise = null;
}

export function databaseReady() {
  return mongoose.connection.readyState === 1;
}
