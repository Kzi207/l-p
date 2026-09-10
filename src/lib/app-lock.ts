export const LOCK_CONFIG_KEY = "love-days-lock-config";

export interface AppLockConfig { pinHash?: string; credentialId?: string; enabled: boolean }

export function getLockConfig(): AppLockConfig {
  if (typeof window === "undefined") return { enabled: false };
  try { return JSON.parse(localStorage.getItem(LOCK_CONFIG_KEY) || "{}") as AppLockConfig; } catch { return { enabled: false }; }
}

export function saveLockConfig(config: AppLockConfig) { localStorage.setItem(LOCK_CONFIG_KEY, JSON.stringify(config)); window.dispatchEvent(new Event("love-days-lock-change")); }

export async function hashPin(pin: string) {
  const bytes = new TextEncoder().encode(`love-days:${pin}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function bytesToBase64Url(bytes: Uint8Array) { return btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join("")).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", ""); }
export function base64UrlToBytes(value: string) { const base64 = value.replaceAll("-", "+").replaceAll("_", "/"); const binary = atob(base64); return Uint8Array.from(binary, (char) => char.charCodeAt(0)); }
