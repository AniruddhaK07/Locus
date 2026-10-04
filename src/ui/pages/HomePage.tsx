import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "../primitives/Button";
import { getEngine, setEngineMode } from "@engine";

export function HomePage() {
  const navigate = useNavigate();
  const engine = getEngine();
  const [hasCachedSearch, setHasCachedSearch] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("locus_last_prefs");
      if (stored) setHasCachedSearch(true);
    } catch {
      // localStorage disabled / unavailable
    }
  }, []);

  const handleStart = () => {
    navigate("/plan");
  };

  const handleResume = () => {
    navigate("/results");
  };

  return (
    <main data-feature="home-screen" data-state="ready" className="locus-home">
      {/* Decorative line-art motif (<= 6% opacity per §6) */}
      <svg
        className="locus-home__motif"
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <circle cx="100" cy="100" r="80" strokeWidth="1" strokeDasharray="4 4" />
        <circle cx="100" cy="100" r="50" strokeWidth="1" />
        <line x1="20" y1="100" x2="180" y2="100" strokeWidth="1" />
        <line x1="100" y1="20" x2="100" y2="180" strokeWidth="1" />
      </svg>

      <span className="locus-home__eyebrow">Relocation Intelligence for India</span>

      <h1 data-feature="app-title" className="locus-home__headline">
        Find where to live.
      </h1>

      <p data-feature="value-statement" className="locus-home__supporting">
        Neighbourhoods ranked by commute, amenities and budget, with the source of every number.
      </p>

      <div className="locus-home__actions">
        <Button
          variant="primary"
          data-feature="start-btn"
          onClick={handleStart}
          arrow
        >
          Start
        </Button>

        {hasCachedSearch && (
          <Button
            variant="ghost"
            data-feature="resume-search-btn"
            onClick={handleResume}
          >
            Resume last search
          </Button>
        )}
      </div>

      <div style={{ marginTop: "var(--space-4)", textAlign: "center" }}>
        {engine.mode === "snapshot" ? (
          <a
            href="/plan?engine=live"
            data-feature="switch-live-home-link"
            onClick={(e) => {
              e.preventDefault();
              setEngineMode("live");
              navigate("/plan?engine=live");
            }}
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--ink-muted)",
              textDecoration: "underline",
              cursor: "pointer",
            }}
          >
            Switch to live search
          </a>
        ) : (
          <a
            href="/plan?engine=snapshot"
            data-feature="try-snapshot-home-link"
            onClick={(e) => {
              e.preventDefault();
              setEngineMode("snapshot");
              navigate("/plan?engine=snapshot");
            }}
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--ink-muted)",
              textDecoration: "underline",
              cursor: "pointer",
            }}
          >
            Try recorded demo cities (instant)
          </a>
        )}
      </div>
    </main>
  );
}
