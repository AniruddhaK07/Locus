import type { SortOption } from "@engine";
import { Disclosure } from "../primitives/Disclosure";
import { Select } from "../primitives/Select";
import { Slider } from "../primitives/Slider";

export interface RefineDisclosureProps {
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  maxCommuteMin: number;
  onMaxCommuteChange: (val: number) => void;
  minMatchScore: number;
  onMinMatchChange: (val: number) => void;
  hideLowConfidence: boolean;
  onHideLowConfidenceChange: (hide: boolean) => void;
}

export function RefineDisclosure({
  sortBy,
  onSortChange,
  maxCommuteMin,
  onMaxCommuteChange,
  minMatchScore,
  onMinMatchChange,
  hideLowConfidence,
  onHideLowConfidenceChange,
}: RefineDisclosureProps) {
  return (
    <div data-feature="filter-panel">
      <Disclosure title="Refine, Sort & Filter">
        <div className="locus-refine-panel">
          {/* Sort Select */}
          <Select
            label="Sort Localities By"
            id="sort-select"
            data-feature="sort-select"
            value={sortBy}
            options={[
              { value: "match", label: "Match Score (Best fit)" },
              { value: "commute", label: "Commute Time (Shortest)" },
              { value: "amenities", label: "Amenity Richness" },
              { value: "rent", label: "Estimated Rent (Lowest)" },
            ]}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
          />

          {/* Max Commute Slider */}
          <Slider
            label="Max Commute Time"
            id="filter-max-commute"
            data-feature="filter-max-commute"
            min={15}
            max={120}
            step={5}
            value={maxCommuteMin}
            unit="min"
            onChange={onMaxCommuteChange}
          />

          {/* Min Match Slider */}
          <Slider
            label="Minimum Match Score"
            id="filter-min-match"
            data-feature="filter-min-match"
            min={0}
            max={90}
            step={5}
            value={minMatchScore}
            unit="pts"
            onChange={onMinMatchChange}
          />

          {/* Hide Low Confidence Checkbox */}
          <div className="locus-field" style={{ justifyContent: "center" }}>
            <label
              htmlFor="filter-hide-low-conf"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "var(--space-2)",
                cursor: "pointer",
                fontSize: "var(--text-sm)",
                marginTop: "var(--space-4)",
              }}
            >
              <input
                id="filter-hide-low-conf"
                type="checkbox"
                data-feature="filter-hide-low-conf"
                checked={hideLowConfidence}
                onChange={(e) => onHideLowConfidenceChange(e.target.checked)}
                style={{ accentColor: "var(--ink)", width: "16px", height: "16px" }}
              />
              <span>Hide low confidence metrics</span>
            </label>
          </div>
        </div>
      </Disclosure>
    </div>
  );
}
