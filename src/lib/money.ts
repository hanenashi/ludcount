export type MoneyAmount = number & {
  readonly __brand: "MoneyAmountMinorUnits";
};

export const MAX_AMOUNT_MINOR = 1_000_000_000;

export function asMoneyAmount(value: number): MoneyAmount {
  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_AMOUNT_MINOR) {
    throw new RangeError(
      "Money amounts must be safe non-negative minor units.",
    );
  }
  return value as MoneyAmount;
}

export function parseMoneyInput(
  input: string,
  locale: "cs" | "en",
): MoneyAmount | null {
  const normalized = input.trim().replace(/[\s\u00a0\u202f]/g, "");
  const pattern =
    locale === "cs" ? /^(?:\d+)(?:,(\d{1,2}))?$/ : /^(?:\d+)(?:\.(\d{1,2}))?$/;
  const match = normalized.match(pattern);
  if (!match) {
    return null;
  }

  const whole = Number.parseInt(
    normalized.split(locale === "cs" ? "," : ".")[0],
    10,
  );
  const fraction = (match[1] ?? "").padEnd(2, "0");
  const minor = whole * 100 + Number.parseInt(fraction || "0", 10);

  if (!Number.isSafeInteger(minor) || minor <= 0 || minor > MAX_AMOUNT_MINOR) {
    return null;
  }

  return minor as MoneyAmount;
}

export function formatMoney(
  amountMinor: MoneyAmount,
  locale: "cs" | "en",
  currency = "CZK",
): string {
  return new Intl.NumberFormat(locale === "cs" ? "cs-CZ" : "en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100);
}

export function sumMoney(values: readonly MoneyAmount[]): MoneyAmount {
  return asMoneyAmount(values.reduce((sum, value) => sum + value, 0));
}
