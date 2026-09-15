import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd(), true);

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

const endpoint = required("NEXT_PUBLIC_APPS_SCRIPT_URL");
const secret = required("SERVER_SECRET");
const sql = neon(required("DATABASE_URL"));

async function legacyRequest(action, payload = {}) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, secret, ...payload }),
    signal: AbortSignal.timeout(60_000),
  });
  const text = await response.text();
  const result = JSON.parse(text);
  if (!response.ok || !result.ok) throw new Error(result.error || `Apps Script HTTP ${response.status}`);
  return result.data;
}

await sql.query(`
  CREATE TABLE IF NOT EXISTS love_days_records (
    path TEXT PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
  )
`);
await sql.query("CREATE INDEX IF NOT EXISTS love_days_records_updated_at_idx ON love_days_records (updated_at DESC)");

const records = new Map();
for (const collection of ["users", "pairInvites", "couples"]) {
  const items = await legacyRequest("list", { path: collection, constraints: [] });
  for (const item of items) records.set(`${collection}/${item.id}`, { path: `${collection}/${item.id}`, data: item.data, version: Number(item.version) || Date.now() });
}

const couples = Array.from(records.values()).filter((record) => record.path.startsWith("couples/"));
for (const couple of couples) {
  const coupleId = couple.path.split("/")[1];
  const exported = await legacyRequest("exportCouple", { coupleId });
  for (const [collection, items] of Object.entries(exported.data || {})) {
    for (const item of items) {
      const path = `couples/${coupleId}/${collection}/${item.id}`;
      records.set(path, { path, data: item.data, version: Number(item.version) || Date.now() });
    }
  }
}

const values = Array.from(records.values());
for (let index = 0; index < values.length; index += 100) {
  const batch = values.slice(index, index + 100);
  await sql.transaction(batch.map((record) => sql.query(
    "INSERT INTO love_days_records (path, data, created_at, updated_at) VALUES ($1, $2::jsonb, $3, $4) ON CONFLICT (path) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at",
    [record.path, JSON.stringify(record.data), record.version, record.version],
  )));
  console.log(`Migrated ${Math.min(index + batch.length, values.length)}/${values.length}`);
}

console.log(`Done. Migrated ${values.length} records from Apps Script to Neon.`);
