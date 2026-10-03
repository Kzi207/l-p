export interface ReminderEvent {
  title?: unknown;
  eventAt?: { value?: unknown };
  remindDays?: unknown;
  scheduleType?: unknown;
  creatorId?: unknown;
}

const DAY = 86_400_000;
export const REMINDER_GRACE_MS = 60 * 60_000;

export function dueCalendarReminders(event: ReminderEvent, now: number) {
  const startsAt = Number(event.eventAt?.value);
  if (!Number.isFinite(startsAt) || startsAt <= 0) return [];
  const days = Number(event.remindDays || 0);
  const reminders = [{ kind: "start", dueAt: startsAt }];
  if (Number.isInteger(days) && days > 0 && days <= 365) {
    reminders.push({ kind: "advance", dueAt: startsAt - days * DAY });
  }
  return reminders.filter(({ dueAt }) => dueAt <= now && now - dueAt < REMINDER_GRACE_MS);
}

export function calendarRecipients(event: ReminderEvent, memberIds: unknown[]) {
  const members = Array.from(new Set(memberIds.filter((id): id is string => typeof id === "string" && !!id)));
  if (typeof event.creatorId !== "string" || !members.includes(event.creatorId)) return [];
  return event.scheduleType === "together" ? members : [event.creatorId];
}
