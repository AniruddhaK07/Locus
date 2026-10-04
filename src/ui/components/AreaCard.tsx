import { Link } from "react-router-dom";
import type { AreaId, AreaSummary } from "@engine";
import { ConfidenceMark } from "../primitives/ConfidenceMark";
import { ProvenanceBadge } from "../primitives/ProvenanceBadge";
import { IconButton } from "../primitives/IconButton";
import { formatCommute, formatRentBand, formatCompleteness } from "../utils/format";

export interface AreaCardProps {
  area: AreaSummary;
  isSaved: boolean;
  onToggleSave: (id: AreaId) => void;
  isCompared: boolean;
  onToggleCompare: (id: AreaId) => void;
  staggerIndex?: number;
}

export function AreaCard({
  area,
  isSaved,
  onToggleSave,
  isCompared,
  onToggleCompare,
  staggerIndex,
}: AreaCardProps) {
  const staggerClass =
    staggerIndex !== undefined && staggerIndex < 8
      ? `locus-area-card--stagger-${staggerIndex + 1}`
      : "";

  const areaLink = `/area/${encodeURIComponent(area.id)}`;

  return (
    <article
      data-feature="area-card"
      data-area-id={area.id}
      className={`locus-area-card ${staggerClass}`.trim()}
    >
      {/* Header: Rank, Name, Match Score */}
      <div className="locus-area-card__header">
        <div className="locus-area-card__title-group">
          <span className="locus-area-card__rank" data-feature="area-rank">
            #{area.rank}
          </span>
          <Link to={areaLink} className="locus-area-card__name">
            {area.name}
          </Link>
          <ConfidenceMark confidence={area.confidence} showWord={false} />
        </div>

        <div className="locus-match-score-badge" data-feature="match-score">
          <span className="locus-match-score-number">{area.matchScore}</span>
          <span className="locus-match-score-label">
            Match · Based on {formatCompleteness(area.dataCompleteness)} of available data
          </span>
        </div>
      </div>

      {/* Explanation text */}
      <p className="locus-area-card__explanation">{area.explanation}</p>

      {/* 3 Key Facts */}
      {area.keyFacts && area.keyFacts.length > 0 && (
        <div className="locus-area-card__facts" data-feature="key-facts">
          {area.keyFacts.slice(0, 3).map((fact, idx) => (
            <span key={idx} className="locus-fact-pill">
              {fact}
            </span>
          ))}
        </div>
      )}

      {/* Structured Metrics: Commute, Rent, Safety */}
      <div className="locus-area-card__metrics">
        {/* Commute */}
        <div className="locus-metric-block">
          <span className="locus-metric-block__label">Peak commute estimate</span>
          <span className="locus-metric-block__value">
            {formatCommute(area.effectiveCommuteMin.value)}
          </span>
          <div className="locus-metric-block__note">
            <ProvenanceBadge metric={area.effectiveCommuteMin} />
          </div>
        </div>

        {/* Rent */}
        <div className="locus-metric-block">
          <span className="locus-metric-block__label">Estimated band</span>
          <span className="locus-metric-block__value">
            {formatRentBand(area.rentBand.value)}
          </span>
          <span className="locus-metric-block__note">Not listing data</span>
        </div>

        {/* Safety */}
        <div className="locus-metric-block">
          <span className="locus-metric-block__label">Safety indicator</span>
          <span className="locus-metric-block__value">
            {area.safetyIndicator.value !== null ? `${area.safetyIndicator.value}/10` : "Insufficient data"}
          </span>
          <span className="locus-metric-block__note" style={{ fontSize: "10px" }}>
            {area.safetyIndicator.note || "Infrastructure indicator, not crime data"}
          </span>
        </div>
      </div>

      {/* Footer: Compare Checkbox, Save Bookmark, Details Link */}
      <div className="locus-area-card__footer">
        <label className="locus-area-card__compare-toggle">
          <input
            type="checkbox"
            data-feature="compare-checkbox"
            checked={isCompared}
            onChange={() => onToggleCompare(area.id)}
            style={{ accentColor: "var(--ink)" }}
          />
          <span>Compare</span>
        </label>

        <div className="locus-area-card__footer-actions">
          <IconButton
            label={isSaved ? "Remove from shortlist" : "Save to shortlist"}
            data-feature="save-toggle-btn"
            active={isSaved}
            onClick={() => onToggleSave(area.id)}
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            }
          />

          <Link
            to={areaLink}
            data-feature="details-link"
            className="locus-btn locus-btn--secondary locus-btn--sm"
          >
            Details →
          </Link>
        </div>
      </div>
    </article>
  );
}
