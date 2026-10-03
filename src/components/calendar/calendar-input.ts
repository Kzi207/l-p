export function readDate(value: string) {
  const match = value.trim().match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/);
  if (!match) return null;
  const key = `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
  const date = new Date(`${key}T12:00:00+07:00`);
  return Number.isFinite(date.getTime()) && new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(date) === key ? key : null;
}
export function readTime(value: string) {
  const match = value.trim().match(/^(\d{1,2})(?::|h|\.)?(\d{2})$/) ?? value.trim().match(/^(\d{1,2})$/);
  if (!match) return null;
  const hour = Number(match[1]); const minute = Number(match[2] ?? 0);
  return hour < 24 && minute < 60 ? `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}` : null;
}

