import { Keyboard } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { DataWriteError } from "../../components/DataState";
import { useAppRuntime } from "../../app/AppRuntime";
import {
  normalizeDataError,
  type DataOperationError,
} from "../../firebase/errors";
import { useI18n } from "../../i18n";
import { isValidDateKey, toDateKey, toMonthKey } from "../../lib/dates";
import { parseMoneyInput } from "../../lib/money";
import { useCategories } from "../categories/CategoryProvider";
import { AmountNumberPad } from "./AmountNumberPad";
import type { Transaction, TransactionDraft } from "./model";

function prefersCustomNumberPad(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(pointer: coarse)").matches === true ||
    window.navigator.maxTouchPoints > 0
  );
}

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
  const { currencySymbol } = useAppRuntime();
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
  const [useCustomNumberPad] = useState(prefersCustomNumberPad);
  const [numberPadOpen, setNumberPadOpen] = useState(false);
  const [submitError, setSubmitError] = useState<DataOperationError | null>(
    null,
  );
  const amountRef = useRef<HTMLInputElement>(null);
  const amountFieldRef = useRef<HTMLDivElement>(null);
  const categoryRef = useRef<HTMLSelectElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const suppressNumberPadOpen = useRef(false);

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

  useEffect(() => {
    if (!numberPadOpen) return;
    const keepPadAboveNavigation = () => {
      const pad = document.getElementById("transaction-amount-pad");
      const mobileNavigation = document.querySelector(".mobile-navigation");
      if (!pad) return;
      const padBottom = pad.getBoundingClientRect().bottom;
      const availableBottom = mobileNavigation
        ? mobileNavigation.getBoundingClientRect().top
        : window.innerHeight;
      const overlap = padBottom - availableBottom + 8;
      if (overlap > 0) window.scrollBy({ top: overlap, behavior: "auto" });
    };
    const frame = window.requestAnimationFrame(keepPadAboveNavigation);
    const layoutCheck = window.setTimeout(keepPadAboveNavigation, 150);
    const closeOutside = (event: PointerEvent) => {
      if (!amountFieldRef.current?.contains(event.target as Node)) {
        setNumberPadOpen(false);
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(layoutCheck);
      document.removeEventListener("pointerdown", closeOutside);
    };
  }, [numberPadOpen]);

  const dismissNumberPad = () => {
    setNumberPadOpen(false);
    suppressNumberPadOpen.current = true;
    window.requestAnimationFrame(() => {
      amountRef.current?.focus();
      suppressNumberPadOpen.current = false;
    });
  };

  const changeType = (nextType: "income" | "expense") => {
    setNumberPadOpen(false);
    setType(nextType);
    setCategoryId(
      categories.find(
        (category) => category.type === nextType && !category.archived,
      )?.id ?? "",
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNumberPadOpen(false);
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
      className={
        numberPadOpen
          ? "transaction-form transaction-form-pad-open"
          : "transaction-form"
      }
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

      <div className="field amount-field" ref={amountFieldRef}>
        <label htmlFor="transaction-amount">{t("transaction.amount")}</label>
        <div
          className={errors.amount ? "money-input field-error" : "money-input"}
        >
          <input
            id="transaction-amount"
            ref={amountRef}
            required
            inputMode={useCustomNumberPad ? "none" : "decimal"}
            readOnly={useCustomNumberPad}
            autoComplete="off"
            value={amount}
            onFocus={() => {
              if (useCustomNumberPad && !suppressNumberPadOpen.current) {
                setNumberPadOpen(true);
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape" && numberPadOpen) {
                event.preventDefault();
                setNumberPadOpen(false);
              }
            }}
            onChange={(event) => {
              setAmount(event.target.value);
              setErrors((current) => ({ ...current, amount: undefined }));
            }}
            aria-expanded={useCustomNumberPad ? numberPadOpen : undefined}
            aria-controls={
              useCustomNumberPad && numberPadOpen
                ? "transaction-amount-pad"
                : undefined
            }
            aria-invalid={Boolean(errors.amount)}
            aria-describedby={errors.amount ? "amount-error" : undefined}
            aria-errormessage={errors.amount ? "amount-error" : undefined}
          />
          <span>{currencySymbol}</span>
          {useCustomNumberPad ? (
            <button
              className="amount-pad-toggle"
              type="button"
              aria-label={t("transaction.numberPadOpen")}
              aria-expanded={numberPadOpen}
              aria-controls="transaction-amount-pad"
              onClick={() => setNumberPadOpen((open) => !open)}
            >
              <Keyboard size={20} aria-hidden="true" />
            </button>
          ) : null}
        </div>
        {useCustomNumberPad && numberPadOpen ? (
          <AmountNumberPad
            value={amount}
            onChange={(nextAmount) => {
              setAmount(nextAmount);
              setErrors((current) => ({ ...current, amount: undefined }));
            }}
            onDismiss={dismissNumberPad}
            onDone={() => {
              setNumberPadOpen(false);
              categoryRef.current?.focus();
            }}
          />
        ) : null}
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
          ref={categoryRef}
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
