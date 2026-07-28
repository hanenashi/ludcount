import { CloudOff, RefreshCw, ShieldAlert, TriangleAlert } from "lucide-react";
import type { DataOperationError } from "../firebase/errors";
import { useI18n } from "../i18n";

interface DataStatePanelProps {
  loading?: boolean;
  error?: DataOperationError | null;
  onRetry: () => void;
}

export function DataStatePanel({
  loading = false,
  error,
  onRetry,
}: DataStatePanelProps) {
  const { t } = useI18n();

  if (loading) {
    return (
      <section className="data-state-panel" role="status">
        <RefreshCw className="state-icon state-icon-spin" aria-hidden="true" />
        <h1>{t("data.loadingTitle")}</h1>
        <p>{t("data.loadingDescription")}</p>
      </section>
    );
  }

  const permissionDenied = error?.kind === "permission-denied";
  const invalidData = error?.kind === "invalid-data";
  const Icon = permissionDenied ? ShieldAlert : TriangleAlert;

  return (
    <section className="data-state-panel" role="alert">
      <Icon className="state-icon state-icon-error" aria-hidden="true" />
      <h1>
        {permissionDenied
          ? t("data.permissionTitle")
          : invalidData
            ? t("data.invalidTitle")
            : t("data.errorTitle")}
      </h1>
      <p>
        {permissionDenied
          ? t("data.permissionDescription")
          : invalidData
            ? t("data.invalidDescription")
            : t("data.errorDescription")}
      </p>
      <button
        className="button button-secondary"
        type="button"
        onClick={onRetry}
      >
        <RefreshCw size={18} aria-hidden="true" />
        {t("data.retry")}
      </button>
    </section>
  );
}

export function OfflineBanner({ pending = false }: { pending?: boolean }) {
  const { t } = useI18n();
  return (
    <div className="connection-banner" role="status">
      <CloudOff size={18} aria-hidden="true" />
      <span>
        <strong>{t("data.offlineTitle")}</strong>{" "}
        {pending ? t("data.pending") : t("data.offlineDescription")}
      </span>
    </div>
  );
}

export function DataWriteError({
  error,
}: {
  error: DataOperationError | null;
}) {
  const { t } = useI18n();
  if (!error) {
    return null;
  }

  return (
    <p className="form-notice form-notice-error" role="alert">
      {error.kind === "offline"
        ? t("data.writeOffline")
        : error.kind === "permission-denied"
          ? t("data.writePermission")
          : t("data.writeFailure")}
    </p>
  );
}
