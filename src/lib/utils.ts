import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Parse a date-only string (YYYY-MM-DD) without timezone issues.
 * This prevents the common bug where "2026-01-05" becomes "2026-01-04" in GMT-3.
 */
export function parseDateOnly(dateStr: string): Date {
  if (!dateStr) return new Date();
  // Using T12:00:00 ensures the date stays the same regardless of timezone
  return new Date(dateStr + 'T12:00:00');
}

/**
 * Format a Date to YYYY-MM-DD string safely.
 */
export function formatDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
