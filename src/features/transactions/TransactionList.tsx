import { ChevronRight, Copy, Pencil, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useAppRuntime } from "../../app/AppRuntime";
import { useI18n } from "../../i18n";
import { formatDateKey } from "../../lib/dates";
import { formatMoney } from "../../lib/money";
import { useCategories } from "../categories/CategoryProvider";
import type { Transaction } from "./model";

interface TransactionListProps {
  transactions: readonly Transaction[];
  onDelete?: (transaction: Transaction) => void;
  compact?: boolean;
  emptyMessage?: string;
}

export function TransactionList({
  transactions,
  onDelete,
  compact = false,
  emptyMessage,
}: TransactionListProps) {
  const { locale, t } = useI18n();
  const { basePath } = useAppRuntime();
  const { categoryFor, labelFor } = useCategories();

  if (transactions.length === 0) {
    return (
      <p
        className="empty-copy"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {emptyMessage ?? t("transaction.empty")}
      </p>
    );
  }

  return (
    <div
      className="transaction-list"
      role="list"
      aria-label={t("transaction.listHeading")}
    >
      {transactions.map((transaction) => {
        const category = categoryFor(transaction.categoryId);
        const categoryName = category
          ? labelFor(category)
          : transaction.categoryLabelSnapshot;
        const date = formatDateKey(transaction.dateKey, locale);
        const amount = formatMoney(transaction.amountMinor, locale);
        const actionContext = `${categoryName}, ${date}, ${amount}`;

        return (
          <article
            className="transaction-row"
            key={transaction.id}
            role="listitem"
          >
            <div
              className={`transaction-symbol transaction-symbol-${transaction.type}`}
              aria-hidden="true"
            >
              {transaction.type === "income" ? "+" : "−"}
            </div>
            <div className="transaction-copy">
              <strong>{categoryName}</strong>
              <span>
                {date}
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
                to={`${basePath}/transactions/${transaction.id}/edit`}
                aria-label={`${t("common.edit")} – ${actionContext}`}
              >
                <ChevronRight size={22} aria-hidden="true" />
              </Link>
            ) : (
              <div
                className="row-actions"
                role="group"
                aria-label={`${t("transaction.actions")} – ${actionContext}`}
              >
                <Link
                  className="icon-button"
                  to={`${basePath}/transactions/new?duplicate=${encodeURIComponent(transaction.id)}`}
                  aria-label={`${t("transaction.duplicate")} – ${actionContext}`}
                >
                  <Copy size={18} aria-hidden="true" />
                </Link>
                <Link
                  className="icon-button"
                  to={`${basePath}/transactions/${transaction.id}/edit`}
                  aria-label={`${t("common.edit")} – ${actionContext}`}
                >
                  <Pencil size={18} aria-hidden="true" />
                </Link>
                {onDelete ? (
                  <button
                    className="icon-button icon-button-danger"
                    type="button"
                    onClick={() => onDelete(transaction)}
                    aria-label={`${t("common.delete")} – ${actionContext}`}
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
