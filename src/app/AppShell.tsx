import { Home, List, LogOut, Plus, Settings, WalletCards } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthProvider";
import { useI18n } from "../i18n";

const navigation = [
  { to: "/app/overview", key: "nav.overview", icon: Home },
  { to: "/app/transactions", key: "nav.transactions", icon: List },
  { to: "/app/settings", key: "nav.settings", icon: Settings },
] as const;

export function AppShell() {
  const { t } = useI18n();
  const { user, signOutUser } = useAuth();
  const navigate = useNavigate();

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
        <nav className="sidebar-nav" aria-label="Primary">
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
        <Outlet />
      </main>

      <NavLink
        to="/app/transactions/new"
        className="mobile-add-button"
        aria-label={t("transaction.add")}
      >
        <Plus size={28} aria-hidden="true" />
      </NavLink>

      <nav className="mobile-navigation" aria-label="Primary">
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
