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
  // Determine mode from prop or environment
  const metaEnv = (import.meta as unknown as { env?: Record<string, string> }).env;
  let mode: "mock" | "snapshot" | "live" = explicitMode ?? "mock";

  if (!explicitMode && metaEnv?.VITE_ENGINE_MODE) {
    if (metaEnv.VITE_ENGINE_MODE === "live") mode = "live";
    else if (metaEnv.VITE_ENGINE_MODE === "snapshot") mode = "snapshot";
    else mode = "mock";
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

  return (
    <aside
      className={`locus-mode-banner ${className}`.trim()}
      role="status"
      data-feature="mode-banner"
      data-engine-mode={mode}
    >
      <span>{text}</span>
    </aside>
  );
}
