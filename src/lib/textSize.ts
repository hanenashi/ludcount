export type TextSizePreference = "standard" | "large" | "extra-large";

export function isTextSizePreference(
  value: unknown,
): value is TextSizePreference {
  return value === "standard" || value === "large" || value === "extra-large";
}
