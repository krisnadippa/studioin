import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  console.warn("WARNING: DATABASE_URL is not set in environment variables!");
}

const connectionString = process.env.DATABASE_URL || "";
export const sql = neon(connectionString);
