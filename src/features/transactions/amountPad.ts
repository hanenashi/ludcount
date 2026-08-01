import type { Locale } from "../../i18n";

export type AmountPadKey =
  | "0"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "decimal"
  | "backspace";

export function updateAmountFromPad(
  value: string,
  key: AmountPadKey,
  locale: Locale,
): string {
  if (key === "backspace") return value.slice(0, -1);

  const separator = locale === "cs" ? "," : ".";
  const partialPattern =
    locale === "cs" ? /^\d*(?:,\d{0,2})?$/ : /^\d*(?:\.\d{0,2})?$/;
  const safeValue = partialPattern.test(value) ? value : "";
  if (key === "decimal") {
    if (safeValue.includes(separator)) return safeValue;
    return `${safeValue || "0"}${separator}`;
  }

  const fraction = safeValue.split(separator)[1];
  if (fraction?.length === 2) return safeValue;
  if (safeValue === "0" && key !== "0") return key;
  return `${safeValue}${key}`;
}
