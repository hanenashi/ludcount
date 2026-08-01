import { Check, Delete } from "lucide-react";
import { useI18n } from "../../i18n";
import { updateAmountFromPad, type AmountPadKey } from "./amountPad";

const DIGIT_KEYS = ["7", "8", "9", "4", "5", "6", "1", "2", "3"] as const;

export function AmountNumberPad({
  value,
  onChange,
  onDone,
  onDismiss,
}: {
  value: string;
  onChange: (value: string) => void;
  onDone: () => void;
  onDismiss: () => void;
}) {
  const { locale, t } = useI18n();
  const press = (key: AmountPadKey) =>
    onChange(updateAmountFromPad(value, key, locale));

  return (
    <div
      className="amount-number-pad"
      id="transaction-amount-pad"
      role="group"
      aria-label={t("transaction.numberPad")}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onDismiss();
        }
      }}
    >
      {DIGIT_KEYS.map((digit) => (
        <button
          className={`amount-pad-key amount-pad-${digit}`}
          type="button"
          key={digit}
          onClick={() => press(digit)}
        >
          {digit}
        </button>
      ))}
      <button
        className="amount-pad-key amount-pad-decimal"
        type="button"
        aria-label={t("transaction.numberPadDecimal")}
        onClick={() => press("decimal")}
      >
        {locale === "cs" ? "," : "."}
      </button>
      <button
        className="amount-pad-key amount-pad-0"
        type="button"
        onClick={() => press("0")}
      >
        0
      </button>
      <button
        className="amount-pad-key amount-pad-backspace"
        type="button"
        aria-label={t("transaction.numberPadBackspace")}
        onClick={() => press("backspace")}
      >
        <Delete size={19} aria-hidden="true" />
      </button>
      <button
        className="amount-pad-key amount-pad-done"
        type="button"
        onClick={onDone}
      >
        <Check size={19} aria-hidden="true" />
        <span>{t("transaction.numberPadDone")}</span>
      </button>
    </div>
  );
}
