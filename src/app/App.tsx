import { BrowserRouter } from "react-router-dom";
import { AuthProvider, useAuth } from "../features/auth/AuthProvider";
import { HouseholdProvider } from "../features/household/HouseholdProvider";
import { TransactionProvider } from "../features/transactions/TransactionProvider";
import { I18nProvider } from "../i18n";
import { AppRouter } from "./router";

function UserDataProviders() {
  const { user } = useAuth();
  return (
    <HouseholdProvider key={user?.uid ?? "signed-out"}>
      <TransactionProvider>
        <BrowserRouter>
          <AppRouter />
        </BrowserRouter>
      </TransactionProvider>
    </HouseholdProvider>
  );
}

export function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <UserDataProviders />
      </AuthProvider>
    </I18nProvider>
  );
}
