import { ArrowLeft, Archive, ArchiveRestore, Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { DataWriteError } from "../../components/DataState";
import {
  normalizeDataError,
  type DataOperationError,
} from "../../firebase/errors";
import { useI18n } from "../../i18n";
import type { CustomCategory, TransactionType } from "../transactions/model";
import { useAppRuntime } from "../../app/AppRuntime";
import { useCategories } from "./CategoryProvider";

function CustomCategoryRow({
  category,
  canManage,
}: {
  category: CustomCategory;
  canManage: boolean;
}) {
  const { t } = useI18n();
  const { renameCategory, setCategoryArchived } = useCategories();
  const [name, setName] = useState(category.name);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<DataOperationError | null>(null);

  const saveName = async (event: FormEvent) => {
    event.preventDefault();
    const normalized = name.trim();
    if (!normalized || normalized.length > 60 || normalized === category.name) {
      setName(category.name);
      return;
    }
    setWorking(true);
    setError(null);
    try {
      await renameCategory(category.id, normalized);
    } catch (nextError) {
      setError(normalizeDataError(nextError, "write-failure"));
    } finally {
      setWorking(false);
    }
  };

  const toggleArchived = async () => {
    setWorking(true);
    setError(null);
    try {
      await setCategoryArchived(category.id, !category.archived);
    } catch (nextError) {
      setError(normalizeDataError(nextError, "write-failure"));
    } finally {
      setWorking(false);
    }
  };

  if (!canManage) {
    return (
      <li className="custom-category-row custom-category-row-readonly">
        <strong>{category.name}</strong>
        <span className="category-type-label">
          {category.type === "expense"
            ? t("transaction.type.expense")
            : t("transaction.type.income")}
        </span>
        {category.archived ? (
          <span className="category-archived-label">
            {t("category.archived")}
          </span>
        ) : null}
      </li>
    );
  }

  return (
    <li className="custom-category-row">
      <form onSubmit={(event) => void saveName(event)}>
        <label>
          <span className="sr-only">{t("category.name")}</span>
          <input
            value={name}
            maxLength={60}
            disabled={working || category.archived}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <span className="category-type-label">
          {category.type === "expense"
            ? t("transaction.type.expense")
            : t("transaction.type.income")}
        </span>
        {category.archived ? (
          <span className="category-archived-label">
            {t("category.archived")}
          </span>
        ) : null}
        <button
          className="button button-secondary"
          type="submit"
          disabled={
            working || category.archived || name.trim() === category.name
          }
        >
          {t("common.save")}
        </button>
        <button
          className="button button-secondary"
          type="button"
          disabled={working}
          onClick={() => void toggleArchived()}
        >
          {category.archived ? (
            <ArchiveRestore size={17} aria-hidden="true" />
          ) : (
            <Archive size={17} aria-hidden="true" />
          )}
          {category.archived ? t("category.restore") : t("category.archive")}
        </button>
      </form>
      <DataWriteError error={error} />
    </li>
  );
}

export function CategoryManagementPage() {
  const { t } = useI18n();
  const runtime = useAppRuntime();
  const { customCategories, canManage, createCategory } = useCategories();
  const [name, setName] = useState("");
  const [type, setType] = useState<TransactionType>("expense");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<DataOperationError | null>(null);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    const normalized = name.trim();
    if (!normalized || normalized.length > 60) return;
    setWorking(true);
    setError(null);
    try {
      await createCategory(normalized, type);
      setName("");
    } catch (nextError) {
      setError(normalizeDataError(nextError, "write-failure"));
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="page settings-page category-management-page">
      <Link className="back-link" to={`${runtime.basePath}/settings`}>
        <ArrowLeft size={18} aria-hidden="true" />
        {t("category.backToSettings")}
      </Link>
      <h1>{t("category.manageHeading")}</h1>
      <p className="page-description">{t("category.manageDescription")}</p>

      {!canManage ? (
        <p className="form-notice form-notice-error" role="alert">
          {t("category.ownerOnly")}
        </p>
      ) : (
        <section className="category-create-section">
          <h2>{t("category.createHeading")}</h2>
          <form
            className="category-create-form"
            onSubmit={(event) => void create(event)}
          >
            <label className="field">
              <span>{t("category.name")}</span>
              <input
                required
                maxLength={60}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <label className="field">
              <span>{t("transaction.type")}</span>
              <select
                value={type}
                onChange={(event) =>
                  setType(event.target.value as TransactionType)
                }
              >
                <option value="expense">{t("transaction.type.expense")}</option>
                <option value="income">{t("transaction.type.income")}</option>
              </select>
            </label>
            <button
              className="button button-primary"
              type="submit"
              disabled={working || !name.trim()}
            >
              <Plus size={18} aria-hidden="true" />
              {t("category.create")}
            </button>
          </form>
          <DataWriteError error={error} />
        </section>
      )}

      <section className="category-list-section">
        <h2>{t("category.customHeading")}</h2>
        {customCategories.length === 0 ? (
          <p className="category-empty">{t("category.empty")}</p>
        ) : (
          <ul className="custom-category-list">
            {customCategories.map((category) => (
              <CustomCategoryRow
                key={category.id}
                category={category}
                canManage={canManage}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
