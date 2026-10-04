import type { Confidence, Measured, Source } from "@engine";
import { Tooltip } from "./Tooltip";
import { ConfidenceMark } from "./ConfidenceMark";

export interface ProvenanceBadgeProps {
  metric?: Measured<unknown>;
  source?: Source;
  confidence?: Confidence;
  note?: string;
  fetchedAt?: string;
  value?: unknown;
  className?: string;
}

export function ProvenanceBadge({
  metric,
  source: explicitSource,
  confidence: explicitConfidence,
  note: explicitNote,
  fetchedAt: explicitFetchedAt,
  value: explicitValue,
  className = "",
}: ProvenanceBadgeProps) {
  const source = metric?.source ?? explicitSource ?? "unavailable";
  const confidence = metric?.confidence ?? explicitConfidence ?? "none";
  const note = metric?.note ?? explicitNote;
  const fetchedAt = metric?.fetchedAt ?? explicitFetchedAt;
  const isNull = (metric ? metric.value === null : explicitValue === null);

  const tooltipLines: string[] = [];
  if (note) tooltipLines.push(note);
  if (fetchedAt) {
    try {
      const d = new Date(fetchedAt);
      tooltipLines.push(`Captured: ${d.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}`);
    } catch {
      tooltipLines.push(`Captured: ${fetchedAt}`);
    }
  }

  const tooltipContent = tooltipLines.length > 0 ? tooltipLines.join(" · ") : `${source} · ${confidence}`;

  return (
    <Tooltip content={tooltipContent}>
      <span
        className={`locus-provenance-badge ${className}`.trim()}
        data-feature="provenance-badge"
        data-source={source}
        data-confidence={confidence}
      >
        <ConfidenceMark confidence={confidence} showWord={false} />
        <span>{source}</span>
        {isNull && <span style={{ fontStyle: "italic", marginLeft: "2px" }}>(Not available)</span>}
      </span>
    </Tooltip>
  );
}
