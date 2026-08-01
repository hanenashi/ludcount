import { Home, List, LogOut, Plus, Settings } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { DataStatePanel, OfflineBanner } from "../components/DataState";
import { SkipLink } from "../components/SkipLink";
import { useCategories } from "../features/categories/CategoryProvider";
import { useTransactions } from "../features/transactions/TransactionProvider";
import { useI18n } from "../i18n";
import { useOnlineStatus } from "../lib/useOnlineStatus";
import { useAppRuntime } from "./AppRuntime";

const navigation = [
  { path: "overview", key: "nav.overview", icon: Home },
  { path: "transactions", key: "nav.transactions", icon: List },
  { path: "settings", key: "nav.settings", icon: Settings },
] as const;

function RouteAccessibility() {
  const { pathname } = useLocation();
  const previousPath = useRef(pathname);

  useEffect(() => {
    const routeChanged = previousPath.current !== pathname;
    previousPath.current = pathname;
    window.scrollTo(0, 0);

    if (
      !routeChanged ||
      pathname === "/app/transactions/new" ||
      pathname.endsWith("/edit")
    ) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const heading = document.querySelector<HTMLElement>(".app-main h1");
      if (heading) {
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  return null;
}

export function AppShell() {
  const { t } = useI18n();
  const runtime = useAppRuntime();
  const transactionState = useTransactions();
  const categoryState = useCategories();
  const isOnline = useOnlineStatus();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [signOutError, setSignOutError] = useState(false);
  const loading =
    runtime.status === "loading" ||
    (runtime.status === "ready" && categoryState.status === "loading") ||
    (runtime.status === "ready" && transactionState.status === "loading");
  const blockingError =
    runtime.error ??
    (categoryState.status === "error" ? categoryState.error : null) ??
    (transactionState.status === "error" ? transactionState.error : null);
  const dataReady =
    runtime.status === "ready" &&
    (categoryState.status === "ready" || categoryState.status === "offline") &&
    (transactionState.status === "ready" ||
      transactionState.status === "offline");
  const offline =
    runtime.mode === "production" &&
    (!isOnline ||
      categoryState.status === "offline" ||
      transactionState.status === "offline");
  const showMobileAdd = dataReady && pathname.endsWith("/overview");

  const handleSignOut = async () => {
    setSignOutError(false);
    try {
      await runtime.exit();
      navigate("/sign-in");
    } catch {
      setSignOutError(true);
    }
  };

  return (
    <div
      className={
        runtime.mode === "demo" ? "app-shell app-shell-demo" : "app-shell"
      }
    >
      <SkipLink targetId="main-content" />
      <RouteAccessibility />
      <aside className="sidebar">
        <div className="brand">
          <img
            className="brand-logo"
            src="/prsk-256.png"
            alt=""
            aria-hidden="true"
          />
          <span>Ludcount</span>
        </div>
        {runtime.mode === "demo" ? (
          <span className="demo-badge">{t("demo.badge")}</span>
        ) : null}
        <nav className="sidebar-nav" aria-label={t("nav.primary")}>
          {navigation.map(({ path, key, icon: Icon }) => (
            <NavLink
              className={({ isActive }) =>
                `nav-link${isActive ? " nav-link-active" : ""}`
              }
              key={path}
              to={`${runtime.basePath}/${path}`}
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
          {runtime.mode === "demo" ? t("demo.exit") : t("nav.signOut")}
        </button>
        {signOutError ? (
          <p className="sidebar-error" role="alert">
            {t("auth.error.signOut")}
          </p>
        ) : null}
      </aside>

      <div className="mobile-header">
        <div className="brand">
          <img
            className="brand-logo"
            src="/prsk-256.png"
            alt=""
            aria-hidden="true"
          />
          <span>Ludcount</span>
        </div>
        <span className="mobile-user" title={runtime.userLabel}>
          {runtime.userLabel.slice(0, 1).toUpperCase()}
        </span>
      </div>

      <main className="app-main" id="main-content" tabIndex={-1}>
        {runtime.mode === "demo" ? (
          <div
            className="demo-banner"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <span>{t("demo.banner")}</span>
            <button
              className="demo-banner-exit"
              type="button"
              onClick={handleSignOut}
            >
              {t("demo.exit")}
            </button>
          </div>
        ) : null}
        {loading ? (
          <DataStatePanel
            loading
            onRetry={() => {
              runtime.retry();
              categoryState.retry();
              transactionState.retry();
            }}
          />
        ) : blockingError ? (
          <DataStatePanel
            error={blockingError}
            onRetry={() => {
              runtime.retry();
              categoryState.retry();
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

      {showMobileAdd ? (
        <NavLink
          to={`${runtime.basePath}/transactions/new`}
          className="mobile-add-button"
          aria-label={t("transaction.add")}
        >
          <Plus size={28} aria-hidden="true" />
        </NavLink>
      ) : null}

      <nav className="mobile-navigation" aria-label={t("nav.primary")}>
        {navigation.map(({ path, key, icon: Icon }) => (
          <NavLink
            className={({ isActive }) =>
              `mobile-nav-link${isActive ? " mobile-nav-link-active" : ""}`
            }
            key={path}
            to={`${runtime.basePath}/${path}`}
          >
            <Icon size={23} aria-hidden="true" />
            <span>{t(key)}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
