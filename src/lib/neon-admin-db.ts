import "server-only";

import { executeDatabaseAction, type DatabaseRecord, type JsonRecord } from "@/lib/neon-database";

const admin = { uid: "server", admin: true } as const;

export type NeonRecord<T = JsonRecord> = DatabaseRecord<T>;

export function adminGet<T = JsonRecord>(path: string) {
  return executeDatabaseAction({ action: "get", path }, admin) as Promise<NeonRecord<T> & { data: T | null }>;
}

export function adminList<T = JsonRecord>(path: string, constraints: JsonRecord[] = []) {
  return executeDatabaseAction({ action: "list", path, constraints }, admin) as Promise<Array<NeonRecord<T>>>;
}

export function adminCollectionGroup<T = JsonRecord>(name: string) {
  return executeDatabaseAction({ action: "collectionGroup", name }, admin) as Promise<Array<NeonRecord<T>>>;
}

export function adminWrite(operation: JsonRecord) {
  return executeDatabaseAction({ action: "write", operation }, admin) as Promise<{ written: number }>;
}

export function adminBatch(operations: JsonRecord[]) {
  return executeDatabaseAction({ action: "batch", operations }, admin) as Promise<{ written: number }>;
}

export const adminServerTimestamp = () => ({ __op: "serverTimestamp" });
