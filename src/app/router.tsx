import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./AppShell";
import { useAuth } from "../features/auth/AuthProvider";
import { SignInPage } from "../features/auth/SignInPage";
import { OverviewPage } from "../features/dashboard/OverviewPage";
import { SettingsPage } from "../features/settings/SettingsPage";
import { TransactionFormPage } from "../features/transactions/TransactionFormPage";
import { TransactionsPage } from "../features/transactions/TransactionsPage";
import { useI18n } from "../i18n";

function ProtectedApp() {
  const { user, loading } = useAuth();
  const { t } = useI18n();

  if (loading) {
    return (
      <div className="loading-screen" role="status">
        {t("common.loading")}
      </div>
    );
  }
  return user ? <AppShell /> : <Navigate to="/sign-in" replace />;
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/sign-in" element={<SignInPage />} />
      <Route path="/app" element={<ProtectedApp />}>
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<OverviewPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="transactions/new" element={<TransactionFormPage />} />
        <Route path="transactions/:id/edit" element={<TransactionFormPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route
          path="settings/categories"
          element={<Navigate to="/app/settings" replace />}
        />
      </Route>
      <Route path="*" element={<Navigate to="/app/overview" replace />} />
    </Routes>
  );
}
