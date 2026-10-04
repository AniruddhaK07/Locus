import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { getEngine } from "@engine";

export function Nav() {
  const location = useLocation();
  const engine = getEngine();
  const [savedCount, setSavedCount] = useState(engine.saved.list().length);

  useEffect(() => {
    return engine.saved.subscribe(() => {
      setSavedCount(engine.saved.list().length);
    });
  }, [engine]);

  return (
    <nav data-feature="main-nav">
      <strong>LOCUS</strong>
      <span>|</span>
      <Link to="/" data-feature="nav-home" style={{ fontWeight: location.pathname === "/" ? "bold" : "normal" }}>
        Home
      </Link>
      <Link to="/plan" data-feature="nav-plan" style={{ fontWeight: location.pathname === "/plan" ? "bold" : "normal" }}>
        Plan Search
      </Link>
      <Link to="/results" data-feature="nav-results" style={{ fontWeight: location.pathname === "/results" ? "bold" : "normal" }}>
        Results
      </Link>
      <Link to="/saved" data-feature="nav-saved" style={{ fontWeight: location.pathname === "/saved" ? "bold" : "normal" }}>
        Saved ({savedCount})
      </Link>
      <Link to="/method" data-feature="nav-method" style={{ fontWeight: location.pathname === "/method" ? "bold" : "normal" }}>
        How It Works
      </Link>
      <Link to="/_map" data-feature="nav-dev-map" style={{ fontWeight: location.pathname === "/_map" ? "bold" : "normal" }}>
        [Dev Map]
      </Link>
    </nav>
  );
}
