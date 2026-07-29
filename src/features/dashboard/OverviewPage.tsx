import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MonthNavigator } from "../../components/MonthNavigator";
import { useI18n } from "../../i18n";
import { monthKeyFromDate } from "../../lib/dates";
import { asMoneyAmount, formatMoney } from "../../lib/money";
import { getCategory } from "../transactions/model";
import { calculateTotals } from "../transactions/repository";
import { TransactionList } from "../transactions/TransactionList";
import { useTransactions } from "../transactions/TransactionProvider";

export function OverviewPage() {
  const { locale, t } = useI18n();
  const { transactions } = useTransactions();
  const [monthKey, setMonthKey] = useState(monthKeyFromDate(new Date()));
  const monthlyTransactions = useMemo(
    () =>
      transactions.filter((transaction) => transaction.monthKey === monthKey),
    [monthKey, transactions],
  );
  const totals = calculateTotals(monthlyTransactions);
  const expenseByCategory = useMemo(() => {
    const amounts = new Map<string, number>();
    for (const transaction of monthlyTransactions) {
      if (transaction.type === "expense") {
        amounts.set(
          transaction.categoryId,
          (amounts.get(transaction.categoryId) ?? 0) + transaction.amountMinor,
        );
      }
    }
    return [...amounts.entries()].sort((left, right) => right[1] - left[1]);
  }, [monthlyTransactions]);
  const balanceClass =
    totals.balanceMinor < 0 ? "summary-value-expense" : "summary-value-balance";

  return (
    <div className="page page-overview">
      <MonthNavigator monthKey={monthKey} onChange={setMonthKey} />

      <section className="summary-band" aria-label={t("nav.overview")}>
        <div className="summary-item">
          <span>{t("overview.income")}</span>
          <strong className="summary-value-income">
            {formatMoney(totals.income, locale)}
          </strong>
        </div>
        <div className="summary-item">
          <span>{t("overview.expenses")}</span>
          <strong className="summary-value-expense">
            {formatMoney(totals.expenses, locale)}
          </strong>
        </div>
        <div className="summary-item">
          <span>{t("overview.balance")}</span>
          <strong className={balanceClass}>
            {totals.balanceMinor < 0 ? "−" : ""}
            {formatMoney(asMoneyAmount(Math.abs(totals.balanceMinor)), locale)}
          </strong>
        </div>
      </section>

      <Link
        className="button button-primary desktop-add-button"
        to="/app/transactions/new"
      >
        <Plus size={19} aria-hidden="true" />
        {t("transaction.add")}
      </Link>

      <div className="overview-grid">
        <section className="content-section">
          <div className="section-heading">
            <h2>{t("overview.latest")}</h2>
            <Link to="/app/transactions">{t("overview.viewAll")}</Link>
          </div>
          {monthlyTransactions.length === 0 ? (
            <div className="empty-state" role="status" aria-live="polite">
              <p>{t("overview.empty")}</p>
              <Link className="text-link" to="/app/transactions/new">
                {t("overview.emptyAction")}
              </Link>
            </div>
          ) : (
            <TransactionList
              compact
              transactions={monthlyTransactions.slice(0, 5)}
            />
          )}
        </section>

        <section className="content-section category-section">
          <h2>{t("overview.byCategory")}</h2>
          {expenseByCategory.length === 0 ? (
            <p className="empty-copy" role="status" aria-live="polite">
              {t("overview.empty")}
            </p>
          ) : (
            <div className="category-totals">
              {expenseByCategory.map(([categoryId, amount]) => {
                const category = getCategory(categoryId);
                return (
                  <div className="category-total" key={categoryId}>
                    <span>{category ? t(category.labelKey) : categoryId}</span>
                    <strong>
                      {formatMoney(asMoneyAmount(amount), locale)}
                    </strong>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
