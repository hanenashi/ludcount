export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function toMonthKey(dateKey: string): string {
  if (!isValidDateKey(dateKey)) {
    throw new RangeError(
      "Expected a valid local date key in YYYY-MM-DD format.",
    );
  }
  return dateKey.slice(0, 7);
}

export function isValidDateKey(dateKey: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return false;
  }
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

export function formatDateKey(dateKey: string, locale: "cs" | "en"): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat(locale === "cs" ? "cs-CZ" : "en-GB", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

export function monthKeyFromDate(date: Date): string {
  return toDateKey(date).slice(0, 7);
}

export function moveMonth(monthKey: string, offset: number): string {
  const [year, month] = monthKey.split("-").map(Number);
  const moved = new Date(year, month - 1 + offset, 1);
  return `${moved.getFullYear()}-${String(moved.getMonth() + 1).padStart(2, "0")}`;
}

export function formatMonthKey(monthKey: string, locale: "cs" | "en"): string {
  const [year, month] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat(locale === "cs" ? "cs-CZ" : "en-GB", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}
