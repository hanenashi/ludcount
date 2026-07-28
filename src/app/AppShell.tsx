import { Home, List, LogOut, Plus, Settings, WalletCards } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { DataStatePanel, OfflineBanner } from "../components/DataState";
import { useAuth } from "../features/auth/AuthProvider";
import { useHousehold } from "../features/household/HouseholdProvider";
import { useTransactions } from "../features/transactions/TransactionProvider";
import { useI18n } from "../i18n";
import { useOnlineStatus } from "../lib/useOnlineStatus";

const navigation = [
  { to: "/app/overview", key: "nav.overview", icon: Home },
  { to: "/app/transactions", key: "nav.transactions", icon: List },
  { to: "/app/settings", key: "nav.settings", icon: Settings },
] as const;

export function AppShell() {
  const { t } = useI18n();
  const { user, signOutUser } = useAuth();
  const household = useHousehold();
  const transactionState = useTransactions();
  const isOnline = useOnlineStatus();
  const navigate = useNavigate();
  const loading =
    household.status === "loading" ||
    (household.status === "ready" && transactionState.status === "loading");
  const blockingError =
    household.error ??
    (transactionState.status === "error" ? transactionState.error : null);
  const dataReady =
    household.status === "ready" &&
    (transactionState.status === "ready" ||
      transactionState.status === "offline");
  const offline = !isOnline || transactionState.status === "offline";

  const handleSignOut = async () => {
    await signOutUser();
    navigate("/sign-in");
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <WalletCards size={25} />
          </span>
          <span>Ludcount</span>
        </div>
        <nav className="sidebar-nav" aria-label={t("nav.primary")}>
          {navigation.map(({ to, key, icon: Icon }) => (
            <NavLink
              className={({ isActive }) =>
                `nav-link${isActive ? " nav-link-active" : ""}`
              }
              key={to}
              to={to}
            >
              <Icon size={21} aria-hidden="true" />
              {t(key)}
            </NavLink>
          ))}
        </nav>
        <button
          className="sign-out-button"
          type="button"
          onClick={handleSignOut}
        >
          <LogOut size={20} aria-hidden="true" />
          {t("nav.signOut")}
        </button>
      </aside>

      <div className="mobile-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <WalletCards size={23} />
          </span>
          <span>Ludcount</span>
        </div>
        <span className="mobile-user" title={user?.email ?? undefined}>
          {(user?.displayName ?? user?.email ?? "L").slice(0, 1).toUpperCase()}
        </span>
      </div>

      <main className="app-main">
        {loading ? (
          <DataStatePanel
            loading
            onRetry={() => {
              household.retry();
              transactionState.retry();
            }}
          />
        ) : blockingError ? (
          <DataStatePanel
            error={blockingError}
            onRetry={() => {
              household.retry();
              transactionState.retry();
            }}
          />
        ) : dataReady ? (
          <>
            {offline ? (
              <OfflineBanner pending={transactionState.hasPendingWrites} />
            ) : null}
            <Outlet />
          </>
        ) : null}
      </main>

      {dataReady ? (
        <NavLink
          to="/app/transactions/new"
          className="mobile-add-button"
          aria-label={t("transaction.add")}
        >
          <Plus size={28} aria-hidden="true" />
        </NavLink>
      ) : null}

      <nav className="mobile-navigation" aria-label={t("nav.primary")}>
        {navigation.map(({ to, key, icon: Icon }) => (
          <NavLink
            className={({ isActive }) =>
              `mobile-nav-link${isActive ? " mobile-nav-link-active" : ""}`
            }
            key={to}
            to={to}
          >
            <Icon size={23} aria-hidden="true" />
            <span>{t(key)}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
