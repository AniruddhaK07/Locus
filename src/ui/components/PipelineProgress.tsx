import type { SearchStage } from "@engine";

export interface PipelineProgressProps {
  stage: SearchStage;
  progress: number;
  statusMessage: string;
  isComplete: boolean;
}

const STAGES: { key: SearchStage; label: string }[] = [
  { key: "resolving-city", label: "Resolving City" },
  { key: "discovering-localities", label: "Discovering Localities" },
  { key: "routing", label: "Routing Commutes" },
  { key: "profiling-amenities", label: "Profiling Amenities" },
  { key: "scoring", label: "Calibrating Scores" },
];

export function PipelineProgress({
  stage,
  progress,
  statusMessage,
  isComplete,
}: PipelineProgressProps) {
  const currentIdx = STAGES.findIndex((s) => s.key === stage);

  if (isComplete || stage === "done") {
    return (
      <div
        data-feature="pipeline-progress-panel"
        data-pipeline-status="complete"
        className="locus-pipeline locus-pipeline--done"
      >
        <div className="locus-pipeline__header">
          <span className="locus-pipeline__stage-text">
            <span>✓</span> Search complete · {statusMessage || "All candidate localities ranked"}
          </span>
          <span className="locus-pipeline__progress-pct">100%</span>
        </div>
        {/* Hidden but accessible stage items for contract integrity */}
        <div style={{ display: "none" }}>
          {STAGES.map((s) => (
            <span key={s.key} data-feature="stage-item">
              {s.label}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      data-feature="pipeline-progress-panel"
      data-pipeline-status="active"
      className="locus-pipeline"
      role="status"
      aria-live="polite"
    >
      {/* 2px Animated Scale Line at top */}
      <div className="locus-pipeline__track" aria-hidden="true">
        <div
          className="locus-pipeline__bar"
          style={{ transform: `scaleX(${Math.max(0.05, Math.min(1, progress / 100))})` }}
        />
      </div>

      <div className="locus-pipeline__header">
        <div className="locus-pipeline__stage-text">
          <span className="locus-combobox__loading" aria-hidden="true">●</span>
          <span>{statusMessage || "Processing candidate localities..."}</span>
        </div>
        <span className="locus-pipeline__progress-pct">{Math.round(progress)}%</span>
      </div>

      {/* Stage Items */}
      <div className="locus-pipeline__stages">
        {STAGES.map((s, idx) => {
          const isActive = s.key === stage;
          const isDone = currentIdx > idx;
          const statusClass = isActive
            ? "locus-stage-item--active"
            : isDone
            ? "locus-stage-item--completed"
            : "";

          return (
            <span
              key={s.key}
              data-feature="stage-item"
              data-stage-key={s.key}
              className={`locus-stage-item ${statusClass}`.trim()}
            >
              {isDone && <span>✓</span>}
              {s.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
