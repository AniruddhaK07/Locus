import { Button } from "../primitives/Button";

export interface CompareStickyBarProps {
  selectedCount: number;
  maxCount?: number;
  onClear: () => void;
  onCompare: () => void;
}

export function CompareStickyBar({
  selectedCount,
  maxCount = 3,
  onClear,
  onCompare,
}: CompareStickyBarProps) {
  if (selectedCount === 0) {
    return null;
  }

  const canCompare = selectedCount >= 2;

  return (
    <aside
      data-feature="compare-sticky-bar"
      className="locus-compare-bar"
      role="region"
      aria-label="Locality comparison bar"
    >
      <div className="locus-compare-bar__count">
        <span>{selectedCount} of {maxCount} selected</span>
        {!canCompare && (
          <span style={{ fontSize: "var(--text-xs)", color: "var(--ink-muted)", marginLeft: "8px" }}>
            (Select at least 2 to compare)
          </span>
        )}
      </div>

      <div className="locus-compare-bar__actions">
        <Button
          variant="ghost"
          size="sm"
          data-feature="clear-compare-btn"
          onClick={onClear}
        >
          Clear
        </Button>

        <Button
          variant="primary"
          size="sm"
          data-feature="compare-btn"
          disabled={!canCompare}
          onClick={onCompare}
          arrow
        >
          Compare side by side
        </Button>
      </div>
    </aside>
  );
}
