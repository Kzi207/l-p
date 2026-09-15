import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd(), true);

const connectionString = process.env.DATABASE_URL?.trim();
if (!connectionString) throw new Error("Missing DATABASE_URL");

const sql = neon(connectionString);
await sql.query(`
  CREATE TABLE IF NOT EXISTS love_days_records (
    path TEXT PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
  )
`);
await sql.query("CREATE INDEX IF NOT EXISTS love_days_records_updated_at_idx ON love_days_records (updated_at DESC)");
const rows = await sql.query("SELECT COUNT(*)::int AS count FROM love_days_records");
console.log(`Neon is ready. Current records: ${rows[0].count}`);
