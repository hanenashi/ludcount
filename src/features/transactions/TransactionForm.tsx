import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { DataWriteError } from "../../components/DataState";
import {
  normalizeDataError,
  type DataOperationError,
} from "../../firebase/errors";
import { useI18n } from "../../i18n";
import { isValidDateKey, toDateKey, toMonthKey } from "../../lib/dates";
import { parseMoneyInput } from "../../lib/money";
import { useCategories } from "../categories/CategoryProvider";
import type { Transaction, TransactionDraft } from "./model";

interface TransactionFormProps {
  transaction?: Transaction;
  initialDraft?: TransactionDraft;
  onSubmit: (draft: TransactionDraft) => Promise<void>;
  onCancel: () => void;
}

export function TransactionForm({
  transaction,
  initialDraft,
  onSubmit,
  onCancel,
}: TransactionFormProps) {
  const { locale, t } = useI18n();
  const { categories, labelFor } = useCategories();
  const initialValues = transaction ?? initialDraft;
  const initialType = initialValues?.type ?? "expense";
  const initialCategory = categories.find(
    (category) => category.id === initialValues?.categoryId,
  );
  const initialCategoryId =
    initialCategory && (!initialCategory.archived || transaction)
      ? initialCategory.id
      : (categories.find(
          (category) => category.type === initialType && !category.archived,
        )?.id ?? "");
  const [type, setType] = useState(initialType);
  const [amount, setAmount] = useState(
    initialValues
      ? (initialValues.amountMinor / 100)
          .toFixed(2)
          .replace(".", locale === "cs" ? "," : ".")
      : "",
  );
  const [categoryId, setCategoryId] = useState(initialCategoryId);
  const [dateKey, setDateKey] = useState(
    initialValues?.dateKey ?? toDateKey(new Date()),
  );
  const [note, setNote] = useState(initialValues?.note ?? "");
  const [errors, setErrors] = useState<{
    amount?: string;
    date?: string;
  }>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<DataOperationError | null>(
    null,
  );
  const amountRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);

  const visibleCategories = useMemo(
    () =>
      categories.filter(
        (category) =>
          category.type === type &&
          (!category.archived || category.id === transaction?.categoryId),
      ),
    [categories, transaction?.categoryId, type],
  );

  useEffect(() => {
    amountRef.current?.focus();
  }, []);

  const changeType = (nextType: "income" | "expense") => {
    setType(nextType);
    setCategoryId(
      categories.find(
        (category) => category.type === nextType && !category.archived,
      )?.id ?? "",
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amountMinor = parseMoneyInput(amount, locale);
    const nextErrors = {
      amount: amountMinor ? undefined : t("transaction.invalidAmount"),
      date: isValidDateKey(dateKey) ? undefined : t("transaction.invalidDate"),
    };
    setErrors(nextErrors);

    if (!amountMinor || nextErrors.date) {
      if (!amountMinor) {
        amountRef.current?.focus();
      } else {
        dateRef.current?.focus();
      }
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      await onSubmit({
        type,
        amountMinor,
        categoryId,
        dateKey,
        monthKey: toMonthKey(dateKey),
        note: note.trim(),
      });
    } catch (error) {
      setSubmitError(normalizeDataError(error, "write-failure"));
    } finally {
      setSubmitting(false);
    }
  };

  const heading = transaction
    ? type === "expense"
      ? t("transaction.editExpense")
      : t("transaction.editIncome")
    : initialDraft
      ? type === "expense"
        ? t("transaction.duplicateExpense")
        : t("transaction.duplicateIncome")
      : type === "expense"
        ? t("transaction.newExpense")
        : t("transaction.newIncome");

  return (
    <form
      className="transaction-form"
      onSubmit={(event) => void handleSubmit(event)}
      noValidate
      aria-busy={submitting}
    >
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
          aria-pressed={type === "expense"}
          onClick={() => changeType("expense")}
        >
          {t("transaction.type.expense")}
        </button>
        <button
          className={
            type === "income" ? "type-option type-option-active" : "type-option"
          }
          type="button"
          aria-pressed={type === "income"}
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
            required
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            aria-invalid={Boolean(errors.amount)}
            aria-describedby={errors.amount ? "amount-error" : undefined}
            aria-errormessage={errors.amount ? "amount-error" : undefined}
          />
          <span>Kč</span>
        </div>
        {errors.amount ? (
          <small className="error-message" id="amount-error" role="alert">
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
          required
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
        >
          {visibleCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {labelFor(category)}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="transaction-date">{t("transaction.date")}</label>
        <input
          id="transaction-date"
          ref={dateRef}
          type="date"
          required
          value={dateKey}
          onChange={(event) => setDateKey(event.target.value)}
          aria-invalid={Boolean(errors.date)}
          aria-describedby={errors.date ? "date-error" : undefined}
          aria-errormessage={errors.date ? "date-error" : undefined}
        />
        {errors.date ? (
          <small className="error-message" id="date-error" role="alert">
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
          aria-describedby="transaction-note-count"
          placeholder={t("transaction.notePlaceholder")}
          onChange={(event) => setNote(event.target.value)}
        />
        <small className="character-count" id="transaction-note-count">
          {note.length} / 120
        </small>
      </div>

      <div className="form-actions">
        {submitting ? (
          <span className="sr-only" role="status" aria-live="polite">
            {t("common.saving")}
          </span>
        ) : null}
        <DataWriteError error={submitError} />
        <button
          className="button button-secondary"
          type="button"
          disabled={submitting}
          onClick={onCancel}
        >
          {t("common.cancel")}
        </button>
        <button
          className="button button-primary"
          type="submit"
          disabled={submitting}
        >
          {submitting
            ? t("common.saving")
            : transaction
              ? t("transaction.update")
              : type === "expense"
                ? t("transaction.saveExpense")
                : t("transaction.saveIncome")}
        </button>
      </div>
    </form>
  );
}
