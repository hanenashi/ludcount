import { ListFilter } from "lucide-react";
import { categories } from "./model";
import type {
  TransactionFilters as FilterValues,
  TransactionTypeFilter,
} from "./filters";
import { useI18n } from "../../i18n";

interface TransactionFiltersProps {
  filters: Pick<FilterValues, "type" | "categoryId" | "noteQuery">;
  activeCount: number;
  onTypeChange: (type: TransactionTypeFilter) => void;
  onCategoryChange: (categoryId: string) => void;
  onNoteQueryChange: (query: string) => void;
  onReset: () => void;
}

export function TransactionFilters({
  filters,
  activeCount,
  onTypeChange,
  onCategoryChange,
  onNoteQueryChange,
  onReset,
}: TransactionFiltersProps) {
  const { t } = useI18n();

  return (
    <details className="transaction-filters">
      <summary>
        <ListFilter size={18} aria-hidden="true" />
        <span>{t("transaction.filters")}</span>
        {activeCount > 0 ? (
          <span
            className="filter-count"
            aria-label={t("transaction.activeFilters")}
          >
            {activeCount}
          </span>
        ) : null}
      </summary>
      <div className="filter-controls">
        <label>
          <span>{t("transaction.filterType")}</span>
          <select
            value={filters.type}
            onChange={(event) =>
              onTypeChange(event.target.value as TransactionTypeFilter)
            }
          >
            <option value="all">{t("transaction.filterAllTypes")}</option>
            <option value="expense">{t("transaction.type.expense")}</option>
            <option value="income">{t("transaction.type.income")}</option>
          </select>
        </label>

        <label>
          <span>{t("transaction.filterCategory")}</span>
          <select
            value={filters.categoryId}
            onChange={(event) => onCategoryChange(event.target.value)}
          >
            <option value="all">{t("transaction.filterAllCategories")}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {t(category.labelKey)}
              </option>
            ))}
          </select>
        </label>

        <label className="filter-search">
          <span>{t("transaction.searchNotes")}</span>
          <input
            type="search"
            value={filters.noteQuery}
            placeholder={t("transaction.searchPlaceholder")}
            onChange={(event) => onNoteQueryChange(event.target.value)}
          />
        </label>

        <button
          className="button button-secondary filter-reset"
          type="button"
          onClick={onReset}
        >
          {t("transaction.resetFilters")}
        </button>
      </div>
    </details>
  );
}
