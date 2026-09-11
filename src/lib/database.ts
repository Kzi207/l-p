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

const endpoint = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL?.trim() || "";
const inflightReads = new Map<string, Promise<unknown>>();

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
  if (!endpoint) throw new Error("Thiếu NEXT_PUBLIC_APPS_SCRIPT_URL.");
  const user = auth?.currentUser;
  if (!user) throw new Error("Bạn cần đăng nhập lại.");
  const token = await Promise.race([
    user.getIdToken(),
    new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error("Phiên đăng nhập phản hồi quá lâu. Hãy mở lại ứng dụng.")), 8_000)),
  ]);
  const body = JSON.stringify({ action, token, ...(serialize(payload) as JsonRecord) });
  let response: Response | null = null;
  let text = "";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const separator = endpoint.includes("?") ? "&" : "?";
    response = await fetch(`${endpoint}${separator}_=${Date.now()}`, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body,
      cache: "no-store",
      credentials: "omit",
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
    });
    text = await response.text();
    if (!text.trimStart().startsWith("<") || attempt === 1) break;
    await new Promise((resolve) => window.setTimeout(resolve, 450));
  }
  if (!response) throw new Error("Không thể kết nối Apps Script.");
  let result: { ok?: boolean; data?: T; error?: string };
  try {
    result = JSON.parse(text) as typeof result;
  } catch {
    const html = text.trimStart().startsWith("<");
    const loginPage = html && /accounts\.google\.com|servicelogin|sign in/i.test(text);
    throw new Error(loginPage ? "Apps Script đang yêu cầu đăng nhập Google. Hãy deploy Web App với quyền truy cập Anyone." : html ? "Apps Script tạm trả về trang HTML sau 2 lần thử. Hãy đóng hẳn PWA rồi mở lại." : "Apps Script trả dữ liệu không hợp lệ.");
  }
  if (!response.ok || !result.ok) throw new Error(result.error || `Apps Script lỗi ${response.status}.`);
  if (!("data" in result)) {
    throw new Error("Apps Script đang chạy Code.gs cũ hoặc sai deployment. Hãy tạo New version và deploy lại URL /exec.");
  }
  return hydrate(result.data) as T;
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
  const isDocument = reference.path.split("/").length % 2 === 0;

  const refresh = async () => {
    if (!active || running) return;
    running = true;
    try {
      const snapshot = isDocument ? await getDoc<T>(reference) : await getDocs<T>(reference);
      const payload = JSON.stringify(snapshot instanceof DocumentSnapshot ? snapshot.data() : snapshot.docs.map((item) => [item.id, item.data()]));
      if (payload !== lastPayload) {
        lastPayload = payload;
        onNext(snapshot);
      }
    } catch (caught) {
      const error = (caught instanceof Error ? caught : new Error("Không thể đồng bộ Google Sheets.")) as DatabaseError;
      if (!error.code) error.code = "apps-script/unavailable";
      onError?.(error);
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
