import { Plus } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { PeriodSelector } from "../period/PeriodSelector";
import { useAppRuntime } from "../../app/AppRuntime";
import { useI18n } from "../../i18n";
import { periodContainsDate } from "../period/period";
import { usePeriod } from "../period/PeriodProvider";
import { asMoneyAmount, formatMoney } from "../../lib/money";
import { useCategories } from "../categories/CategoryProvider";
import { calculateTotals } from "../transactions/repository";
import { TransactionList } from "../transactions/TransactionList";
import { useTransactions } from "../transactions/TransactionProvider";

export function OverviewPage() {
  const { locale, t } = useI18n();
  const { basePath, displayCurrency } = useAppRuntime();
  const { transactions } = useTransactions();
  const { period, setPeriod } = usePeriod();
  const { categoryFor, labelFor } = useCategories();
  const periodTransactions = useMemo(
    () =>
      transactions.filter((transaction) =>
        periodContainsDate(period, transaction.dateKey),
      ),
    [period, transactions],
  );
  const totals = calculateTotals(periodTransactions);
  const expenseByCategory = useMemo(() => {
    const amounts = new Map<string, number>();
    for (const transaction of periodTransactions) {
      if (transaction.type === "expense") {
        amounts.set(
          transaction.categoryId,
          (amounts.get(transaction.categoryId) ?? 0) + transaction.amountMinor,
        );
      }
    }
    return [...amounts.entries()].sort((left, right) => right[1] - left[1]);
  }, [periodTransactions]);
  const balanceClass =
    totals.balanceMinor < 0 ? "summary-value-expense" : "summary-value-balance";

  return (
    <div className="page page-overview">
      <PeriodSelector period={period} onChange={setPeriod} />

      <section className="summary-band" aria-label={t("nav.overview")}>
        <div className="summary-item">
          <span>{t("overview.income")}</span>
          <strong className="summary-value-income">
            {formatMoney(totals.income, locale, displayCurrency)}
          </strong>
        </div>
        <div className="summary-item">
          <span>{t("overview.expenses")}</span>
          <strong className="summary-value-expense">
            {formatMoney(totals.expenses, locale, displayCurrency)}
          </strong>
        </div>
        <div className="summary-item">
          <span>{t("overview.balance")}</span>
          <strong className={balanceClass}>
            {totals.balanceMinor < 0 ? "−" : ""}
            {formatMoney(
              asMoneyAmount(Math.abs(totals.balanceMinor)),
              locale,
              displayCurrency,
            )}
          </strong>
        </div>
      </section>

      <Link
        className="button button-primary desktop-add-button"
        to={`${basePath}/transactions/new`}
      >
        <Plus size={19} aria-hidden="true" />
        {t("transaction.add")}
      </Link>

      <div className="overview-grid">
        <section className="content-section">
          <div className="section-heading">
            <h2>{t("overview.latest")}</h2>
            <Link to={`${basePath}/transactions`}>{t("overview.viewAll")}</Link>
          </div>
          {periodTransactions.length === 0 ? (
            <div className="empty-state" role="status" aria-live="polite">
              <p>{t("overview.empty")}</p>
              <Link className="text-link" to={`${basePath}/transactions/new`}>
                {t("overview.emptyAction")}
              </Link>
            </div>
          ) : (
            <TransactionList
              compact
              transactions={periodTransactions.slice(0, 5)}
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
                const category = categoryFor(categoryId);
                return (
                  <div className="category-total" key={categoryId}>
                    <span>{category ? labelFor(category) : categoryId}</span>
                    <strong>
                      {formatMoney(
                        asMoneyAmount(amount),
                        locale,
                        displayCurrency,
                      )}
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
