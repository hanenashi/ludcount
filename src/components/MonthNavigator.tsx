import { ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "../i18n";
import { formatMonthKey, moveMonth } from "../lib/dates";

interface MonthNavigatorProps {
  monthKey: string;
  onChange: (monthKey: string) => void;
}

export function MonthNavigator({ monthKey, onChange }: MonthNavigatorProps) {
  const { locale, t } = useI18n();

  return (
    <div
      className="month-navigator"
      role="group"
      aria-label={t("common.monthNavigation")}
    >
      <button
        className="icon-button"
        type="button"
        aria-label={t("common.previousMonth")}
        onClick={() => onChange(moveMonth(monthKey, -1))}
      >
        <ChevronLeft size={21} aria-hidden="true" />
      </button>
      <h1 aria-live="polite" aria-atomic="true">
        {formatMonthKey(monthKey, locale)}
      </h1>
      <button
        className="icon-button"
        type="button"
        aria-label={t("common.nextMonth")}
        onClick={() => onChange(moveMonth(monthKey, 1))}
      >
        <ChevronRight size={21} aria-hidden="true" />
      </button>
    </div>
  );
}
