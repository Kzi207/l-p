import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { adminCollectionGroup, adminGet, adminServerTimestamp, adminWrite } from "@/lib/appsScriptAdminDb";
import { sendPushToUser } from "@/lib/sendPushNotification";

export const runtime = "nodejs";

function timestampMillis(value: unknown) {
  if (value && typeof value === "object" && "value" in value && typeof (value as { value?: unknown }).value === "number") {
    return (value as { value: number }).value;
  }
  return 0;
}

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
    const now = new Date();
    // Workflow chạy theo giờ Việt Nam; tạo biên ngày bằng offset +07:00 để không lệch ngày trên Render UTC.
    const vietnamDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
    const start = new Date(`${vietnamDate}T00:00:00+07:00`);
    const end = new Date(`${vietnamDate}T23:59:59.999+07:00`);
    const letters = (await adminCollectionGroup<Record<string, unknown>>("timeCapsules"))
      .filter((letter) => {
        const openDate = timestampMillis(letter.data.openDate);
        return openDate >= start.getTime() && openDate <= end.getTime();
      });

    let checkedCount = 0;
    let notificationCount = 0;
    for (const letter of letters) {
      const data = letter.data;
      if (data.isOpened === true || data.notificationSentAt) continue;
      const coupleId = letter.path?.split("/")[1];
      if (!coupleId || !letter.path) continue;
      const couple = await adminGet<{ memberIds?: unknown[] }>(`couples/${coupleId}`);
      const memberIds = Array.isArray(couple.data?.memberIds) ? couple.data.memberIds.filter((uid: unknown): uid is string => typeof uid === "string") : [];
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
      await adminWrite({ type: "update", path: letter.path, data: { notificationSentAt: adminServerTimestamp() } });
    }

    const events = await adminCollectionGroup<Record<string, unknown>>("coupleEvents");
    let eventReminderCount = 0;
    for (const event of events) {
      if (!event.path || event.data.reminderSentAt) continue;
      const eventAt = timestampMillis(event.data.eventAt);
      const remindDays = Math.max(0, Number(event.data.remindDays) || 0);
      const reminderStart = eventAt - remindDays * 86_400_000;
      if (reminderStart < start.getTime() || reminderStart > end.getTime()) continue;
      const coupleId = event.path.split("/")[1];
      if (!coupleId) continue;
      const couple = await adminGet<{ memberIds?: unknown[] }>(`couples/${coupleId}`);
      const memberIds = Array.isArray(couple.data?.memberIds) ? couple.data.memberIds.filter((uid): uid is string => typeof uid === "string") : [];
      for (const uid of Array.from(new Set(memberIds))) {
        const result = await sendPushToUser(uid, "Sắp đến một ngày của hai đứa 📅", String(event.data.title || "Mở Lịch đôi để xem nhé."), "/calendar", { type: "calendar", itemId: event.id });
        eventReminderCount += result.successCount;
      }
      await adminWrite({ type: "update", path: event.path, data: { reminderSentAt: adminServerTimestamp() } });
    }

    return NextResponse.json({ date: vietnamDate, checkedCount, notificationCount, eventReminderCount });
  } catch (caught) {
    console.error("Không thể kiểm tra thư tới ngày mở:", caught);
    return NextResponse.json({ error: "Cron chưa thể kiểm tra thư." }, { status: 500 });
  }
}
