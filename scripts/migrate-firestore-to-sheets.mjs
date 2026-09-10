import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import nextEnv from "@next/env";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

// Scripts chạy bằng Node không tự nạp .env như Next.js.
const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd(), true);

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

function encode(value) {
  if (value === null || value === undefined) return value;
  if (typeof value?.toMillis === "function") return { __type: "timestamp", value: value.toMillis() };
  if (Array.isArray(value)) return value.map(encode);
  if (typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encode(item)]));
  return value;
}

function loadServiceAccount() {
  const encoded = process.env.FIREBASE_ADMIN_SA_BASE64?.trim();
  if (encoded) return JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));

  const localPath = resolve(process.cwd(), "serviceAccountKey.json");
  if (existsSync(localPath)) return JSON.parse(readFileSync(localPath, "utf8"));

  throw new Error("Thiếu FIREBASE_ADMIN_SA_BASE64 và không tìm thấy serviceAccountKey.json trong thư mục dự án.");
}

const endpoint = required("NEXT_PUBLIC_APPS_SCRIPT_URL");
const secret = required("SERVER_SECRET");
const account = loadServiceAccount();
const app = getApps()[0] || initializeApp({ credential: cert(account) });
const firestore = getFirestore(app);
const operations = [];

async function walkCollection(collection) {
  const snapshot = await collection.get();
  for (const document of snapshot.docs) {
    operations.push({ type: "set", path: document.ref.path, data: encode(document.data()) });
    const children = await document.ref.listCollections();
    for (const child of children) await walkCollection(child);
  }
}

for (const collection of await firestore.listCollections()) await walkCollection(collection);

for (let index = 0; index < operations.length; index += 20) {
  const batch = operations.slice(index, index + 20);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "batch", secret, operations: batch }),
  });
  const text = await response.text();
  if (text.trim().startsWith("<")) {
    throw new Error("Apps Script đang yêu cầu đăng nhập Google. Hãy deploy Web app với Execute as: Me và Who has access: Anyone, rồi dùng URL /exec.");
  }
  const result = JSON.parse(text);
  if (!result.ok) {
    if (result.error === "Bạn cần đăng nhập lại.") {
      throw new Error("Apps Script chưa nhận server secret. Hãy kiểm tra SERVER_SECRET trong .env.local, Script Property SERVER_SECRET và deploy New version của Code.gs.");
    }
    throw new Error(result.error || "7b446590d2634849a43bd07fe2fb98d81ed53768293146ba844e4384e92bc07f");
  }
  console.log(`Migrated ${Math.min(index + batch.length, operations.length)}/${operations.length}`);
}

console.log(`Done. Migrated ${operations.length} Firestore documents to Google Sheets.`);
