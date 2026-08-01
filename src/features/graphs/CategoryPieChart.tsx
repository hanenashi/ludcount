import type { CSSProperties } from "react";
import type { Locale } from "../../i18n";
import type { CategoryBreakdown } from "./graphData";

const SLICE_COLORS = {
  income: ["#247a4d", "#2f8f83", "#3569a8", "#7655a6", "#d28b22", "#7d8794"],
  expense: ["#c6291e", "#e2673e", "#d28b22", "#7655a6", "#3569a8", "#7d8794"],
} as const;

function pieBackground(
  breakdown: CategoryBreakdown,
  colors: readonly string[],
): string {
  let start = 0;
  const stops = breakdown.slices.map((slice, index) => {
    const end = start + slice.percentage;
    const stop = `${colors[index]} ${start}% ${end}%`;
    start = end;
    return stop;
  });
  return `conic-gradient(${stops.join(", ")})`;
}

export function CategoryPieChart({
  breakdown,
  heading,
  tone,
  emptyMessage,
  locale,
  formatAmount,
}: {
  breakdown: CategoryBreakdown;
  heading: string;
  tone: "income" | "expense";
  emptyMessage: string;
  locale: Locale;
  formatAmount: (amountMinor: number) => string;
}) {
  const percentage = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
  });
  const colors = SLICE_COLORS[tone];

  return (
    <figure className="category-pie-card">
      <figcaption>{heading}</figcaption>
      {breakdown.slices.length === 0 ? (
        <p className="category-pie-empty">{emptyMessage}</p>
      ) : (
        <div className="category-pie-content">
          <div
            className="category-pie"
            style={
              {
                "--pie-background": pieBackground(breakdown, colors),
              } as CSSProperties
            }
            role="img"
            aria-label={heading}
          />
          <ul className="category-pie-legend">
            {breakdown.slices.map((slice, index) => (
              <li key={slice.id}>
                <i
                  className="category-swatch"
                  style={{ backgroundColor: colors[index] }}
                  aria-hidden="true"
                />
                <span className="category-pie-label">{slice.label}</span>
                <strong>{formatAmount(slice.amountMinor)}</strong>
                <span className="category-pie-percentage">
                  {percentage.format(slice.percentage)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </figure>
  );
}
