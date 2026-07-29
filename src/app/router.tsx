import { useMemo } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { AppShell } from "./AppShell";
import { DemoRuntimeProvider, ProductionRuntimeProvider } from "./AppRuntime";
import { useAuth } from "../features/auth/AuthProvider";
import { AuthProvider } from "../features/auth/AuthProvider";
import { SignInPage } from "../features/auth/SignInPage";
import { OverviewPage } from "../features/dashboard/OverviewPage";
import { DemoTransactionRepository } from "../features/demo/DemoTransactionRepository";
import { HouseholdProvider } from "../features/household/HouseholdProvider";
import { SettingsPage } from "../features/settings/SettingsPage";
import { TransactionFormPage } from "../features/transactions/TransactionFormPage";
import { TransactionProvider } from "../features/transactions/TransactionProvider";
import { TransactionsPage } from "../features/transactions/TransactionsPage";
import { createFirestoreTransactionRepository } from "../firebase/transactionRepository";
import { useI18n } from "../i18n";
import { getFirebaseServices } from "../lib/firebase";
import { useHousehold } from "../features/household/HouseholdProvider";

function ProductionAuthBoundary() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}

function ProductionDataProviders() {
  const { user } = useAuth();
  const household = useHousehold();
  const householdId = household.workspace?.household.id;
  const repository = useMemo(
    () =>
      user && householdId
        ? createFirestoreTransactionRepository(
            getFirebaseServices().firestore,
            householdId,
            user.uid,
          )
        : null,
    [householdId, user],
  );

  return (
    <TransactionProvider
      repository={repository}
      waiting={household.status === "loading"}
    >
      <ProductionRuntimeProvider>
        <AppShell />
      </ProductionRuntimeProvider>
    </TransactionProvider>
  );
}

function ProtectedApp() {
  const { user, loading } = useAuth();
  const { t } = useI18n();

  if (loading) {
    return (
      <div
        className="loading-screen"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {t("common.loading")}
      </div>
    );
  }
  return user ? (
    <HouseholdProvider key={user.uid}>
      <ProductionDataProviders />
    </HouseholdProvider>
  ) : (
    <Navigate to="/sign-in" replace />
  );
}

function DemoApp() {
  const { t } = useI18n();
  const repository = useMemo(() => new DemoTransactionRepository(), []);

  return (
    <TransactionProvider repository={repository} observeOnline={false}>
      <DemoRuntimeProvider
        repository={repository}
        userLabel={t("demo.identity")}
      >
        <AppShell />
      </DemoRuntimeProvider>
    </TransactionProvider>
  );
}

export function AppRouter() {
  return (
    <Routes>
      <Route element={<ProductionAuthBoundary />}>
        <Route path="/sign-in" element={<SignInPage />} />
        <Route path="/app" element={<ProtectedApp />}>
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<OverviewPage />} />
          <Route path="transactions" element={<TransactionsPage />} />
          <Route path="transactions/new" element={<TransactionFormPage />} />
          <Route
            path="transactions/:id/edit"
            element={<TransactionFormPage />}
          />
          <Route path="settings" element={<SettingsPage />} />
          <Route
            path="settings/categories"
            element={<Navigate to="/app/settings" replace />}
          />
        </Route>
      </Route>
      <Route path="/demo" element={<DemoApp />}>
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<OverviewPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="transactions/new" element={<TransactionFormPage />} />
        <Route path="transactions/:id/edit" element={<TransactionFormPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route
          path="settings/categories"
          element={<Navigate to="/demo/settings" replace />}
        />
      </Route>
      <Route path="*" element={<Navigate to="/sign-in" replace />} />
    </Routes>
  );
}
