import { FileUp, RotateCcw } from "lucide-react";
import { useRef, useState } from "react";
import { useAppRuntime } from "../../app/AppRuntime";
import { DataOperationError } from "../../firebase/errors";
import { useI18n, type Locale } from "../../i18n";
import { formatDateKey } from "../../lib/dates";
import { useCategories } from "../categories/CategoryProvider";
import { useTransactions } from "../transactions/TransactionProvider";
import {
  CsvImportError,
  MAX_IMPORT_FILE_BYTES,
  parseOkaneRecoCsv,
  previewCsvImport,
  type CsvImportPreview,
} from "./csvImport";
import type { ImportResult } from "./repository";

function errorTranslationKey(error: unknown) {
  if (error instanceof CsvImportError) {
    if (error.code === "missing-columns")
      return "import.error.columns" as const;
    if (error.code === "too-many-rows") return "import.error.tooMany" as const;
    return "import.error.invalid" as const;
  }
  if (error instanceof DataOperationError) {
    if (error.kind === "offline") return "data.writeOffline" as const;
    if (error.kind === "permission-denied")
      return "data.writePermission" as const;
    if (error.kind === "timeout") return "data.writeTimeout" as const;
  }
  return "import.error.write" as const;
}

function dateRange(preview: CsvImportPreview, locale: Locale): string {
  const first = formatDateKey(preview.firstDate, locale);
  const last = formatDateKey(preview.lastDate, locale);
  return first === last ? first : `${first} – ${last}`;
}

export function DataImportSection() {
  const runtime = useAppRuntime();
  const { locale, t } = useI18n();
  const { transactions } = useTransactions();
  const { customCategories } = useCategories();
  const input = useRef<HTMLInputElement>(null);
  const [filename, setFilename] = useState("");
  const [preview, setPreview] = useState<CsvImportPreview | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [result, setResult] = useState<ImportResult | null>(null);

  if (!runtime.importRepository) return null;

  const clear = () => {
    setFilename("");
    setPreview(null);
    setError(null);
    setResult(null);
    setProgress({ completed: 0, total: 0 });
    if (input.current) input.current.value = "";
  };

  const chooseFile = async (file: File | undefined) => {
    clear();
    if (!file) return;
    setFilename(file.name);
    setParsing(true);
    try {
      if (file.size > MAX_IMPORT_FILE_BYTES) {
        throw new CsvImportError("too-many-rows");
      }
      const plan = parseOkaneRecoCsv(await file.text());
      setPreview(previewCsvImport(plan, transactions, customCategories));
    } catch (nextError) {
      setError(nextError);
    } finally {
      setParsing(false);
    }
  };

  const startImport = async () => {
    if (!preview || preview.conflictingCategoryIds.length > 0) return;
    setImporting(true);
    setError(null);
    setResult(null);
    setProgress({
      completed: 0,
      total:
        preview.categoriesToCreate.length + preview.transactionsToCreate.length,
    });
    try {
      setResult(
        await runtime.importRepository!.importCsv(preview, setProgress),
      );
    } catch (nextError) {
      setError(nextError);
    } finally {
      setImporting(false);
    }
  };

  return (
    <section className="settings-section import-settings-section">
      <div>
        <h2>{t("import.heading")}</h2>
        <p>{t("import.description")}</p>
      </div>

      <label className="button button-secondary import-file-button">
        <FileUp size={18} aria-hidden="true" />
        {t("import.chooseFile")}
        <input
          ref={input}
          className="sr-only"
          type="file"
          accept=".csv,text/csv"
          disabled={parsing || importing}
          onChange={(event) => void chooseFile(event.target.files?.[0])}
        />
      </label>

      <div className="import-detail" aria-live="polite">
        {parsing ? <p role="status">{t("import.reading")}</p> : null}
        {filename && !parsing ? (
          <p className="import-filename">{filename}</p>
        ) : null}
        {preview ? (
          <div className="import-preview">
            <h3>{t("import.previewHeading")}</h3>
            <dl className="import-summary">
              <div>
                <dt>{t("import.rows")}</dt>
                <dd>{preview.transactions.length}</dd>
              </div>
              <div>
                <dt>{t("import.income")}</dt>
                <dd>{preview.incomeCount}</dd>
              </div>
              <div>
                <dt>{t("import.expenses")}</dt>
                <dd>{preview.expenseCount}</dd>
              </div>
              <div>
                <dt>{t("import.period")}</dt>
                <dd>{dateRange(preview, locale)}</dd>
              </div>
              <div>
                <dt>{t("import.newCategories")}</dt>
                <dd>{preview.categoriesToCreate.length}</dd>
              </div>
              <div>
                <dt>{t("import.alreadyImported")}</dt>
                <dd>{preview.skippedTransactions}</dd>
              </div>
            </dl>
            <p className="import-advisory">{t("import.dateAdvisory")}</p>
            {preview.conflictingCategoryIds.length > 0 ? (
              <p className="settings-inline-error" role="alert">
                {t("import.error.categoryConflict")}
              </p>
            ) : null}
            <div className="import-actions">
              <button
                className="button button-primary"
                type="button"
                disabled={
                  importing ||
                  preview.transactionsToCreate.length === 0 ||
                  preview.conflictingCategoryIds.length > 0
                }
                onClick={() => void startImport()}
              >
                {importing
                  ? t("import.importing")
                  : `${t("import.confirm")} (${preview.transactionsToCreate.length})`}
              </button>
              <button
                className="button button-ghost"
                type="button"
                disabled={importing}
                onClick={clear}
              >
                <RotateCcw size={17} aria-hidden="true" />
                {t("import.clear")}
              </button>
            </div>
          </div>
        ) : null}
        {importing ? (
          <p role="status">
            {t("import.progress")} {progress.completed}/{progress.total}
          </p>
        ) : null}
        {result ? (
          <p className="settings-inline-success" role="status">
            {t("import.complete")} {result.createdTransactions}.{" "}
            {t("import.skipped")} {result.skippedTransactions}.
          </p>
        ) : null}
        {error ? (
          <p className="settings-inline-error" role="alert">
            {t(errorTranslationKey(error))}
            {error instanceof CsvImportError && error.rowNumber
              ? ` ${t("import.row")} ${error.rowNumber}.`
              : ""}
          </p>
        ) : null}
      </div>
    </section>
  );
}
