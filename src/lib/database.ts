"use client";

import { auth } from "@/lib/firebase";

type JsonRecord = Record<string, unknown>;
// Firestore's DocumentData is intentionally permissive; this compatibility
// surface keeps the existing typed model casts intact over Sheets JSON.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DocumentData = Record<string, any>;
interface DatabaseError extends Error { code: string }
type Constraint =
  | { kind: "where"; field: string; operator: "=="; value: unknown }
  | { kind: "orderBy"; field: string; direction: "asc" | "desc" }
  | { kind: "limit"; count: number };

interface Reference {
  __databaseReference: true;
  path: string;
  id: string;
  constraints?: Constraint[];
}

interface WriteOperation {
  type: "set" | "update" | "delete";
  path: string;
  data?: JsonRecord;
  merge?: boolean;
}

export interface DatabaseMarker { readonly __googleSheetsDatabase: true }

export class Timestamp {
  readonly seconds: number;
  readonly nanoseconds: number;

  constructor(seconds: number, nanoseconds = 0) {
    this.seconds = seconds;
    this.nanoseconds = nanoseconds;
  }

  static fromDate(date: Date) {
    const milliseconds = date.getTime();
    return new Timestamp(Math.floor(milliseconds / 1000), (milliseconds % 1000) * 1_000_000);
  }

  static now() {
    return Timestamp.fromDate(new Date());
  }

  toDate() {
    return new Date(this.seconds * 1000 + this.nanoseconds / 1_000_000);
  }

  toMillis() {
    return this.toDate().getTime();
  }
}

class DocumentSnapshot<T = DocumentData> {
  constructor(readonly id: string, private readonly value: T | null, readonly version?: number) {}
  readonly docs: Array<DocumentSnapshot<T>> = [];
  exists() { return this.value !== null; }
  data(): T { return this.value as T; }
  get(field: string) { return getNested(this.value as unknown, field); }
  docChanges() { return [] as Array<{ type: "added"; doc: DocumentSnapshot<T> }>; }
}

class QuerySnapshot<T = DocumentData> {
  readonly id = "";
  constructor(readonly docs: Array<DocumentSnapshot<T>>) {}
  get empty() { return this.docs.length === 0; }
  get size() { return this.docs.length; }
  exists() { return !this.empty; }
  data(): T { return undefined as T; }
  docChanges() { return this.docs.map((doc) => ({ type: "added" as const, doc })); }
}

type SnapshotView<T> = DocumentSnapshot<T> | QuerySnapshot<T>;

const endpoint = "/api/database";
const inflightReads = new Map<string, Promise<unknown>>();
// Reuse the last successful value when a listener is recreated after an auth
// transition. A network refresh still starts immediately in the background.
const snapshotCache = new Map<string, SnapshotView<DocumentData>>();

function isReference(value: unknown): value is Reference {
  return Boolean(value && typeof value === "object" && (value as Reference).__databaseReference);
}

function makeReference(path: string, constraints?: Constraint[]): Reference {
  const normalized = path.replace(/^\/+|\/+$/g, "");
  return { __databaseReference: true, path: normalized, id: normalized.split("/").pop() || "", constraints };
}

function referencePath(first: unknown, rest: string[]) {
  if (isReference(first)) return [first.path, ...rest].filter(Boolean).join("/");
  return rest.filter(Boolean).join("/");
}

function randomId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().replace(/-/g, "")
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}

function getNested(value: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as JsonRecord)[key];
  }, value);
}

function serialize(value: unknown): unknown {
  if (value instanceof Timestamp) return { __type: "timestamp", value: value.toMillis() };
  if (value instanceof Date) return { __type: "timestamp", value: value.getTime() };
  if (Array.isArray(value)) return value.map(serialize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as JsonRecord).map(([key, item]) => [key, serialize(item)]));
  }
  return value;
}

function hydrate(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(hydrate);
  if (value && typeof value === "object") {
    const record = value as JsonRecord;
    if (record.__type === "timestamp" && typeof record.value === "number") {
      return Timestamp.fromDate(new Date(record.value));
    }
    return Object.fromEntries(Object.entries(record).map(([key, item]) => [key, hydrate(item)]));
  }
  return value;
}

async function requestDirect<T>(action: string, payload: JsonRecord = {}): Promise<T> {
  const user = auth?.currentUser;
  if (!user) throw new Error("Bạn cần đăng nhập lại.");
  const token = await Promise.race([
    user.getIdToken(),
    new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error("Phiên đăng nhập phản hồi quá lâu. Hãy mở lại ứng dụng.")), 8_000)),
  ]);
  const body = JSON.stringify({ action, token, ...(serialize(payload) as JsonRecord) });
  const safeToRetry = action === "get" || action === "list" || action === "exportCouple";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        cache: "no-store",
        credentials: "same-origin",
        signal: AbortSignal.timeout(attempt === 0 ? 10_000 : 15_000),
      });
      const result = await response.json() as { ok?: boolean; data?: T; error?: string };
      if (!response.ok || !result.ok) throw new Error(result.error || `Máy chủ dữ liệu lỗi ${response.status}.`);
      if (!("data" in result)) throw new Error("Máy chủ dữ liệu trả về thiếu nội dung.");
      return hydrate(result.data) as T;
    } catch (caught) {
      const retryable = !(caught instanceof Error) || /abort|timed?\s*out|fetch|network|kết nối/i.test(caught.message);
      if (safeToRetry && retryable && attempt === 0 && navigator.onLine) {
        await new Promise((resolve) => window.setTimeout(resolve, 500));
        continue;
      }
      if (!retryable && caught instanceof Error) throw caught;
      const timedOut = caught instanceof Error && (caught.name === "TimeoutError" || caught.name === "AbortError" || /abort|timed?\s*out/i.test(caught.message));
      throw new Error(timedOut
        ? "Kết nối máy chủ dữ liệu quá thời gian. Ứng dụng sẽ tự thử lại."
        : navigator.onLine
          ? "Không thể kết nối máy chủ dữ liệu. Ứng dụng sẽ tự thử lại."
          : "Thiết bị đang mất mạng. Dữ liệu sẽ tự đồng bộ khi có kết nối lại.");
    }
  }
  throw new Error("Không thể kết nối máy chủ dữ liệu.");
}

async function request<T>(action: string, payload: JsonRecord = {}): Promise<T> {
  if (action !== "get" && action !== "list" && action !== "exportCouple") return requestDirect<T>(action, payload);
  const key = `${action}:${JSON.stringify(serialize(payload))}`;
  const existing = inflightReads.get(key);
  if (existing) return existing as Promise<T>;
  const pending = requestDirect<T>(action, payload);
  inflightReads.set(key, pending);
  try { return await pending; } finally { inflightReads.delete(key); }
}

export function collection(first: unknown, ...segments: string[]) {
  return makeReference(referencePath(first, segments));
}

export function doc(first: unknown, ...segments: string[]) {
  const path = referencePath(first, segments);
  return makeReference(isReference(first) && segments.length === 0 ? `${path}/${randomId()}` : path);
}

export function where(field: string, operator: "==", value: unknown): Constraint {
  return { kind: "where", field, operator, value };
}

export function orderBy(field: string, direction: "asc" | "desc" = "asc"): Constraint {
  return { kind: "orderBy", field, direction };
}

export function limit(count: number): Constraint {
  return { kind: "limit", count };
}

export function query(reference: Reference, ...constraints: Constraint[]) {
  return makeReference(reference.path, constraints);
}

export function serverTimestamp() {
  return { __op: "serverTimestamp" };
}

export function arrayUnion(...values: unknown[]) {
  return { __op: "arrayUnion", values };
}

export async function getDoc<T = DocumentData>(reference: Reference) {
  const result = await request<{ id: string; data: T | null; version?: number }>("get", { path: reference.path });
  return new DocumentSnapshot<T>(result.id, result.data, result.version);
}

export async function getDocs<T = DocumentData>(reference: Reference) {
  const result = await request<Array<{ id: string; data: T; version?: number }>>("list", {
    path: reference.path,
    constraints: reference.constraints || [],
  });
  return new QuerySnapshot(result.map((item) => new DocumentSnapshot<T>(item.id, item.data, item.version)));
}

export async function setDoc(reference: Reference, data: object, options?: { merge?: boolean }) {
  await request("write", { operation: { type: "set", path: reference.path, data: data as JsonRecord, merge: Boolean(options?.merge) } });
}

export async function updateDoc(reference: Reference, data: object) {
  await request("write", { operation: { type: "update", path: reference.path, data: data as JsonRecord } });
}

export async function deleteDoc(reference: Reference) {
  await request("write", { operation: { type: "delete", path: reference.path } });
}

export async function addDoc(reference: Reference, data: object) {
  const target = makeReference(`${reference.path}/${randomId()}`);
  await setDoc(target, data);
  return target;
}

export async function exportCouple(coupleId: string) {
  return request<{ coupleId: string; exportedAt: number; data: Record<string, Array<{ id: string; data: DocumentData; version?: number }>> }>("exportCouple", { coupleId });
}

export function onSnapshot<T = DocumentData>(
  reference: Reference,
  onNext: (snapshot: SnapshotView<T>) => void,
  onError?: (error: DatabaseError) => void,
) {
  let active = true;
  let running = false;
  let lastPayload = "";
  let retryTimer: number | undefined;
  let retryDelay = 1_500;
  const isDocument = reference.path.split("/").length % 2 === 0;
  const cacheKey = `${auth?.currentUser?.uid || "anonymous"}:${reference.path}:${JSON.stringify(reference.constraints || [])}`;
  const cached = snapshotCache.get(cacheKey) as SnapshotView<T> | undefined;

  if (cached) {
    lastPayload = JSON.stringify(cached instanceof DocumentSnapshot ? cached.data() : cached.docs.map((item) => [item.id, item.data()]));
    onNext(cached);
  }

  const refresh = async () => {
    if (!active || running) return;
    running = true;
    try {
      const snapshot = isDocument ? await getDoc<T>(reference) : await getDocs<T>(reference);
      // A request can finish after the owning React effect was cleaned up. Do not
      // allow that stale response to overwrite a newer sign-in session.
      if (!active) return;
      snapshotCache.set(cacheKey, snapshot as SnapshotView<DocumentData>);
      retryDelay = 1_500;
      const payload = JSON.stringify(snapshot instanceof DocumentSnapshot ? snapshot.data() : snapshot.docs.map((item) => [item.id, item.data()]));
      if (payload !== lastPayload) {
        lastPayload = payload;
        onNext(snapshot);
      }
    } catch (caught) {
      if (!active) return;
      const error = (caught instanceof Error ? caught : new Error("Không thể đồng bộ Neon.")) as DatabaseError;
      if (!error.code) error.code = "apps-script/unavailable";
      onError?.(error);
      window.clearTimeout(retryTimer);
      retryTimer = window.setTimeout(() => void refresh(), retryDelay);
      retryDelay = Math.min(retryDelay * 2, 10_000);
    } finally {
      running = false;
    }
  };

  void refresh();
  let timer: number | undefined;
  const foregroundDelay = /\/(locketPosts|replies|messages)(\/|$)/.test(reference.path) ? 3_000 : 10_000;
  const schedule = () => {
    if (!active) return;
    window.clearTimeout(timer);
    timer = window.setTimeout(async () => { await refresh(); schedule(); }, document.hidden ? 60_000 : foregroundDelay);
  };
  const resume = () => { if (!document.hidden) void refresh(); };
  schedule();
  window.addEventListener("focus", resume);
  window.addEventListener("online", resume);
  document.addEventListener("visibilitychange", resume);
  return () => {
    active = false;
    window.clearTimeout(timer);
    window.clearTimeout(retryTimer);
    window.removeEventListener("focus", resume);
    window.removeEventListener("online", resume);
    document.removeEventListener("visibilitychange", resume);
  };
}

export async function runTransaction<T>(
  _database: unknown,
  executor: (transaction: {
    get: <D = DocumentData>(reference: Reference) => Promise<DocumentSnapshot<D>>;
    set: (reference: Reference, data: JsonRecord, options?: { merge?: boolean }) => void;
    update: (reference: Reference, data: JsonRecord) => void;
    delete: (reference: Reference) => void;
  }) => Promise<T>,
) {
  const operations: WriteOperation[] = [];
  const transaction = {
    get: <D = DocumentData>(reference: Reference) => getDoc<D>(reference),
    set: (reference: Reference, data: JsonRecord, options?: { merge?: boolean }) => operations.push({ type: "set", path: reference.path, data, merge: options?.merge }),
    update: (reference: Reference, data: JsonRecord) => operations.push({ type: "update", path: reference.path, data }),
    delete: (reference: Reference) => operations.push({ type: "delete", path: reference.path }),
  };
  const result = await executor(transaction);
  if (operations.length > 0) await request("batch", { operations });
  return result;
}
