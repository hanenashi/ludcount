import { ChevronRight, Pencil, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useI18n } from "../../i18n";
import { formatDateKey } from "../../lib/dates";
import { formatMoney } from "../../lib/money";
import { getCategory, type Transaction } from "./model";

interface TransactionListProps {
  transactions: readonly Transaction[];
  onDelete?: (transaction: Transaction) => void;
  compact?: boolean;
}

export function TransactionList({
  transactions,
  onDelete,
  compact = false,
}: TransactionListProps) {
  const { locale, t } = useI18n();

  if (transactions.length === 0) {
    return <p className="empty-copy">{t("transaction.empty")}</p>;
  }

  return (
    <div className="transaction-list">
      {transactions.map((transaction) => {
        const category = getCategory(transaction.categoryId);
        const amount = formatMoney(transaction.amountMinor, locale);

        return (
          <article className="transaction-row" key={transaction.id}>
            <div
              className={`transaction-symbol transaction-symbol-${transaction.type}`}
              aria-hidden="true"
            >
              {transaction.type === "income" ? "+" : "−"}
            </div>
            <div className="transaction-copy">
              <strong>
                {category ? t(category.labelKey) : transaction.categoryId}
              </strong>
              <span>
                {formatDateKey(transaction.dateKey, locale)}
                {transaction.note ? ` · ${transaction.note}` : ""}
              </span>
            </div>
            <strong className={`amount amount-${transaction.type}`}>
              {transaction.type === "expense" ? "−" : "+"}
              {amount}
            </strong>
            {compact ? (
              <Link
                className="row-link"
                to={`/app/transactions/${transaction.id}/edit`}
                aria-label={`${t("common.edit")} ${category ? t(category.labelKey) : ""}`}
              >
                <ChevronRight size={22} aria-hidden="true" />
              </Link>
            ) : (
              <div className="row-actions">
                <Link
                  className="icon-button"
                  to={`/app/transactions/${transaction.id}/edit`}
                  aria-label={t("common.edit")}
                >
                  <Pencil size={18} aria-hidden="true" />
                </Link>
                {onDelete ? (
                  <button
                    className="icon-button icon-button-danger"
                    type="button"
                    onClick={() => onDelete(transaction)}
                    aria-label={t("common.delete")}
                  >
                    <Trash2 size={18} aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
