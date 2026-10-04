import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { getEngine } from "@engine";
import { isDevMode } from "../utils/dev";
import { ModeBanner } from "../primitives/ModeBanner";
import { ScenarioSwitcher } from "./ScenarioSwitcher";

export function Header() {
  const location = useLocation();
  const engine = getEngine();
  const [savedCount, setSavedCount] = useState(engine.saved.list().length);
  const showDev = isDevMode();

  useEffect(() => {
    return engine.saved.subscribe(() => {
      setSavedCount(engine.saved.list().length);
    });
  }, [engine]);

  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("locus_theme");
      if (saved === "light" || saved === "dark") return saved;
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
    }
    return "light";
  });

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", theme);
    }
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("locus_theme", next);
    }
  };

  return (
    <header className="locus-header" role="banner">
      {/* Dev-only Scenario Switcher (gated in production per §2.2) */}
      {showDev && <ScenarioSwitcher />}

      {/* Mode Banner (§3): Sample data in mock, capture timestamp in snapshot */}
      <ModeBanner />

      <div className="locus-header__bar">
        <div className="locus-header__brand">
          <Link to="/" data-feature="nav-home" className="locus-header__logo" aria-label="Locus Home">
            <span
              data-feature="brand-logo"
              className="locus-header__mark"
              aria-hidden="true"
            />
            <span className="locus-header__wordmark">Locus</span>
          </Link>
        </div>

        <nav data-feature="main-nav" className="locus-header__nav" aria-label="Main Navigation">
          <Link
            to="/plan"
            data-feature="nav-plan"
            className={`locus-header__link ${location.pathname === "/plan" ? "locus-header__link--active" : ""}`}
          >
            Plan
          </Link>

          <Link
            to="/results"
            data-feature="nav-results"
            className={`locus-header__link ${location.pathname === "/results" ? "locus-header__link--active" : ""}`}
          >
            Results
          </Link>

          <Link
            to="/saved"
            data-feature="nav-saved"
            className={`locus-header__link ${location.pathname === "/saved" ? "locus-header__link--active" : ""}`}
          >
            Saved
            {savedCount > 0 && <span className="locus-header__badge">{savedCount}</span>}
          </Link>

          <Link
            to="/method"
            data-feature="nav-method"
            className={`locus-header__link ${location.pathname === "/method" ? "locus-header__link--active" : ""}`}
          >
            How it works
          </Link>

          {showDev && (
            <>
              <Link
                to="/_map"
                data-feature="nav-dev-map"
                className={`locus-header__link locus-header__link--dev ${location.pathname === "/_map" ? "locus-header__link--active" : ""}`}
              >
                Map
              </Link>
              <Link
                to="/primitives"
                data-feature="nav-primitives"
                className={`locus-header__link locus-header__link--dev ${location.pathname === "/primitives" ? "locus-header__link--active" : ""}`}
              >
                Primitives
              </Link>
            </>
          )}

          <button
            type="button"
            onClick={toggleTheme}
            data-feature="theme-toggle"
            className="locus-header__theme-btn"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? "☼" : "☾"}
          </button>
        </nav>
      </div>
    </header>
  );
}
