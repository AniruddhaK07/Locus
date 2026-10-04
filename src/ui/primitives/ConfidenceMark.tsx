import type { Confidence } from "@engine";

export interface ConfidenceMarkProps {
  confidence: Confidence;
  showWord?: boolean;
  className?: string;
}

const CONFIDENCE_CONFIG: Record<
  Confidence,
  { symbol: string; word: string }
> = {
  high: { symbol: "●", word: "High confidence" },
  medium: { symbol: "◐", word: "Medium confidence" },
  low: { symbol: "○", word: "Low confidence" },
  none: { symbol: "⊘", word: "No confidence" },
};

export function ConfidenceMark({
  confidence,
  showWord = true,
  className = "",
}: ConfidenceMarkProps) {
  const conf = CONFIDENCE_CONFIG[confidence] ?? CONFIDENCE_CONFIG.none;

  return (
    <span
      className={`locus-confidence ${className}`.trim()}
      aria-label={conf.word}
      title={conf.word}
    >
      <span className="locus-confidence__symbol" aria-hidden="true">
        {conf.symbol}
      </span>
      {showWord && <span className="locus-confidence__word">{conf.word}</span>}
    </span>
  );
}
