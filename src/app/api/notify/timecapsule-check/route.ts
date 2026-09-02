import { timingSafeEqual } from "crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebaseAdmin";
import { sendPushToUser } from "@/lib/sendPushNotification";

export const runtime = "nodejs";

function validCronSecret(request: Request) {
  const expected = process.env.CRON_SECRET || "";
  const received = request.headers.get("x-cron-secret") || "";
  if (!expected || expected.length !== received.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

/** GitHub Actions gọi route này lúc 08:00 Việt Nam mỗi ngày. */
export async function POST(request: Request) {
  if (!validCronSecret(request)) return NextResponse.json({ error: "Cron secret không hợp lệ." }, { status: 401 });

  try {
    const database = getAdminFirestore();
    const now = new Date();
    // Workflow chạy theo giờ Việt Nam; tạo biên ngày bằng offset +07:00 để không lệch ngày trên Vercel UTC.
    const vietnamDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
    const start = new Date(`${vietnamDate}T00:00:00+07:00`);
    const end = new Date(`${vietnamDate}T23:59:59.999+07:00`);
    const snapshot = await database.collectionGroup("timeCapsules")
      .where("openDate", ">=", Timestamp.fromDate(start))
      .where("openDate", "<=", Timestamp.fromDate(end))
      .get();

    let checkedCount = 0;
    let notificationCount = 0;
    for (const letter of snapshot.docs) {
      const data = letter.data();
      if (data.isOpened === true || data.notificationSentAt) continue;
      const coupleRef = letter.ref.parent.parent;
      if (!coupleRef) continue;
      const couple = await coupleRef.get();
      const memberIds = Array.isArray(couple.get("memberIds")) ? couple.get("memberIds").filter((uid: unknown): uid is string => typeof uid === "string") : [];
      const senderId = String(data.senderId || data.creatorId || "");
      const explicitRecipients = Array.isArray(data.recipientIds)
        ? data.recipientIds.filter((uid: unknown): uid is string => typeof uid === "string")
        : typeof data.recipientId === "string" ? [data.recipientId] : [];
      const recipients = explicitRecipients.length > 0 ? explicitRecipients : memberIds.filter((uid: string) => uid !== senderId);

      checkedCount += 1;
      for (const uid of Array.from(new Set<string>(recipients))) {
        const result = await sendPushToUser(
          uid,
          "Một lá thư đã đến ngày mở 💌",
          String(data.title || "Mở Love Days để đọc điều người thương đã gửi nhé."),
          "/timecapsule",
          { type: "timecapsule", itemId: letter.id },
        );
        notificationCount += result.successCount;
      }
      // Không đánh dấu thư là đã đọc; chỉ đánh dấu cron đã gửi để workflow chạy lại không tạo noti trùng.
      await letter.ref.update({ notificationSentAt: FieldValue.serverTimestamp() });
    }

    return NextResponse.json({ date: vietnamDate, checkedCount, notificationCount });
  } catch (caught) {
    console.error("Không thể kiểm tra thư tới ngày mở:", caught);
    return NextResponse.json({ error: "Cron chưa thể kiểm tra thư." }, { status: 500 });
  }
}
