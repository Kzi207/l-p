const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
function load(file, mocks = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const context = { exports: {}, process, Date, Intl, AbortSignal, Buffer, console: { error() {} },
    require: name => name in mocks ? mocks[name] : require(name) };
  vm.runInNewContext(code, context);
  return context.exports;
}
const plan = load("src/lib/calendar-reminder-plan.ts");
const start = Date.parse("2026-10-03T21:00:00+07:00");
const event = { title: "Dinner", eventAt: { value: start }, remindDays: 1, creatorId: "a", scheduleType: "personal" };
assert.equal(plan.dueCalendarReminders(event, start - 1).length, 0);
assert.equal(plan.dueCalendarReminders(event, start)[0].kind, "start");
assert.equal(plan.dueCalendarReminders(event, start - 86400000)[0].kind, "advance");
assert.equal(plan.dueCalendarReminders(event, start + 3600000).length, 0);
assert.equal(plan.dueCalendarReminders({ eventAt: { value: "invalid" } }, start).length, 0);
assert.equal(plan.calendarRecipients(event, ["a", "b"]).join(), "a");
assert.equal(plan.calendarRecipients({ ...event, scheduleType: "together" }, ["a", "b", "b"]).join(), "a,b");
assert.equal(plan.calendarRecipients(event, ["b"]).length, 0);

const claims = new Map();
const pushes = [];
let success = true;
let records = [{ id: "event", path: "couples/c/coupleEvents/event", data: event }];
const sql = { async query(query, params) {
  const [path, data] = params;
  if (query.startsWith("INSERT")) {
    if (claims.has(path)) return [];
    claims.set(path, JSON.parse(data));
    return [{ path }];
  }
  if (query.startsWith("DELETE")) claims.delete(path);
  if (query.startsWith("UPDATE")) claims.get(path).status = "sent";
  return [];
} };
const reminders = load("src/lib/calendar-reminders.ts", {
  "server-only": {},
  "@neondatabase/serverless": { neon: () => sql },
  "@/lib/neon-database": { ensureNeonSchema: async () => {} },
  "@/lib/neon-admin-db": {
    adminCollectionGroup: async () => records,
    adminList: async () => records,
    adminGet: async () => ({ data: { memberIds: ["a", "b"] } }),
  },
  "@/lib/calendar-reminder-plan": plan,
  "@/lib/sendPushNotification": { sendPushToUser: async (...args) => {
    pushes.push(args);
    return { successCount: success ? 1 : 0 };
  } },
});
async function main() {
  await Promise.all([reminders.sendDueCalendarReminders(undefined, start), reminders.sendDueCalendarReminders(undefined, start)]);
  assert.equal(pushes.length, 1, "overlapping checks must not duplicate a push");
  assert.equal(pushes[0][0], "a");
  assert.ok(pushes[0][2].includes("21:00"), "format in Vietnam time");
  assert.equal(pushes[0][3], "/calendar?event=event");
  records[0].data = { ...event, eventAt: { value: start + 60000 }, scheduleType: "together" };
  await reminders.sendDueCalendarReminders({ coupleId: "c", uid: "b" }, start + 60000);
  assert.equal(pushes.length, 2);
  assert.equal(pushes[1][0], "b", "authenticated checks send only to the caller");
  await reminders.sendDueCalendarReminders(undefined, start + 60000);
  assert.equal(pushes.length, 3, "cron sends the other member's rescheduled reminder");
  claims.clear(); pushes.length = 0; success = false;
  const failed = await reminders.sendDueCalendarReminders(undefined, start + 60000);
  assert.equal(failed.failed, 2);
  assert.equal(claims.size, 0, "failed or tokenless delivery remains retryable");
  success = true;
  const retried = await reminders.sendDueCalendarReminders(undefined, start + 60000);
  assert.equal(retried.sent, 2);
  class ApiAuthError extends Error { constructor() { super("Unauthorized"); this.status = 401; } }
  let verified = false, calledScope;
  const route = load("src/app/api/notify/calendar-check/route.ts", {
    "next/server": { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } },
    "@/lib/neon-admin-db": { adminGet: async path => ({ data: path.startsWith("users/") ? { coupleId: "c" } : { memberIds: ["a"] } }) },
    "@/lib/calendar-reminders": { sendDueCalendarReminders: async scope => { calledScope = scope; return {}; } },
    "@/lib/verifyAuthToken": { ApiAuthError, verifyAuthToken: async () => { if (!verified) throw new ApiAuthError(); return { uid: "a" }; } },
  });
  const originalSecret = process.env.CRON_SECRET;
  try {
    process.env.CRON_SECRET = "test-secret";
    const request = secret => ({ headers: { get: () => secret } });
    assert.equal((await route.POST(request("wrong"))).status, 401);
    assert.equal((await route.POST(request(null))).status, 401);
    verified = true;
    assert.equal((await route.POST(request(null))).status, 200);
    assert.equal(calledScope.uid, "a");
    assert.equal(calledScope.coupleId, "c");
    assert.equal((await route.POST(request("test-secret"))).status, 200);
    assert.equal(calledScope, undefined);
    delete process.env.CRON_SECRET;
    assert.equal((await route.POST(request("test-secret"))).status, 503);
  } finally {
    if (originalSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalSecret;
  }
  console.log("PASS: due times, Vietnam timezone, advance reminders, recipients, overlapping checks, rescheduling, scope, delivery retry and endpoint authentication.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
