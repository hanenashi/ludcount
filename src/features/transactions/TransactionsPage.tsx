import { Download, Plus } from "lucide-react";
import { useCallback, useDeferredValue, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PeriodSelector } from "../period/PeriodSelector";
import { DataWriteError } from "../../components/DataState";
import { ModalDialog } from "../../components/ModalDialog";
import {
  normalizeDataError,
  type DataOperationError,
} from "../../firebase/errors";
import { useI18n } from "../../i18n";
import { periodExportKey } from "../period/period";
import { usePeriod } from "../period/PeriodProvider";
import {
  createTransactionsCsv,
  createTransactionsCsvFilename,
  downloadTransactionsCsv,
} from "../export/csv";
import {
  filterTransactions,
  hasSecondaryFilters,
  type TransactionTypeFilter,
} from "./filters";
import { useCategories } from "../categories/CategoryProvider";
import type { Transaction } from "./model";
import { TransactionFilters } from "./TransactionFilters";
import { TransactionList } from "./TransactionList";
import { useTransactions } from "./TransactionProvider";

export function TransactionsPage() {
  const { locale, t } = useI18n();
  const { transactions, deleteTransaction } = useTransactions();
  const { period, setPeriod, resetPeriod } = usePeriod();
  const { categoryFor, labelFor } = useCategories();
  const [type, setType] = useState<TransactionTypeFilter>("all");
  const [categoryId, setCategoryId] = useState("all");
  const [noteQuery, setNoteQuery] = useState("");
  const deferredNoteQuery = useDeferredValue(noteQuery);
  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<DataOperationError | null>(
    null,
  );
  const filters = useMemo(
    () => ({
      period,
      type,
      categoryId,
      noteQuery: deferredNoteQuery,
    }),
    [categoryId, deferredNoteQuery, period, type],
  );
  const visibleTransactions = useMemo(
    () => filterTransactions(transactions, filters),
    [filters, transactions],
  );
  const secondaryFiltersActive = hasSecondaryFilters({
    type,
    categoryId,
    noteQuery,
  });
  const activeFilterCount =
    Number(type !== "all") +
    Number(categoryId !== "all") +
    Number(noteQuery.trim() !== "");

  const resetFilters = () => {
    resetPeriod();
    setType("all");
    setCategoryId("all");
    setNoteQuery("");
  };

  const closeDeleteDialog = useCallback(() => {
    setPendingDelete(null);
    setDeleteError(null);
  }, []);

  const exportTransactions = () => {
    const csv = createTransactionsCsv(visibleTransactions, locale, {
      date: t("csv.header.date"),
      type: t("csv.header.type"),
      amount: t("csv.header.amount"),
      currency: t("csv.header.currency"),
      category: t("csv.header.category"),
      note: t("csv.header.note"),
      expense: t("transaction.type.expense"),
      income: t("transaction.type.income"),
      categoryFor: (transaction) => {
        const category = categoryFor(transaction.categoryId);
        return category
          ? labelFor(category)
          : transaction.categoryLabelSnapshot;
      },
    });
    downloadTransactionsCsv(
      csv,
      createTransactionsCsvFilename(periodExportKey(period)),
    );
  };

  const confirmDelete = async () => {
    if (pendingDelete) {
      setDeleting(true);
      setDeleteError(null);
      try {
        await deleteTransaction(pendingDelete.id);
        setPendingDelete(null);
      } catch (error) {
        setDeleteError(normalizeDataError(error, "write-failure"));
      } finally {
        setDeleting(false);
      }
    }
  };

  return (
    <div className="page">
      <div className="page-heading-row">
        <PeriodSelector period={period} onChange={setPeriod} />
        <Link className="button button-primary page-add-button" to="new">
          <Plus size={19} aria-hidden="true" />
          {t("transaction.add")}
        </Link>
      </div>
      <section className="content-section transaction-history">
        <div className="history-heading">
          <div>
            <h2>{t("transaction.listHeading")}</h2>
            <span
              className="result-count"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              {t("transaction.results")}: {visibleTransactions.length}
            </span>
          </div>
          <button
            className="button button-secondary"
            type="button"
            disabled={visibleTransactions.length === 0}
            onClick={exportTransactions}
          >
            <Download size={18} aria-hidden="true" />
            {t("transaction.exportCsv")}
          </button>
        </div>
        <TransactionFilters
          filters={{ type, categoryId, noteQuery }}
          activeCount={activeFilterCount}
          onTypeChange={setType}
          onCategoryChange={setCategoryId}
          onNoteQueryChange={setNoteQuery}
          onReset={resetFilters}
        />
        <TransactionList
          transactions={visibleTransactions}
          onDelete={setPendingDelete}
          emptyMessage={
            secondaryFiltersActive
              ? t("transaction.emptyFiltered")
              : t("transaction.empty")
          }
        />
      </section>

      {pendingDelete ? (
        <ModalDialog
          labelledBy="delete-title"
          describedBy="delete-description"
          onDismiss={closeDeleteDialog}
        >
          <h2 id="delete-title">{t("transaction.deleteTitle")}</h2>
          <p id="delete-description">{t("transaction.deleteDescription")}</p>
          <DataWriteError error={deleteError} />
          <div className="form-actions">
            <button
              className="button button-secondary"
              type="button"
              disabled={deleting}
              data-dialog-initial-focus
              onClick={closeDeleteDialog}
            >
              {t("common.cancel")}
            </button>
            <button
              className="button button-danger"
              type="button"
              disabled={deleting}
              onClick={() => void confirmDelete()}
            >
              {deleting ? t("common.deleting") : t("common.delete")}
            </button>
          </div>
        </ModalDialog>
      ) : null}
    </div>
  );
}
