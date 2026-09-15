import "server-only";

import { neon } from "@neondatabase/serverless";

export type JsonRecord = Record<string, unknown>;

export interface DatabaseUser {
  uid: string;
  admin?: boolean;
}

export interface DatabaseRecord<T = JsonRecord> {
  id: string;
  path?: string;
  data: T;
  version?: number;
}

interface StoredRecord {
  path: string;
  data: JsonRecord;
  createdAt: number;
  updatedAt: number;
}

interface WriteOperation {
  type: "set" | "create" | "update" | "delete";
  path: string;
  data?: JsonRecord;
  merge?: boolean;
}

interface Constraint {
  kind?: string;
  field?: string;
  operator?: string;
  value?: unknown;
  direction?: string;
  count?: number;
}

const MAX_BATCH_SIZE = 25;
let schemaPromise: Promise<void> | null = null;

function connectionString() {
  const value = process.env.DATABASE_URL?.trim();
  if (!value) throw new Error("Thiếu biến môi trường DATABASE_URL.");
  return value;
}

function sqlClient() {
  return neon(connectionString());
}

export function ensureNeonSchema() {
  if (!schemaPromise) {
    const sql = sqlClient();
    schemaPromise = (async () => {
      await sql.query(`
        CREATE TABLE IF NOT EXISTS love_days_records (
          path TEXT PRIMARY KEY,
          data JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at BIGINT NOT NULL,
          updated_at BIGINT NOT NULL
        )
      `);
      await sql.query("CREATE INDEX IF NOT EXISTS love_days_records_updated_at_idx ON love_days_records (updated_at DESC)");
    })().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}

async function loadRecords() {
  await ensureNeonSchema();
  const rows = await sqlClient().query("SELECT path, data, created_at, updated_at FROM love_days_records");
  return rows.map((row) => ({
    path: String(row.path),
    data: (row.data && typeof row.data === "object" ? row.data : {}) as JsonRecord,
    createdAt: Number(row.created_at) || 0,
    updatedAt: Number(row.updated_at) || 0,
  }));
}

function indexRecords(records: StoredRecord[]) {
  return new Map(records.map((record) => [record.path, record]));
}

function getField(value: unknown, path: string) {
  return path.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as JsonRecord)[key];
  }, value);
}

function setField(target: JsonRecord, path: string, value: unknown) {
  const parts = path.split(".");
  if (!parts.length || parts.some((part) => !part || ["__proto__", "constructor", "prototype"].includes(part))) {
    throw new Error("Field path không hợp lệ.");
  }
  let cursor = target;
  for (const part of parts.slice(0, -1)) {
    const current = cursor[part];
    if (!current || typeof current !== "object" || Array.isArray(current)) cursor[part] = {};
    cursor = cursor[part] as JsonRecord;
  }
  cursor[parts[parts.length - 1]] = value;
}

function validatePath(path: unknown) {
  if (typeof path !== "string" || !path || path.length > 500 || path.startsWith("/") || path.endsWith("/") || path.includes("//")) {
    throw new Error("Đường dẫn dữ liệu không hợp lệ.");
  }
  if (path.split("/").some((part) => !part || part === "." || part === "..")) throw new Error("Đường dẫn dữ liệu không hợp lệ.");
  return path;
}

function validateDocumentPath(value: unknown) {
  const path = validatePath(value);
  if (path.split("/").length % 2 !== 0) throw new Error("Document path không hợp lệ.");
  return path;
}

function validateCollectionPath(value: unknown) {
  const path = validatePath(value);
  if (path.split("/").length % 2 !== 1) throw new Error("Collection path không hợp lệ.");
  return path;
}

function visibleData(path: string, data: JsonRecord, user: DatabaseUser) {
  if (user.admin || !path.includes("/timeCapsules/")) return data;
  const openDate = data.openDate;
  const openAt = openDate && typeof openDate === "object" && "value" in openDate ? Number((openDate as JsonRecord).value) : 0;
  if (!openAt || openAt <= Date.now()) return data;
  const hidden = structuredClone(data);
  delete hidden.message;
  delete hidden.mediaUrl;
  delete hidden.cloudinaryPublicId;
  hidden.locked = true;
  return hidden;
}

function hasLinkedCouple(index: Map<string, StoredRecord>, firstUid: string, secondUid: string) {
  return Array.from(index.values()).some((record) => {
    const members = record.data.memberIds;
    return record.path.startsWith("couples/") && record.path.split("/").length === 2 && Array.isArray(members) && members.includes(firstUid) && members.includes(secondUid);
  });
}

function hasValidInvite(index: Map<string, StoredRecord>, firstUid: string, secondUid: string) {
  return Array.from(index.values()).some((record) => {
    if (!record.path.startsWith("pairInvites/")) return false;
    const invite = record.data;
    const membersMatch = (invite.ownerId === firstUid && invite.targetUid === secondUid) || (invite.targetUid === firstUid && invite.ownerId === secondUid);
    return membersMatch && (invite.status === "active" || invite.status === "accepted");
  });
}

function authorize(user: DatabaseUser, path: string, action: string, currentData: JsonRecord | null, index: Map<string, StoredRecord>, incoming: JsonRecord) {
  if (user.admin) return;
  const parts = path.split("/");

  if (parts[0] === "users") {
    if (parts[1] === user.uid) return;
    const self = index.get(`users/${user.uid}`);
    const other = index.get(`users/${parts[1]}`);
    const sameCouple = Boolean(self && other && self.data.coupleId && self.data.coupleId === other.data.coupleId);
    if (action === "read" && sameCouple) return;
    const keys = Object.keys(incoming);
    if (action === "update" && keys.length === 1 && keys[0] === "coupleId") {
      if (incoming.coupleId === null && (sameCouple || hasLinkedCouple(index, user.uid, parts[1]))) return;
      if (typeof incoming.coupleId === "string" && hasValidInvite(index, user.uid, parts[1])) return;
    }
    throw new Error("Bạn không có quyền với hồ sơ này.");
  }

  if (parts[0] === "pairInvites") {
    const invite = currentData || incoming;
    if (invite.ownerId === user.uid || invite.targetUid === user.uid || invite.acceptedBy === user.uid) return;
    throw new Error("Bạn không có quyền với lời mời này.");
  }

  if (parts[0] === "couples") {
    const existingCouple = index.get(`couples/${parts[1]}`);
    const couple = parts.length === 2 && (action === "set" || action === "create") && !currentData ? incoming : existingCouple?.data;
    if (couple && Array.isArray(couple.memberIds) && couple.memberIds.includes(user.uid)) return;
    throw new Error("Bạn không thuộc không gian cặp đôi này.");
  }

  throw new Error("Collection không được phép.");
}

function resolveOperations(value: unknown, now: number): unknown {
  if (Array.isArray(value)) return value.map((item) => resolveOperations(item, now));
  if (!value || typeof value !== "object") return value;
  const record = value as JsonRecord;
  if (record.__op === "serverTimestamp") return { __type: "timestamp", value: now };
  if (record.__type === "timestamp") return { __type: "timestamp", value: Number(record.value) };
  if (record.__op === "arrayUnion") return { __op: "arrayUnion", values: (Array.isArray(record.values) ? record.values : []).map((item) => resolveOperations(item, now)) };
  return Object.fromEntries(Object.entries(record)
    .filter(([key]) => !["__proto__", "constructor", "prototype"].includes(key))
    .map(([key, item]) => [key, resolveOperations(item, now)]));
}

function mergeFields(base: JsonRecord, patch: JsonRecord) {
  const output = structuredClone(base);
  for (const [path, raw] of Object.entries(patch)) {
    const operation = raw && typeof raw === "object" ? raw as JsonRecord : null;
    const current = getField(output, path);
    const value = operation?.__op === "arrayUnion"
      ? Array.from(new Map([...(Array.isArray(current) ? current : []), ...(Array.isArray(operation.values) ? operation.values : [])].map((item) => [JSON.stringify(item), item])).values())
      : raw;
    setField(output, path, value);
  }
  return output;
}

function sortable(value: unknown) {
  if (value && typeof value === "object" && (value as JsonRecord).__type === "timestamp") return Number((value as JsonRecord).value) || 0;
  return value === undefined || value === null ? "" : value;
}

function compareValues(left: unknown, right: unknown) {
  const a = sortable(left);
  const b = sortable(right);
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}

async function readOne(pathValue: unknown, user: DatabaseUser, records: StoredRecord[]) {
  const path = validateDocumentPath(pathValue);
  const index = indexRecords(records);
  const record = index.get(path) || null;
  authorize(user, path, "read", record?.data || null, index, {});
  return { id: path.split("/").pop() || "", data: record ? visibleData(path, record.data, user) : null, version: record?.updatedAt || 0 };
}

async function readList(pathValue: unknown, constraintsValue: unknown, user: DatabaseUser, records: StoredRecord[]) {
  const path = validateCollectionPath(pathValue);
  const index = indexRecords(records);
  const prefix = `${path}/`;
  let matches = records.filter((record) => {
    const relative = record.path.startsWith(prefix) ? record.path.slice(prefix.length) : "";
    if (!relative || relative.includes("/")) return false;
    try { authorize(user, record.path, "read", record.data, index, {}); return true; } catch { return false; }
  });
  const constraints = Array.isArray(constraintsValue) ? (constraintsValue as Constraint[]).slice(0, 10) : [];
  for (const constraint of constraints.filter((item) => item?.kind === "where" && item.operator === "==")) {
    matches = matches.filter((record) => JSON.stringify(getField(record.data, String(constraint.field || ""))) === JSON.stringify(constraint.value));
  }
  const ordering = constraints.find((item) => item?.kind === "orderBy");
  if (ordering) matches.sort((left, right) => compareValues(getField(left.data, String(ordering.field || "")), getField(right.data, String(ordering.field || ""))) * (ordering.direction === "desc" ? -1 : 1));
  const limiter = constraints.find((item) => item?.kind === "limit");
  if (limiter) matches = matches.slice(0, Math.min(500, Math.max(0, Number(limiter.count) || 0)));
  return matches.map((record) => ({ id: record.path.split("/").pop() || "", data: visibleData(record.path, record.data, user), version: record.updatedAt }));
}

async function commit(operationsValue: unknown, user: DatabaseUser, records: StoredRecord[]) {
  if (!Array.isArray(operationsValue) || operationsValue.length === 0) throw new Error("Không có thao tác để ghi.");
  if (operationsValue.length > MAX_BATCH_SIZE) throw new Error(`Một lần chỉ được ghi tối đa ${MAX_BATCH_SIZE} bản ghi.`);
  const operations = operationsValue as WriteOperation[];
  const index = indexRecords(records);
  const changes = new Map<string, StoredRecord | null>();

  for (const operation of operations) {
    if (!operation || typeof operation !== "object") throw new Error("Thao tác ghi không hợp lệ.");
    const path = validateDocumentPath(operation.path);
    if (!["set", "create", "update", "delete"].includes(operation.type)) throw new Error("Kiểu ghi không hợp lệ.");
    const existing = index.get(path) || null;
    authorize(user, path, operation.type, existing?.data || null, index, operation.data || {});
    if (operation.type === "create" && existing) throw new Error(`Bản ghi đã tồn tại: ${path}`);
    if (operation.type === "update" && !existing) throw new Error(`Bản ghi không tồn tại: ${path}`);
    if (operation.type === "delete") {
      index.delete(path);
      changes.set(path, null);
      continue;
    }
    const now = Date.now();
    const incoming = resolveOperations(operation.data || {}, now) as JsonRecord;
    const data = operation.type === "update" || operation.merge ? mergeFields(existing?.data || {}, incoming) : incoming;
    const next = { path, data, createdAt: existing?.createdAt || now, updatedAt: now };
    index.set(path, next);
    changes.set(path, next);
  }

  const sql = sqlClient();
  const queries = Array.from(changes.entries()).map(([path, record]) => record
    ? sql.query(
        "INSERT INTO love_days_records (path, data, created_at, updated_at) VALUES ($1, $2::jsonb, $3, $4) ON CONFLICT (path) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at",
        [path, JSON.stringify(record.data), record.createdAt, record.updatedAt],
      )
    : sql.query("DELETE FROM love_days_records WHERE path = $1", [path]));
  if (queries.length) await sql.transaction(queries);
  return { written: operations.length };
}

export async function executeDatabaseAction(body: JsonRecord, user: DatabaseUser) {
  const action = String(body.action || "");
  const records = await loadRecords();
  if (action === "get") return readOne(body.path, user, records);
  if (action === "list") return readList(body.path, body.constraints, user, records);
  if (action === "write") return commit([body.operation], user, records);
  if (action === "batch") return commit(body.operations, user, records);
  if (action === "collectionGroup") {
    if (!user.admin) throw new Error("Chỉ server được đọc collection group.");
    const name = String(body.name || "");
    if (!name || name.includes("/")) throw new Error("Tên collection không hợp lệ.");
    const marker = `/${name}/`;
    return records.filter((record) => record.path.includes(marker)).map((record) => ({ id: record.path.split("/").pop() || "", path: record.path, data: record.data, version: record.updatedAt }));
  }
  if (action === "exportCouple") {
    const coupleId = String(body.coupleId || "");
    if (!coupleId || coupleId.includes("/")) throw new Error("Couple ID không hợp lệ.");
    const couplePath = `couples/${coupleId}`;
    const index = indexRecords(records);
    const couple = index.get(couplePath) || null;
    authorize(user, couplePath, "read", couple?.data || null, index, {});
    const data: Record<string, DatabaseRecord[]> = {};
    const prefix = `${couplePath}/`;
    for (const record of records) {
      if (!record.path.startsWith(prefix)) continue;
      const relative = record.path.slice(prefix.length).split("/");
      if (relative.length !== 2) continue;
      (data[relative[0]] ||= []).push({ id: relative[1], data: visibleData(record.path, record.data, user), version: record.updatedAt });
    }
    return { coupleId, exportedAt: Date.now(), data };
  }
  throw new Error(`Action không được hỗ trợ: ${action}`);
}
