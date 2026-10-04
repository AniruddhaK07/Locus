import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

export function HomePage() {
  const navigate = useNavigate();
  const [hasCachedSearch, setHasCachedSearch] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("locus_last_prefs");
      if (stored) setHasCachedSearch(true);
    } catch {
      // localStorage disabled
    }
  }, []);

  const handleStart = () => {
    navigate("/plan");
  };

  const handleResume = () => {
    navigate("/results");
  };

  return (
    <main data-feature="home-screen" data-state="ready" className="box">
      <header>
        <h1 data-feature="app-title">Locus</h1>
        <p data-feature="value-statement">
          Honest neighbourhood discovery for relocating in India. Transparent commute estimates, real amenity density, and calibrated scoring with zero hidden defaults.
        </p>
      </header>

      <section className="row" style={{ marginTop: "24px" }}>
        <button data-feature="start-btn" onClick={handleStart} style={{ padding: "8px 16px", fontSize: "16px" }}>
          Start Neighbourhood Search
        </button>

        {hasCachedSearch && (
          <button data-feature="resume-search-btn" onClick={handleResume} style={{ padding: "8px 16px", fontSize: "16px" }}>
            Resume Last Search
          </button>
        )}
      </section>

      <section style={{ marginTop: "32px", fontSize: "12px", color: "#666" }}>
        <p>100% Free Public Infrastructure · OpenStreetMap Ecosystem · Direct Client Processing</p>
      </section>
    </main>
  );
}
