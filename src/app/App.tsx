import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "../features/auth/AuthProvider";
import { TransactionProvider } from "../features/transactions/TransactionProvider";
import { I18nProvider } from "../i18n";
import { AppRouter } from "./router";

export function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <TransactionProvider>
          <BrowserRouter>
            <AppRouter />
          </BrowserRouter>
        </TransactionProvider>
      </AuthProvider>
    </I18nProvider>
  );
}
