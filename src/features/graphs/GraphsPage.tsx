import { useMemo } from "react";
import { useAppRuntime } from "../../app/AppRuntime";
import { useI18n } from "../../i18n";
import { asMoneyAmount, formatMoney } from "../../lib/money";
import { PeriodSelector } from "../period/PeriodSelector";
import { usePeriod } from "../period/PeriodProvider";
import { useTransactions } from "../transactions/TransactionProvider";
import { createGraphBuckets } from "./graphData";

export function GraphsPage() {
  const { locale, t } = useI18n();
  const { displayCurrency } = useAppRuntime();
  const { transactions } = useTransactions();
  const { period, setPeriod } = usePeriod();
  const buckets = useMemo(
    () => createGraphBuckets(transactions, period, locale),
    [locale, period, transactions],
  );
  const maximum = Math.max(
    1,
    ...buckets.flatMap((bucket) => [bucket.incomeMinor, bucket.expenseMinor]),
  );
  const money = (amount: number) =>
    formatMoney(asMoneyAmount(amount), locale, displayCurrency);
  const signedMoney = (amount: number, sign: "+" | "−") =>
    amount === 0 ? money(amount) : `${sign}${money(amount)}`;
  const barHeight = (amount: number) =>
    amount === 0 ? 0 : Math.max(2, (amount / maximum) * 100);

  return (
    <div className="page graph-page">
      <PeriodSelector period={period} onChange={setPeriod} />
      <section className="content-section graph-section">
        <div className="section-heading graph-heading">
          <div>
            <h2>{t("graph.heading")}</h2>
            <p>{t("graph.description")}</p>
          </div>
          <div className="graph-legend" aria-label={t("graph.heading")}>
            <span>
              <i className="legend-swatch legend-income" />
              {t("graph.legendIncome")}
            </span>
            <span>
              <i className="legend-swatch legend-expense" />
              {t("graph.legendExpense")}
            </span>
          </div>
        </div>

        {buckets.length === 0 ? (
          <p className="empty-copy" role="status" aria-live="polite">
            {t("graph.empty")}
          </p>
        ) : (
          <>
            <div
              className="cash-flow-chart"
              role="img"
              aria-label={`${t("graph.heading")}. ${t("graph.description")}`}
            >
              <div className="chart-buckets">
                {buckets.map((bucket) => (
                  <div className="chart-bucket" key={bucket.key}>
                    <div className="chart-bars">
                      <span
                        className="chart-bar chart-bar-income"
                        style={{ height: `${barHeight(bucket.incomeMinor)}%` }}
                        aria-label={`${bucket.label}, ${t("graph.legendIncome")}: ${money(bucket.incomeMinor)}`}
                        title={`${t("graph.legendIncome")}: ${money(bucket.incomeMinor)}`}
                      />
                      <span
                        className="chart-bar chart-bar-expense"
                        style={{ height: `${barHeight(bucket.expenseMinor)}%` }}
                        aria-label={`${bucket.label}, ${t("graph.legendExpense")}: ${money(bucket.expenseMinor)}`}
                        title={`${t("graph.legendExpense")}: ${money(bucket.expenseMinor)}`}
                      />
                    </div>
                    <span className="chart-label">{bucket.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="graph-values" aria-label={t("graph.details")}>
              {buckets.map((bucket) => (
                <div className="graph-value-row" key={bucket.key}>
                  <strong>{bucket.label}</strong>
                  <span className="amount-income">
                    {signedMoney(bucket.incomeMinor, "+")}
                  </span>
                  <span className="amount-expense">
                    {signedMoney(bucket.expenseMinor, "−")}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
