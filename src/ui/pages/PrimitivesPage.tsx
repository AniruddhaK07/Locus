import { useState } from "react";
import {
  Button,
  IconButton,
  Field,
  Select,
  Slider,
  Chip,
  ConfidenceMark,
  ProvenanceBadge,
  Card,
  Skeleton,
  Disclosure,
  Tooltip,
  Toast,
  EmptyState,
  ErrorState,
  ModeBanner,
} from "../primitives";

export function PrimitivesPage() {
  const [btnLoading, setBtnLoading] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [sliderVal, setSliderVal] = useState(45);
  const [chips, setChips] = useState(["Koramangala", "Indiranagar", "Whitefield"]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const removeChip = (c: string) => {
    setChips((prev) => prev.filter((item) => item !== c));
  };

  return (
    <main
      data-feature="primitives-screen"
      data-state="ready"
      style={{
        maxWidth: "var(--max-width)",
        margin: "0 auto",
        padding: "var(--space-6) var(--space-4)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-8)",
      }}
    >
      <header>
        <span
          style={{
            fontSize: "var(--text-xs)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--ink-muted)",
          }}
        >
          Dev Catalog · Phase U0
        </span>
        <h1 style={{ marginTop: "var(--space-1)" }}>Design Primitives Showcase</h1>
        <p style={{ color: "var(--ink-muted)", marginTop: "var(--space-2)" }}>
          Every primitive in every supported state, styled exclusively via design tokens and CSS.
        </p>
      </header>

      {/* Mode Banners */}
      <section>
        <h2>1. Mode Banners</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", marginTop: "var(--space-3)" }}>
          <ModeBanner mode="mock" />
          <ModeBanner mode="snapshot" capturedDate="2026-10-04T12:00:00Z" />
        </div>
      </section>

      {/* Buttons */}
      <section>
        <h2>2. Buttons (§4.4)</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)", marginTop: "var(--space-3)", alignItems: "center" }}>
          <Button variant="primary">Start Search</Button>
          <Button
            variant="primary"
            loading={btnLoading}
            onClick={() => {
              setBtnLoading(true);
              setTimeout(() => setBtnLoading(false), 2000);
            }}
          >
            {btnLoading ? "Processing" : "Click to Test Loading"}
          </Button>
          <Button variant="primary" disabled>
            Disabled Primary
          </Button>
          <Button variant="secondary">Secondary Action</Button>
          <Button variant="secondary" size="sm">
            Small Secondary
          </Button>
          <Button variant="secondary" disabled>
            Disabled Secondary
          </Button>
          <Button variant="ghost">Ghost Link</Button>
          <Button variant="ghost" disabled>
            Disabled Ghost
          </Button>
        </div>
      </section>

      {/* Icon Buttons */}
      <section>
        <h2>3. Icon Buttons</h2>
        <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-3)", alignItems: "center" }}>
          <IconButton
            label={bookmarked ? "Remove from saved" : "Save locality"}
            active={bookmarked}
            onClick={() => setBookmarked(!bookmarked)}
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill={bookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            }
          />
          <span style={{ fontSize: "var(--text-xs)", color: "var(--ink-muted)" }}>
            Toggle state: {bookmarked ? "Saved (active pulse)" : "Unsaved"}
          </span>
        </div>
      </section>

      {/* Form Controls */}
      <section>
        <h2>4. Form Controls (Field, Select, Slider)</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "var(--space-4)", marginTop: "var(--space-3)" }}>
          <Field
            label="Workplace or Landmark"
            id="demo-workplace"
            hint="Debounced typeahead"
            placeholder="e.g. Manyata Tech Park"
            defaultValue="Manyata Tech Park"
          />

          <Field
            label="Monthly Budget (₹)"
            id="demo-budget"
            error="Maximum budget must be greater than ₹10,000"
            defaultValue="5000"
          />

          <Select
            label="Household Composition"
            id="demo-household"
            options={[
              { value: "balanced", label: "Balanced / Standard" },
              { value: "family", label: "Family with children" },
              { value: "couple", label: "Couple / Dual income" },
              { value: "student", label: "Student / Single" },
            ]}
          />

          <Slider
            label="Maximum Commute Duration"
            id="demo-slider"
            min={10}
            max={120}
            step={5}
            value={sliderVal}
            unit="min"
            onChange={setSliderVal}
          />
        </div>
      </section>

      {/* Chips */}
      <section>
        <h2>5. Chips</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)", marginTop: "var(--space-3)" }}>
          {chips.map((c) => (
            <Chip key={c} label={c} onRemove={() => removeChip(c)} />
          ))}
          {chips.length === 0 && (
            <Button variant="ghost" size="sm" onClick={() => setChips(["Koramangala", "Indiranagar", "Whitefield"])}>
              Reset Chips
            </Button>
          )}
        </div>
      </section>

      {/* Honesty Components (§5) */}
      <section>
        <h2>6. Honesty & Provenance (§5)</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", marginTop: "var(--space-3)" }}>
          <div>
            <h3 style={{ fontSize: "var(--text-sm)", color: "var(--ink-muted)", marginBottom: "var(--space-2)" }}>
              Confidence Marks (shown without colour):
            </h3>
            <div style={{ display: "flex", gap: "var(--space-4)", flexWrap: "wrap" }}>
              <ConfidenceMark confidence="high" />
              <ConfidenceMark confidence="medium" />
              <ConfidenceMark confidence="low" />
              <ConfidenceMark confidence="none" />
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: "var(--text-sm)", color: "var(--ink-muted)", marginBottom: "var(--space-2)" }}>
              Provenance Badges (with tooltips on hover & focus):
            </h3>
            <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
              <ProvenanceBadge
                metric={{
                  value: 12,
                  source: "osm",
                  confidence: "high",
                  fetchedAt: "2026-10-04T12:00:00Z",
                  note: "Overpass API count within 800m",
                }}
              />
              <ProvenanceBadge
                metric={{
                  value: 35,
                  source: "heuristic",
                  confidence: "low",
                  note: "OSRM free-flow × 1.6 congestion multiplier",
                }}
              />
              <ProvenanceBadge
                metric={{
                  value: null,
                  source: "unavailable",
                  confidence: "none",
                  note: "OSM server timed out on road lit tags",
                }}
              />
              <ProvenanceBadge
                metric={{
                  value: 32000,
                  source: "user",
                  confidence: "high",
                  note: "Overridden directly by user",
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Cards & Skeletons */}
      <section>
        <h2>7. Cards & Skeletons</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "var(--space-4)", marginTop: "var(--space-3)" }}>
          <Card interactive>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <h3 style={{ fontSize: "var(--text-lg)" }}>Koramangala 4th Block</h3>
              <span style={{ fontSize: "var(--text-sm)", fontWeight: "bold" }}>89 Match</span>
            </div>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--ink-muted)", marginTop: "var(--space-2)" }}>
              24 min peak drive · Healthcare within 1.5 km · Estimated band ₹28k–₹38k
            </p>
          </Card>

          <Card>
            <Skeleton width="60%" height="1.5rem" />
            <div style={{ marginTop: "var(--space-2)", display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
              <Skeleton width="100%" height="0.875rem" />
              <Skeleton width="80%" height="0.875rem" />
            </div>
          </Card>
        </div>
      </section>

      {/* Disclosures & Tooltips */}
      <section>
        <h2>8. Disclosure & Tooltip</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", marginTop: "var(--space-3)" }}>
          <Disclosure title="Refine search & filters (Click to expand)">
            <p style={{ fontSize: "var(--text-sm)", color: "var(--ink-muted)" }}>
              Collapsed filter controls live quietly here to avoid screen clutter.
            </p>
          </Disclosure>

          <div>
            <Tooltip content="Tooltip accessible via mouse hover or keyboard tab focus!">
              <button type="button" className="locus-btn locus-btn--secondary locus-btn--sm">
                Hover or Focus Me for Tooltip
              </button>
            </Tooltip>
          </div>
        </div>
      </section>

      {/* Toast Notification */}
      <section>
        <h2>9. Toast Feedback</h2>
        <div style={{ marginTop: "var(--space-3)" }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setToastMsg("Share link copied to clipboard")}
          >
            Trigger Sample Toast
          </Button>
        </div>
      </section>

      {/* Empty & Error States */}
      <section>
        <h2>10. Empty & Error States (§4.5)</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "var(--space-4)", marginTop: "var(--space-3)" }}>
          <EmptyState
            message="No shortlisted localities saved yet."
            action={{
              label: "Discover Localities",
              onClick: () => {},
            }}
          />

          <ErrorState
            message="Search pipeline unreachable. Please check network connection."
            onRetry={() => {}}
            retryLabel="Try again"
          />
        </div>
      </section>

      {/* Toast Render */}
      {toastMsg && (
        <div className="locus-toast-container">
          <Toast message={toastMsg} onDismiss={() => setToastMsg(null)} />
        </div>
      )}
    </main>
  );
}
