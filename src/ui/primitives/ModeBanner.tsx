import { getEngine, setEngineMode } from "@engine";

export interface ModeBannerProps {
  mode?: "mock" | "snapshot" | "live";
  capturedDate?: string;
  className?: string;
}

export function ModeBanner({
  mode: explicitMode,
  capturedDate,
  className = "",
}: ModeBannerProps) {
  let mode: "mock" | "snapshot" | "live";
  if (explicitMode) {
    mode = explicitMode;
  } else {
    try {
      const engine = getEngine();
      mode = engine.mode ?? "mock";
    } catch {
      mode = "mock";
    }
  }

  if (mode === "live") {
    return null;
  }

  let text = "Sample data";
  if (mode === "snapshot") {
    let dateStr = "recent session";
    if (capturedDate) {
      try {
        const d = new Date(capturedDate);
        dateStr = d.toLocaleDateString("en-IN", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      } catch {
        dateStr = capturedDate;
      }
    }
    text = `Recorded demo data · captured ${dateStr}`;
  }

  const handleSwitchToLive = (e: React.MouseEvent) => {
    e.preventDefault();
    setEngineMode("live");
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("engine", "live");
      window.location.href = url.toString();
    }
  };

  return (
    <aside
      className={`locus-mode-banner ${className}`.trim()}
      role="status"
      data-feature="mode-banner"
      data-engine-mode={mode}
    >
      <span>{text}</span>
      {mode === "snapshot" && (
        <a
          href="?engine=live"
          data-feature="switch-live-link"
          onClick={handleSwitchToLive}
          style={{
            marginLeft: "12px",
            color: "inherit",
            textDecoration: "underline",
            fontSize: "inherit",
            cursor: "pointer",
          }}
        >
          Switch to live search
        </a>
      )}
    </aside>
  );
}

