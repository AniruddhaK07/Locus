import type { Confidence, Source } from "@engine";

interface Props {
  source: Source;
  confidence: Confidence;
  note?: string;
}

export function ProvenanceBadge({ source, confidence, note }: Props) {
  return (
    <span
      className="badge"
      data-feature="provenance-badge"
      data-source={source}
      data-confidence={confidence}
      title={note || `${source} (${confidence} confidence)`}
    >
      [{source} · {confidence}]
    </span>
  );
}
