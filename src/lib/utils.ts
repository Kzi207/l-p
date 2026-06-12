import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isValidDateInput(value: string) {
  const normalized = value.trim();

  if (!normalized) {
    return false;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return !Number.isNaN(Date.parse(`${normalized}T00:00:00.000Z`));
  }

  return !Number.isNaN(Date.parse(normalized));
}

export function parseDateInput(value: string) {
  const normalized = value.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return new Date(`${normalized}T00:00:00.000Z`);
  }

  return new Date(normalized);
}

export function calculateLoveDays(startDate: Date | null) {
  if (!startDate) {
    return 0;
  }

  const startOfTodayUtc = Date.UTC(
    new Date().getUTCFullYear(),
    new Date().getUTCMonth(),
    new Date().getUTCDate(),
  );
  const startOfRelationshipUtc = Date.UTC(
    startDate.getUTCFullYear(),
    startDate.getUTCMonth(),
    startDate.getUTCDate(),
  );
  const diff = startOfTodayUtc - startOfRelationshipUtc;

  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export function generateCoupleCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}
