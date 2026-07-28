import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useI18n } from "../../i18n";
import { isValidDateKey, toDateKey, toMonthKey } from "../../lib/dates";
import { parseMoneyInput } from "../../lib/money";
import { categories, type Transaction, type TransactionDraft } from "./model";

interface TransactionFormProps {
  transaction?: Transaction;
  onSubmit: (draft: TransactionDraft) => void;
  onCancel: () => void;
}

export function TransactionForm({
  transaction,
  onSubmit,
  onCancel,
}: TransactionFormProps) {
  const { locale, t } = useI18n();
  const initialType = transaction?.type ?? "expense";
  const [type, setType] = useState(initialType);
  const [amount, setAmount] = useState(
    transaction
      ? (transaction.amountMinor / 100)
          .toFixed(2)
          .replace(".", locale === "cs" ? "," : ".")
      : "",
  );
  const [categoryId, setCategoryId] = useState(
    transaction?.categoryId ??
      categories.find((category) => category.type === initialType)?.id ??
      "",
  );
  const [dateKey, setDateKey] = useState(
    transaction?.dateKey ?? toDateKey(new Date()),
  );
  const [note, setNote] = useState(transaction?.note ?? "");
  const [errors, setErrors] = useState<{
    amount?: string;
    date?: string;
  }>({});
  const amountRef = useRef<HTMLInputElement>(null);

  const visibleCategories = useMemo(
    () => categories.filter((category) => category.type === type),
    [type],
  );

  useEffect(() => {
    amountRef.current?.focus();
  }, []);

  const changeType = (nextType: "income" | "expense") => {
    setType(nextType);
    setCategoryId(
      categories.find((category) => category.type === nextType)?.id ?? "",
    );
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amountMinor = parseMoneyInput(amount, locale);
    const nextErrors = {
      amount: amountMinor ? undefined : t("transaction.invalidAmount"),
      date: isValidDateKey(dateKey) ? undefined : t("transaction.invalidDate"),
    };
    setErrors(nextErrors);

    if (!amountMinor || nextErrors.date) {
      return;
    }

    onSubmit({
      type,
      amountMinor,
      categoryId,
      dateKey,
      monthKey: toMonthKey(dateKey),
      note: note.trim(),
    });
  };

  const heading = transaction
    ? type === "expense"
      ? t("transaction.editExpense")
      : t("transaction.editIncome")
    : type === "expense"
      ? t("transaction.newExpense")
      : t("transaction.newIncome");

  return (
    <form className="transaction-form" onSubmit={handleSubmit} noValidate>
      <h1>{heading}</h1>

      <fieldset className="type-switch">
        <legend className="sr-only">{t("transaction.type")}</legend>
        <button
          className={
            type === "expense"
              ? "type-option type-option-active"
              : "type-option"
          }
          type="button"
          onClick={() => changeType("expense")}
        >
          {t("transaction.type.expense")}
        </button>
        <button
          className={
            type === "income" ? "type-option type-option-active" : "type-option"
          }
          type="button"
          onClick={() => changeType("income")}
        >
          {t("transaction.type.income")}
        </button>
      </fieldset>

      <div className="field">
        <label htmlFor="transaction-amount">{t("transaction.amount")}</label>
        <div
          className={errors.amount ? "money-input field-error" : "money-input"}
        >
          <input
            id="transaction-amount"
            ref={amountRef}
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            aria-invalid={Boolean(errors.amount)}
            aria-describedby={errors.amount ? "amount-error" : undefined}
          />
          <span>Kč</span>
        </div>
        {errors.amount ? (
          <small className="error-message" id="amount-error">
            {errors.amount}
          </small>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="transaction-category">
          {t("transaction.category")}
        </label>
        <select
          id="transaction-category"
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
        >
          {visibleCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {t(category.labelKey)}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="transaction-date">{t("transaction.date")}</label>
        <input
          id="transaction-date"
          type="date"
          value={dateKey}
          onChange={(event) => setDateKey(event.target.value)}
          aria-invalid={Boolean(errors.date)}
          aria-describedby={errors.date ? "date-error" : undefined}
        />
        {errors.date ? (
          <small className="error-message" id="date-error">
            {errors.date}
          </small>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="transaction-note">{t("transaction.note")}</label>
        <textarea
          id="transaction-note"
          value={note}
          maxLength={120}
          placeholder={t("transaction.notePlaceholder")}
          onChange={(event) => setNote(event.target.value)}
        />
        <small className="character-count">{note.length} / 120</small>
      </div>

      <div className="form-actions">
        <button
          className="button button-secondary"
          type="button"
          onClick={onCancel}
        >
          {t("common.cancel")}
        </button>
        <button className="button button-primary" type="submit">
          {transaction
            ? t("transaction.update")
            : type === "expense"
              ? t("transaction.saveExpense")
              : t("transaction.saveIncome")}
        </button>
      </div>
    </form>
  );
}
