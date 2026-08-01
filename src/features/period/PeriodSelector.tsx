import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useState } from "react";
import { ModalDialog } from "../../components/ModalDialog";
import { useI18n } from "../../i18n";
import {
  isValidPeriod,
  movePeriod,
  periodLabel,
  periodMonth,
  periodRange,
  periodYear,
  type PeriodSelection,
} from "./period";

export function PeriodSelector({
  period,
  onChange,
}: {
  period: PeriodSelection;
  onChange: (period: PeriodSelection) => void;
}) {
  const { locale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<PeriodSelection>(period);
  const closeDialog = useCallback(() => setOpen(false), []);

  const openDialog = () => {
    setDraft(period);
    setOpen(true);
  };

  const setMode = (mode: PeriodSelection["mode"]) => {
    if (mode === "month") {
      setDraft({ mode, monthKey: periodMonth(draft) });
    } else if (mode === "year") {
      setDraft({ mode, year: periodYear(draft) });
    } else {
      setDraft({ mode, ...periodRange(draft) });
    }
  };

  return (
    <>
      <div
        className="month-navigator period-navigator"
        role="group"
        aria-label={t("period.navigation")}
      >
        <button
          className="icon-button"
          type="button"
          aria-label={t("period.previous")}
          onClick={() => onChange(movePeriod(period, -1))}
        >
          <ChevronLeft size={21} aria-hidden="true" />
        </button>
        <h1 aria-live="polite" aria-atomic="true">
          <button
            className="period-trigger"
            type="button"
            aria-haspopup="dialog"
            onClick={openDialog}
          >
            {periodLabel(period, locale)}
            <ChevronDown size={19} aria-hidden="true" />
          </button>
        </h1>
        <button
          className="icon-button"
          type="button"
          aria-label={t("period.next")}
          onClick={() => onChange(movePeriod(period, 1))}
        >
          <ChevronRight size={21} aria-hidden="true" />
        </button>
      </div>

      {open ? (
        <ModalDialog
          role="dialog"
          labelledBy="period-dialog-title"
          describedBy="period-dialog-description"
          onDismiss={closeDialog}
        >
          <h2 id="period-dialog-title">{t("period.heading")}</h2>
          <p id="period-dialog-description">{t("period.description")}</p>
          <div
            className="period-mode-options"
            role="group"
            aria-label={t("period.mode")}
          >
            {(["month", "year", "range"] as const).map((mode) => (
              <button
                className={
                  draft.mode === mode
                    ? "language-button language-button-active"
                    : "language-button"
                }
                type="button"
                key={mode}
                aria-pressed={draft.mode === mode}
                onClick={() => setMode(mode)}
              >
                {t(`period.${mode}`)}
              </button>
            ))}
          </div>

          <div className="period-fields">
            {draft.mode === "month" ? (
              <label className="field">
                <span>{t("period.month")}</span>
                <input
                  data-dialog-initial-focus
                  type="month"
                  min="1900-01"
                  max="2099-12"
                  value={draft.monthKey}
                  onChange={(event) =>
                    setDraft({ mode: "month", monthKey: event.target.value })
                  }
                />
              </label>
            ) : draft.mode === "year" ? (
              <label className="field">
                <span>{t("period.year")}</span>
                <input
                  data-dialog-initial-focus
                  type="number"
                  inputMode="numeric"
                  min="1900"
                  max="2099"
                  value={draft.year}
                  onChange={(event) =>
                    setDraft({ mode: "year", year: Number(event.target.value) })
                  }
                />
              </label>
            ) : (
              <>
                <label className="field">
                  <span>{t("period.from")}</span>
                  <input
                    data-dialog-initial-focus
                    type="date"
                    min="1900-01-01"
                    max="2099-12-31"
                    value={draft.from}
                    onChange={(event) =>
                      setDraft({ ...draft, from: event.target.value })
                    }
                  />
                </label>
                <label className="field">
                  <span>{t("period.to")}</span>
                  <input
                    type="date"
                    min="1900-01-01"
                    max="2099-12-31"
                    value={draft.to}
                    onChange={(event) =>
                      setDraft({ ...draft, to: event.target.value })
                    }
                  />
                </label>
              </>
            )}
          </div>

          {!isValidPeriod(draft) ? (
            <p className="error-message" role="alert">
              {t("period.invalid")}
            </p>
          ) : null}
          <div className="dialog-actions">
            <button
              className="button button-secondary"
              type="button"
              onClick={closeDialog}
            >
              {t("common.cancel")}
            </button>
            <button
              className="button button-primary"
              type="button"
              disabled={!isValidPeriod(draft)}
              onClick={() => {
                onChange(draft);
                closeDialog();
              }}
            >
              {t("period.apply")}
            </button>
          </div>
        </ModalDialog>
      ) : null}
    </>
  );
}
