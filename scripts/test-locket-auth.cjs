const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const { test } = require("node:test");

function load(file, mocks) {
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(source, {
    module, exports: module.exports, process, Buffer, console, AbortSignal, fetch: mocks.fetch || global.fetch,
    require: (name) => Object.hasOwn(mocks, name) ? mocks[name] : require(name),
  }, { filename: file });
  return module.exports;
}

test("selected recipients and private moments are sent without copying to the couple feed", async () => {
  const sent = [];
  const writes = [];
  const route = load("src/app/api/locket/post/route.ts", {
    "next/server": { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } },
    "@/lib/verifyAuthToken": { verifyAuthToken: async () => ({ uid: "app-user" }) },
    "@/lib/locket/locket-service": { getLocketClientForUser: async () => ({ moments: { post: async options => { sent.push(options); return { thumbnail_url: "photo" }; } } }) },
    "@/lib/neon-admin-db": { adminGet: async () => ({ data: { coupleId: "couple" } }), adminWrite: async operation => writes.push(operation) },
  });
  const send = body => route.POST({ headers: { get: () => "application/json" }, json: async () => ({ imageBase64: "aW1hZ2U=", caption: "Hello", colors: ["#fff", "#000"], ...body }) });
  assert.equal((await send({ recipients: ["friend"] })).body.ok, true);
  assert.equal(sent[0].recipients[0], "friend");
  assert.equal(sent[0].caption, "Hello");
  assert.equal(writes.length, 0);
  await send({ isPrivate: true });
  assert.equal(sent[1].isPrivate, true);
  assert.equal(writes.length, 0);
  await send({});
  assert.equal(writes.length, 1);
});

test("history loads multiple documents with real authors and a stable date/ID cursor", async () => {
  const sdk = require("locket.js");
  const client = new sdk.LocketClient({ sessionPath: null });
  client.session.uid = "viewer";
  client.session.getValidToken = async () => "token";
  const prefix = "projects/locket-4252a/databases/locket/documents/history/viewer/entries/";
  let query;
  let call = 0;
  const service = load("src/lib/locket/locket-history.ts", {
    "server-only": {},
    fetch: async (url, options) => {
      assert.ok(url.includes("history/viewer:runQuery"));
      query = JSON.parse(options.body).structuredQuery;
      call++;
      return { ok: true, json: async () => call === 1 ? ["a", "b"].map((id, i) => ({ document: {
        name: prefix + id,
        fields: { user: { stringValue: "friend-" + i }, canonical_uid: { stringValue: id }, date: { timestampValue: "2026-11-04T10:00:00Z" }, thumbnail_url: { stringValue: "photo" } },
      } })) : [] };
    },
  });
  const page = await service.getLocketHistory(client, { limit: 2, pageToken: null });
  assert.equal(page.moments.length, 2);
  assert.equal(page.moments[0].user_uid, "friend-0");
  assert.equal(page.moments[1].user_uid, "friend-1");
  assert.ok(page.nextPageToken);
  const next = await service.getLocketHistory(client, { limit: 2, pageToken: page.nextPageToken, userId: "viewer" });
  assert.equal(query.startAt.values[1].referenceValue, prefix + "b");
  assert.equal(query.startAt.before, false);
  assert.equal(query.where.fieldFilter.value.stringValue, "viewer");
  assert.equal(next.nextPageToken, null);
  const foreign = client.moments.encodeQueryCursor({ date: "2026-11-04T10:00:00Z", docName: prefix.replace("viewer", "other") + "a" });
  await assert.rejects(service.getLocketHistory(client, { limit: 2, pageToken: foreign }), /Trang/);
});

test("Locket login signs the stable UID and saves the linked account before returning", async () => {
  const writes = [];
  const route = load("src/app/api/locket/auth/route.ts", {
    "next/server": { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } },
    "@/lib/verifyAuthToken": {},
    "@/lib/firebaseAdmin": { getAdminAuth: () => ({ createCustomToken: async (uid, claims) => {
      assert.equal(uid, "locket_locket-user");
      assert.equal(claims.isLocket, true);
      assert.equal(Object.hasOwn(claims, "email"), false);
      return "signed-app-token";
    } }) },
    "@/lib/neon-admin-db": { adminGet: async () => ({ data: null }), adminWrite: async (op) => writes.push(op) },
    "@/lib/locket/locket-service": { verifyLocketCredentials: async () => ({
      uid: "locket-user", email: "test@example.com", displayName: "Test", avatarUrl: "",
      idToken: "private-locket-token", refreshToken: "private-refresh", expiresAt: 123, device: {},
    }) },
  });
  const result = await route.POST({ json: async () => ({ action: "login", email: "test@example.com", password: "test" }) });
  assert.equal(result.status, 200);
  assert.equal(result.body.customToken, "signed-app-token");
  assert.equal(writes[0].path, "users/locket_locket-user");
  assert.equal(writes[0].data.locketAccount.idToken, "private-locket-token");
  assert.equal(JSON.stringify(result.body).includes("private-locket-token"), false);
});

test("Locket SDK login trims email and keeps sessions off disk", async () => {
  const sdk = require("locket.js");
  let received;
  class Client {
    constructor(options) {
      assert.equal(options.sessionPath, null);
      this.session = {};
      this.device = { toDict: () => ({}) };
      this.user = { getProfile: async () => ({ first_name: "Test" }) };
    }
    async login(email, password) {
      received = { email, password };
      this.session = { uid: "u", idToken: "id", refreshToken: "refresh", expiresAt: 123 };
      return {};
    }
  }
  const service = load("src/lib/locket/locket-service.ts", {
    "server-only": {}, "@/lib/neon-admin-db": {}, "locket.js": { ...sdk, LocketClient: Client },
  });
  const account = await service.verifyLocketCredentials(" test@example.com ", " password ");
  assert.equal(received.email, "test@example.com");
  assert.equal(received.password, " password ");
  assert.equal(account.uid, "u");
  Client.prototype.login = async () => { throw new sdk.AuthenticationError("Login failed: INVALID_LOGIN_CREDENTIALS"); };
  await assert.rejects(service.verifyLocketCredentials("test@example.com", "bad"), /Email hoặc mật khẩu Locket không đúng/);
});
