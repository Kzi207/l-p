import "server-only";

import path from "node:path";
import fs from "node:fs";
import * as LocketSDK from "locket.js";
import { adminGet, adminWrite } from "@/lib/neon-admin-db";
import type { LocketAccountInfo, UserDocument } from "@/types/firestore";

/* eslint-disable @typescript-eslint/no-explicit-any */

export function getLocketSDK() {
  return LocketSDK;
}

export interface VerifiedLocketAccount {
  uid: string;
  email: string;
  displayName: string;
  avatarUrl: string;
  idToken: string;
  refreshToken: string;
  expiresAt: number;
  device: Record<string, unknown>;
  password?: string;
}

/**
 * Xác thực thông tin tài khoản Locket trực tiếp với máy chủ Locket / Firebase Identity Toolkit
 */
export async function verifyLocketCredentials(email: string, password: string): Promise<VerifiedLocketAccount> {
  const { LocketClient } = getLocketSDK();
  const client = new LocketClient({ sessionPath: null, autoEmulate: true });

  let authData;
  try {
    authData = await client.login(email.trim(), password);
  } catch (error) {
    if (!(error instanceof LocketSDK.AuthenticationError)) throw error;
    const message = error.message;
    if (/INVALID_LOGIN_CREDENTIALS|INVALID_PASSWORD|EMAIL_NOT_FOUND|INVALID_EMAIL/.test(message)) {
      throw new Error("Email hoặc mật khẩu Locket không đúng.");
    }
    if (/TOO_MANY_ATTEMPTS/.test(message)) {
      throw new Error("Bạn đã thử đăng nhập quá nhiều lần. Vui lòng đợi rồi thử lại.");
    }
    if (/USER_DISABLED/.test(message)) {
      throw new Error("Tài khoản Locket đã bị vô hiệu hóa.");
    }
    throw new Error("Không thể kết nối để đăng nhập Locket. Vui lòng thử lại sau.");
  }
  if (!client.session.uid || !client.session.idToken || !client.session.refreshToken) {
    throw new Error("Locket không trả về phiên đăng nhập hợp lệ. Vui lòng thử lại.");
  }
  let profileName = "";
  let avatarUrl = "";

  try {
    const profile = await client.user.getProfile();
    profileName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() || profile?.name || "";
    avatarUrl = profile?.profile_picture_url || "";
  } catch (err) {
    console.warn("Could not fetch user profile details after login:", err);
  }

  const deviceData = client.device && typeof client.device.toDict === "function" ? client.device.toDict() : {};

  return {
    uid: client.session.uid || authData.localId,
    email: client.session.email || email.trim(),
    displayName: profileName || email.trim().split("@")[0],
    avatarUrl,
    idToken: client.session.idToken || authData.idToken,
    refreshToken: client.session.refreshToken || authData.refreshToken,
    expiresAt: client.session.expiresAt || (Date.now() + 3600 * 1000),
    device: deviceData,
    password
  };
}

/**
 * Khởi tạo LocketClient cho một người dùng đã lưu liên kết trong Database Neon
 */
export async function getLocketClientForUser(userId: string): Promise<any> {
  const { LocketClient, DeviceProfile } = getLocketSDK();
  const userRec = await adminGet<UserDocument>(`users/${userId}`);
  const userDoc = userRec?.data;

  if (!userDoc || !userDoc.locketAccount) {
    throw new Error("Tài khoản chưa được liên kết với Locket. Vui lòng kết nối tài khoản Locket.");
  }

  const locketAcc = userDoc.locketAccount;
  const client = new LocketClient({ sessionPath: null, autoEmulate: false });

  if (locketAcc.device) {
    try {
      client.device = DeviceProfile.fromDict(locketAcc.device);
      client.session.device = client.device;
    } catch {
      client.setDevice({ autoEmulate: true });
    }
  }

  client.session.uid = locketAcc.uid;
  client.session.email = locketAcc.email;
  client.session.idToken = locketAcc.idToken || null;
  client.session.refreshToken = locketAcc.refreshToken || null;
  client.session.expiresAt = locketAcc.expiresAt || 0;

  // Tự động kiểm tra hạn token và refresh nếu sắp hết hạn
  const now = Date.now();
  let needsUpdate = false;

  if (!client.session.idToken || now >= (client.session.expiresAt - 60000)) {
    try {
      if (client.session.refreshToken) {
        await client.session.refresh();
        needsUpdate = true;
      } else if (locketAcc.password) {
        await client.login(locketAcc.email, locketAcc.password);
        needsUpdate = true;
      }
    } catch (refreshErr) {
      console.warn("Locket token refresh failed, retrying with password:", refreshErr);
      if (locketAcc.password) {
        await client.login(locketAcc.email, locketAcc.password);
        needsUpdate = true;
      } else {
        throw new Error("Phiên Locket đã hết hạn và không thể tự gia hạn. Vui lòng kết nối lại tài khoản.");
      }
    }
  }

  if (needsUpdate) {
    const updatedAccount: LocketAccountInfo = {
      ...locketAcc,
      idToken: client.session.idToken || undefined,
      refreshToken: client.session.refreshToken || undefined,
      expiresAt: client.session.expiresAt,
      device: client.device.toDict()
    };
    try {
      await adminWrite({
        type: "update",
        path: `users/${userId}`,
        data: { locketAccount: updatedAccount }
      });
    } catch (saveErr) {
      console.error("Failed to update refreshed Locket token in DB:", saveErr);
    }
  }

  return client;
}

/**
 * Lưu liên kết tài khoản Locket vào Document người dùng trong Neon DB
 */
export async function linkUserLocket(userId: string, email: string, password: string): Promise<LocketAccountInfo> {
  const verified = await verifyLocketCredentials(email, password);

  const locketInfo: LocketAccountInfo = {
    email: verified.email,
    password: verified.password,
    uid: verified.uid,
    displayName: verified.displayName,
    avatarUrl: verified.avatarUrl,
    linkedAt: Date.now(),
    idToken: verified.idToken,
    refreshToken: verified.refreshToken,
    expiresAt: verified.expiresAt,
    device: verified.device
  };

  await adminWrite({
    type: "update",
    path: `users/${userId}`,
    data: { locketAccount: locketInfo }
  });

  return locketInfo;
}

/**
 * Hủy liên kết Locket cho người dùng
 */
export async function unlinkUserLocket(userId: string): Promise<void> {
  await adminWrite({
    type: "update",
    path: `users/${userId}`,
    data: { locketAccount: null }
  });
}

/**
 * Lấy danh sách preset caption đầy đủ từ caption_presets.json
 */
export function getCaptionPresets() {
  const presetFile = path.join(path.dirname(require.resolve("locket.js")), "caption_presets.json");
  if (!fs.existsSync(presetFile)) return { presets: {}, categorized: [] };

  try {
    const raw = fs.readFileSync(presetFile, "utf-8");
    const presets: Record<string, any> = JSON.parse(raw);

    const categoriesMap: Record<string, Array<{ id: string; [key: string]: any }>> = {};

    for (const [key, item] of Object.entries(presets)) {
      const section = item.section || "Khác";
      if (!categoriesMap[section]) categoriesMap[section] = [];
      categoriesMap[section].push({ id: key, ...item });
    }

    const categorized = Object.entries(categoriesMap).map(([category, items]) => ({
      category,
      items
    }));

    return { presets, categorized };
  } catch (err) {
    console.error("Error reading caption_presets.json:", err);
    return { presets: {}, categorized: [] };
  }
}
