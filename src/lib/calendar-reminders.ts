import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { adminCollectionGroup, adminGet, adminList } from "@/lib/neon-admin-db";
import { ensureNeonSchema } from "@/lib/neon-database";
import { sendPushToUser } from "@/lib/sendPushNotification";
import { calendarRecipients, dueCalendarReminders, type ReminderEvent } from "@/lib/calendar-reminder-plan";

export async function sendDueCalendarReminders(scope?: { coupleId: string; uid: string }, now = Date.now()) {
  await ensureNeonSchema();
  const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { signal: AbortSignal.timeout(8_000) } });
  const events = scope
    ? (await adminList<ReminderEvent>(`couples/${scope.coupleId}/coupleEvents`)).map(event => ({ ...event, path: `couples/${scope.coupleId}/coupleEvents/${event.id}` }))
    : await adminCollectionGroup<ReminderEvent>("coupleEvents");
  const membersByCouple = new Map<string, unknown[]>();
  const result = { sent: 0, skipped: 0, failed: 0 };
  for (const event of events) {
    if (!event.path || !/^couples\/[^/]+\/coupleEvents\/[^/]+$/.test(event.path)) continue;
    const due = dueCalendarReminders(event.data, now);
    if (!due.length) continue;
    const coupleId = event.path.split("/")[1];
    if (!membersByCouple.has(coupleId)) {
      const couple = await adminGet<{ memberIds?: unknown[] }>(`couples/${coupleId}`);
      membersByCouple.set(coupleId, Array.isArray(couple.data?.memberIds) ? couple.data.memberIds : []);
    }
    const recipients = calendarRecipients(event.data, membersByCouple.get(coupleId)!)
      .filter(uid => !scope || uid === scope.uid);
    for (const reminder of due) for (const uid of recipients) {
      // A changed start time gets a new delivery key. Claims are atomic across tabs/cron instances.
      const id = createHash("sha256").update(JSON.stringify([event.path, uid, event.data.eventAt, reminder])).digest("hex");
      const path = `calendarReminderDeliveries/${id}`;
      const owner = randomUUID();
      const claimedAt = Date.now();
      const claimed = await sql.query(`INSERT INTO love_days_records (path, data, created_at, updated_at)
        VALUES ($1, $2::jsonb, $3, $3)
        ON CONFLICT (path) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at
        WHERE love_days_records.data->>'status' <> 'sent' AND love_days_records.updated_at < $4
        RETURNING path`, [path, JSON.stringify({ status: "sending", owner }), claimedAt, claimedAt - 5 * 60_000]);
      if (!claimed.length) { result.skipped++; continue; }
      try {
        const startsAt = Number(event.data.eventAt?.value);
        const time = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(startsAt));
        const pushed = await sendPushToUser(uid,
          reminder.kind === "start" ? "Đến giờ hẹn rồi 📅" : "Nhắc lịch sắp tới 📅",
          `${String(event.data.title || "Lịch hẹn")} · ${time}`,
          `/calendar?event=${encodeURIComponent(event.id)}`, { type: "calendar-reminder", itemId: id });
        if (!pushed.successCount) throw new Error("No reminder device accepted the push");
        await sql.query(`UPDATE love_days_records SET data = data || '{"status":"sent"}'::jsonb, updated_at = $3
          WHERE path = $1 AND data->>'owner' = $2`, [path, owner, Date.now()]);
        result.sent++;
      } catch (error) {
        // Retry failures, including users who have not registered a device yet.
        await sql.query("DELETE FROM love_days_records WHERE path = $1 AND data->>'owner' = $2", [path, owner]);
        result.failed++;
        console.error("Calendar reminder delivery failed", event.id, error instanceof Error ? error.message : "Unknown error");
      }
    }
  }
  return result;
}
