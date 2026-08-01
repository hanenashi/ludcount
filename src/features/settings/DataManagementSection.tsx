import { Download, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { useAppRuntime } from "../../app/AppRuntime";
import { DataWriteError } from "../../components/DataState";
import { ModalDialog } from "../../components/ModalDialog";
import {
  normalizeDataError,
  type DataOperationError,
} from "../../firebase/errors";
import { useI18n } from "../../i18n";
import { toDateKey } from "../../lib/dates";
import { useCategories } from "../categories/CategoryProvider";
import {
  createAllTransactionsCsvFilename,
  createTransactionsCsv,
  downloadTransactionsCsv,
} from "../export/csv";
import { useTransactions } from "../transactions/TransactionProvider";

const DELETE_CONFIRMATION = "DELETE";

export function DataManagementSection() {
  const runtime = useAppRuntime();
  const { locale, t } = useI18n();
  const { categoryFor, labelFor } = useCategories();
  const { transactions, deleteAllTransactions } = useTransactions();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<DataOperationError | null>(
    null,
  );
  const [deleted, setDeleted] = useState(false);

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
    setConfirmation("");
    setDeleteError(null);
  }, []);

  const exportAll = () => {
    const csv = createTransactionsCsv(transactions, locale, {
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
      createAllTransactionsCsvFilename(toDateKey(new Date())),
    );
  };

  const confirmDelete = async () => {
    if (confirmation !== DELETE_CONFIRMATION) return;
    setDeleting(true);
    setDeleteError(null);
    setDeleted(false);
    try {
      await deleteAllTransactions();
      closeDialog();
      setDeleted(true);
    } catch (error) {
      setDeleteError(normalizeDataError(error, "write-failure"));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="settings-section data-management-section">
      <div>
        <h2>{t("settings.dataManagement")}</h2>
        <p>{t("settings.dataManagementDescription")}</p>
      </div>
      <div className="data-management-actions">
        <button
          className="button button-secondary"
          type="button"
          disabled={transactions.length === 0}
          onClick={exportAll}
        >
          <Download size={18} aria-hidden="true" />
          {t("settings.exportAll")}
        </button>
        {runtime.canManageHouseholdData ? (
          <button
            className="button button-danger"
            type="button"
            disabled={transactions.length === 0}
            onClick={() => {
              setDeleted(false);
              setDialogOpen(true);
            }}
          >
            <Trash2 size={18} aria-hidden="true" />
            {t("settings.deleteAll")}
          </button>
        ) : null}
      </div>
      {deleted ? (
        <p className="settings-inline-success" role="status">
          {t("settings.deleteAllComplete")}
        </p>
      ) : null}

      {dialogOpen ? (
        <ModalDialog
          labelledBy="delete-all-title"
          describedBy="delete-all-description"
          onDismiss={closeDialog}
        >
          <h2 id="delete-all-title">{t("settings.deleteAllTitle")}</h2>
          <p id="delete-all-description">
            {t("settings.deleteAllDescription")}
          </p>
          <label className="field">
            <span>
              {t("settings.deleteAllConfirmation")} {DELETE_CONFIRMATION}
            </span>
            <input
              value={confirmation}
              autoComplete="off"
              disabled={deleting}
              data-dialog-initial-focus
              onChange={(event) => setConfirmation(event.target.value)}
            />
          </label>
          <DataWriteError error={deleteError} />
          <div className="dialog-actions">
            <button
              className="button button-secondary"
              type="button"
              disabled={deleting}
              onClick={closeDialog}
            >
              {t("common.cancel")}
            </button>
            <button
              className="button button-danger"
              type="button"
              disabled={deleting || confirmation !== DELETE_CONFIRMATION}
              onClick={() => void confirmDelete()}
            >
              {deleting ? t("common.deleting") : t("settings.deleteAll")}
            </button>
          </div>
        </ModalDialog>
      ) : null}
    </section>
  );
}
