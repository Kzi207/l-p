import "server-only";

type JsonRecord = Record<string, unknown>;

export interface AppsScriptRecord<T = JsonRecord> {
  id: string;
  path?: string;
  data: T;
  version?: number;
}

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Thiếu biến môi trường ${name}.`);
  return value;
}

async function adminRequest<T>(action: string, payload: JsonRecord = {}): Promise<T> {
  const endpoint = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL?.trim();
  if (!endpoint) throw new Error("Thiếu NEXT_PUBLIC_APPS_SCRIPT_URL.");
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, secret: required("SERVER_SECRET"), ...payload }),
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  const text = await response.text();
  let result: { ok?: boolean; data?: T; error?: string };
  try {
    result = JSON.parse(text) as typeof result;
  } catch {
    throw new Error("Apps Script server trả về dữ liệu không hợp lệ.");
  }
  if (!response.ok || !result.ok) throw new Error(result.error || `Apps Script lỗi ${response.status}.`);
  if (!("data" in result)) throw new Error("Apps Script đang chạy Code.gs cũ hoặc sai deployment.");
  return result.data as T;
}

export function adminGet<T = JsonRecord>(path: string) {
  return adminRequest<AppsScriptRecord<T> & { data: T | null }>("get", { path });
}

export function adminList<T = JsonRecord>(path: string, constraints: JsonRecord[] = []) {
  return adminRequest<Array<AppsScriptRecord<T>>>("list", { path, constraints });
}

export function adminCollectionGroup<T = JsonRecord>(name: string) {
  return adminRequest<Array<AppsScriptRecord<T>>>("collectionGroup", { name });
}

export function adminWrite(operation: JsonRecord) {
  return adminRequest<{ written: number }>("write", { operation });
}

export function adminBatch(operations: JsonRecord[]) {
  return adminRequest<{ written: number }>("batch", { operations });
}

export const adminServerTimestamp = () => ({ __op: "serverTimestamp" });
