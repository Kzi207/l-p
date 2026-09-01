export interface LoveDuration {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export interface UpcomingMilestone {
  label: string;
  date: Date;
  daysLeft: number;
}

export function getLoveDuration(startDate: Date, now = new Date()): LoveDuration {
  const difference = Math.max(0, now.getTime() - startDate.getTime());
  const totalSeconds = Math.floor(difference / 1000);

  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

export function getUpcomingMilestone(startDate: Date, now = new Date()): UpcomingMilestone {
  const dayMs = 86_400_000;
  const elapsedDays = Math.max(0, Math.floor((now.getTime() - startDate.getTime()) / dayMs));
  const candidates: Array<{ label: string; date: Date }> = [];

  const nextHundred = Math.max(100, Math.ceil((elapsedDays + 1) / 100) * 100);
  for (let days = nextHundred; days <= nextHundred + 400; days += 100) {
    candidates.push({
      label: `${days.toLocaleString("vi-VN")} ngày bên nhau`,
      date: new Date(startDate.getTime() + days * dayMs),
    });
  }

  const currentYearOffset = Math.max(1, now.getFullYear() - startDate.getFullYear());
  for (let years = currentYearOffset; years <= currentYearOffset + 3; years += 1) {
    const date = new Date(startDate);
    date.setFullYear(startDate.getFullYear() + years);
    candidates.push({ label: `${years} năm yêu nhau`, date });
  }

  const next = candidates
    .filter((candidate) => candidate.date.getTime() > now.getTime())
    .sort((a, b) => a.date.getTime() - b.date.getTime())[0];

  return {
    ...next,
    daysLeft: Math.max(1, Math.ceil((next.date.getTime() - now.getTime()) / dayMs)),
  };
}

export function formatCountdown(milliseconds: number): string {
  if (milliseconds <= 0) return "Bạn có thể đăng ảnh mới ngay bây giờ";
  const totalSeconds = Math.ceil(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}
