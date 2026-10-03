const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const { neon } = require("@neondatabase/serverless");

// Exercise the actual guard against PostgreSQL using only synthetic CTE rows.
require("@next/env").loadEnvConfig(process.cwd(), true);
const source = fs.readFileSync("src/lib/neon-database.ts", "utf8");
const compiled = ts.transpileModule(source + "\nexport { snapshotGuard, handleSnapshotError };", {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const context = {
  exports: {}, Error,
  require(name) {
    if (name === "server-only" || name === "@/lib/workspace-plan") return {};
    return require(name);
  },
};
vm.runInNewContext(compiled, context);
const { snapshotGuard, handleSnapshotError } = context.exports;

async function main() {
  assert.ok(process.env.DATABASE_URL, "DATABASE_URL is required");
  const sql = neon(process.env.DATABASE_URL, { fetchOptions: { signal: AbortSignal.timeout(15000) } });
  const client = {
    query(query, params) {
      return sql.query(`WITH love_days_records(path, data) AS (
        VALUES ('users/test/events/event', '{"title":"existing"}'::jsonb)
      ) ${query}`, params);
    },
  };
  const records = [{ path: "users/test/events/event", data: { title: "existing" } }];
  await snapshotGuard(client, records, ["users/test"]);
  await snapshotGuard(client, [], ["users/empty"]);
  for (const stale of [[], [{ ...records[0], data: { title: "changed" } }]]) {
    await assert.rejects(
      snapshotGuard(client, stale, ["users/test"]).catch(handleSnapshotError),
      { message: "Dữ liệu vừa thay đổi. Hãy thử lại." },
    );
  }
  const unrelated = Object.assign(new Error('invalid input syntax for type integer: "other"'), { code: "22P02" });
  assert.throws(() => handleSnapshotError(unrelated), error => error === unrelated);
  console.log("PASS: matching and empty snapshots succeed; stale snapshots produce a friendly conflict; unrelated errors are preserved.");
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
