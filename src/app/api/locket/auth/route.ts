import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/verifyAuthToken";
import { getAdminAuth } from "@/lib/firebaseAdmin";
import { adminGet, adminWrite } from "@/lib/neon-admin-db";
import { linkUserLocket, unlinkUserLocket, verifyLocketCredentials } from "@/lib/locket/locket-service";
import type { UserDocument } from "@/types/firestore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body.action || "status";

    // 1. Đăng nhập trực tiếp bằng tài khoản Locket
    if (action === "login") {
      const { email, password } = body;
      if (typeof email !== "string" || !email.trim() || typeof password !== "string" || !password) {
        return NextResponse.json({ ok: false, error: "Vui lòng nhập đầy đủ email và mật khẩu Locket." }, { status: 400 });
      }

      // Fail before contacting Locket or writing account data if token signing is unavailable.
      let adminAuth;
      try {
        adminAuth = getAdminAuth();
      } catch {
        return NextResponse.json({
          ok: false,
          error: "Máy chủ chưa cấu hình Firebase Admin để đăng nhập Locket. Hãy cấu hình FIREBASE_ADMIN_SA_BASE64 hoặc serviceAccountKey.json của cùng Firebase project với ứng dụng.",
        }, { status: 503 });
      }

      const verified = await verifyLocketCredentials(email, password);
      const appUid = `locket_${verified.uid}`;
      // email is a reserved Firebase token claim and cannot be an additional claim.
      const customToken = await adminAuth.createCustomToken(appUid, { isLocket: true });

      // Kiểm tra hoặc tạo document user trong Neon
      const existingUser = await adminGet<UserDocument>(`users/${appUid}`);
      if (!existingUser?.data) {
        await adminWrite({
          type: "set",
          path: `users/${appUid}`,
          data: {
            displayName: verified.displayName || email.split("@")[0],
            email: verified.email,
            photoURL: verified.avatarUrl || "",
            locketAccount: {
              email: verified.email,
              password: verified.password,
              uid: verified.uid,
              displayName: verified.displayName,
              avatarUrl: verified.avatarUrl,
              linkedAt: Date.now(),
              idToken: verified.idToken,
              refreshToken: verified.refreshToken,
              expiresAt: verified.expiresAt,
              device: verified.device,
            }
          }
        });
      } else {
        await adminWrite({
          type: "update",
          path: `users/${appUid}`,
          data: {
            locketAccount: {
              email: verified.email,
              password: verified.password,
              uid: verified.uid,
              displayName: verified.displayName,
              avatarUrl: verified.avatarUrl,
              linkedAt: Date.now(),
              idToken: verified.idToken,
              refreshToken: verified.refreshToken,
              expiresAt: verified.expiresAt,
              device: verified.device,
            }
          }
        });
      }

      return NextResponse.json({
        ok: true,
        userUid: appUid,
        customToken,
        locketAccount: {
          uid: verified.uid,
          email: verified.email,
          displayName: verified.displayName,
          avatarUrl: verified.avatarUrl,
        }
      });
    }

    // Các action còn lại yêu cầu user đã đăng nhập vào hệ thống (Google hoặc Locket)
    let user;
    try {
      user = await verifyAuthToken(request);
    } catch {
      return NextResponse.json({ ok: false, error: "Bạn chưa đăng nhập." }, { status: 401 });
    }

    // 2. Liên kết tài khoản Locket vào tài khoản hiện tại (Google login)
    if (action === "link") {
      const { email, password } = body;
      if (typeof email !== "string" || !email.trim() || typeof password !== "string" || !password) {
        return NextResponse.json({ ok: false, error: "Vui lòng nhập email và mật khẩu Locket." }, { status: 400 });
      }

      const locketInfo = await linkUserLocket(user.uid, email, password);
      return NextResponse.json({
        ok: true,
        message: "Liên kết tài khoản Locket thành công!",
        locketAccount: {
          uid: locketInfo.uid,
          email: locketInfo.email,
          displayName: locketInfo.displayName,
          avatarUrl: locketInfo.avatarUrl,
          linkedAt: locketInfo.linkedAt,
        }
      });
    }

    // 3. Kiểm tra trạng thái liên kết
    if (action === "status") {
      const userRec = await adminGet<UserDocument>(`users/${user.uid}`);
      const locketAcc = userRec?.data?.locketAccount;

      if (!locketAcc) {
        return NextResponse.json({ ok: true, linked: false });
      }

      return NextResponse.json({
        ok: true,
        linked: true,
        account: {
          uid: locketAcc.uid,
          email: locketAcc.email,
          displayName: locketAcc.displayName,
          avatarUrl: locketAcc.avatarUrl,
          linkedAt: locketAcc.linkedAt,
        }
      });
    }

    // 4. Hủy liên kết Locket
    if (action === "unlink") {
      await unlinkUserLocket(user.uid);
      return NextResponse.json({ ok: true, message: "Đã ngắt kết nối Locket." });
    }

    return NextResponse.json({ ok: false, error: "Action không hợp lệ." }, { status: 400 });
  } catch (error) {
    console.error("Locket auth route error:", error);
    const message = error instanceof Error ? error.message : "Xử lý xác thực Locket thất bại.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

