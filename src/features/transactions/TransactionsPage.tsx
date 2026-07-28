import { Plus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { MonthNavigator } from "../../components/MonthNavigator";
import { useI18n } from "../../i18n";
import { monthKeyFromDate } from "../../lib/dates";
import type { Transaction } from "./model";
import { TransactionList } from "./TransactionList";
import { useTransactions } from "./TransactionProvider";

export function TransactionsPage() {
  const { t } = useI18n();
  const { transactions, deleteTransaction } = useTransactions();
  const [monthKey, setMonthKey] = useState(monthKeyFromDate(new Date()));
  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null);
  const visibleTransactions = transactions.filter(
    (transaction) => transaction.monthKey === monthKey,
  );

  const confirmDelete = () => {
    if (pendingDelete) {
      deleteTransaction(pendingDelete.id);
      setPendingDelete(null);
    }
  };

  return (
    <div className="page">
      <div className="page-heading-row">
        <MonthNavigator monthKey={monthKey} onChange={setMonthKey} />
        <Link className="button button-primary page-add-button" to="new">
          <Plus size={19} aria-hidden="true" />
          {t("transaction.add")}
        </Link>
      </div>
      <section className="content-section transaction-history">
        <h2>{t("transaction.listHeading")}</h2>
        <TransactionList
          transactions={visibleTransactions}
          onDelete={setPendingDelete}
        />
      </section>

      {pendingDelete ? (
        <div className="dialog-backdrop" role="presentation">
          <div
            className="confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            aria-describedby="delete-description"
          >
            <h2 id="delete-title">{t("transaction.deleteTitle")}</h2>
            <p id="delete-description">{t("transaction.deleteDescription")}</p>
            <div className="form-actions">
              <button
                className="button button-secondary"
                type="button"
                onClick={() => setPendingDelete(null)}
              >
                {t("common.cancel")}
              </button>
              <button
                className="button button-danger"
                type="button"
                onClick={confirmDelete}
              >
                {t("common.delete")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
