import type { Locale } from "../../i18n";
import {
  formatDateKey,
  formatMonthKey,
  isValidDateKey,
  monthKeyFromDate,
  moveMonth,
  toDateKey,
} from "../../lib/dates";

export type PeriodSelection =
  | { mode: "month"; monthKey: string }
  | { mode: "year"; year: number }
  | { mode: "range"; from: string; to: string };

export function defaultPeriod(now = new Date()): PeriodSelection {
  return { mode: "month", monthKey: monthKeyFromDate(now) };
}

export function isValidPeriod(period: PeriodSelection): boolean {
  if (period.mode === "month") {
    return isValidDateKey(`${period.monthKey}-01`);
  }
  if (period.mode === "year") {
    return (
      Number.isInteger(period.year) &&
      period.year >= 1900 &&
      period.year <= 2099
    );
  }
  return (
    isValidDateKey(period.from) &&
    isValidDateKey(period.to) &&
    period.from <= period.to
  );
}

export function periodContainsDate(
  period: PeriodSelection,
  dateKey: string,
): boolean {
  if (period.mode === "month") return dateKey.startsWith(`${period.monthKey}-`);
  if (period.mode === "year") return dateKey.startsWith(`${period.year}-`);
  return dateKey >= period.from && dateKey <= period.to;
}

function dateFromKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function moveDateKey(dateKey: string, days: number): string {
  const date = dateFromKey(dateKey);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

function inclusiveDayCount(from: string, to: string): number {
  return (
    Math.round(
      (dateFromKey(to).getTime() - dateFromKey(from).getTime()) / 86_400_000,
    ) + 1
  );
}

export function movePeriod(
  period: PeriodSelection,
  offset: -1 | 1,
): PeriodSelection {
  if (period.mode === "month") {
    return { mode: "month", monthKey: moveMonth(period.monthKey, offset) };
  }
  if (period.mode === "year") {
    return {
      mode: "year",
      year: Math.min(2099, Math.max(1900, period.year + offset)),
    };
  }
  const days = inclusiveDayCount(period.from, period.to) * offset;
  return {
    mode: "range",
    from: moveDateKey(period.from, days),
    to: moveDateKey(period.to, days),
  };
}

export function periodLabel(period: PeriodSelection, locale: Locale): string {
  if (period.mode === "month") return formatMonthKey(period.monthKey, locale);
  if (period.mode === "year") return String(period.year);
  return `${formatDateKey(period.from, locale)} – ${formatDateKey(period.to, locale)}`;
}

export function periodExportKey(period: PeriodSelection): string {
  if (period.mode === "month") return period.monthKey;
  if (period.mode === "year") return String(period.year);
  return `${period.from}_to_${period.to}`;
}

export function monthBounds(monthKey: string): { from: string; to: string } {
  const [year, month] = monthKey.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return {
    from: `${monthKey}-01`,
    to: `${monthKey}-${String(lastDay).padStart(2, "0")}`,
  };
}

export function periodYear(period: PeriodSelection): number {
  if (period.mode === "year") return period.year;
  return Number(
    (period.mode === "month" ? period.monthKey : period.from).slice(0, 4),
  );
}

export function periodMonth(period: PeriodSelection): string {
  if (period.mode === "month") return period.monthKey;
  const year = periodYear(period);
  return `${year}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
}

export function periodRange(period: PeriodSelection): {
  from: string;
  to: string;
} {
  if (period.mode === "range") return { from: period.from, to: period.to };
  if (period.mode === "month") return monthBounds(period.monthKey);
  return { from: `${period.year}-01-01`, to: `${period.year}-12-31` };
}
