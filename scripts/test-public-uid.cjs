const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

let rows = [];
let transactions = 0;
const sql = {
  query(text) { return text.startsWith("SELECT path, data") ? rows : []; },
  async transaction() { transactions += 1; },
};
const context = {
  exports: {}, Error, structuredClone, process: { env: { DATABASE_URL: "test" } }, AbortSignal,
  require(name) {
    if (name === "server-only" || name === "@/lib/workspace-plan") return {};
    if (name === "@neondatabase/serverless") return { neon: () => sql };
    return require(name);
  },
};
vm.runInNewContext(ts.transpileModule(fs.readFileSync("src/lib/neon-database.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, context);
const run = (body) => context.exports.executeDatabaseAction(body, { uid: "self" });
const record = (path, data) => ({ path, data, created_at: 1, updated_at: 1 });
const lookup = (publicUid) => run({ action: "findUserByPublicUid", publicUid });
const save = (publicUid) => run({ action: "write", operation: { type: "update", path: "users/self", data: { publicUid } } });

async function main() {
  rows = [record("users/self", { publicUid: "myuid" }), record("users/other", { publicUid: "kzi207", email: "private", bio: "private" })];
  const found = await lookup(" KZI207 ");
  assert.equal(JSON.stringify(found), JSON.stringify({ uid: "other", publicUid: "kzi207", displayName: "kzi207" }));
  rows[1].data.displayName = "Test User";
  assert.equal((await lookup("kzi207")).displayName, "Test User");
  assert.equal("email" in found, false);
  assert.equal("bio" in found, false);
  await assert.rejects(lookup("missing"), /Không tìm thấy/);
  await assert.rejects(lookup("myuid"), /chính mình/);
  await assert.rejects(lookup("a/b"), /3–24/);
  await assert.rejects(save("kzi207"), /đã có người/);
  await assert.rejects(save("bad uid"), /3–24/);
  assert.equal(transactions, 0);
  await save("new_uid");
  assert.equal(transactions, 1);
  rows[1].data.coupleId = "shared";
  rows.push(record("couples/shared", { memberIds: ["other", "third"] }));
  await assert.rejects(lookup("kzi207"), /đã ghép đôi/);
  rows[2].data.memberIds = ["other"];
  assert.equal((await lookup("kzi207")).uid, "other");
  console.log("Public UID checks passed.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
