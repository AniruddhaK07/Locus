import React from "react";

export interface ChipProps {
  label: string;
  onRemove?: () => void;
  icon?: React.ReactNode;
  "data-feature"?: string;
  className?: string;
  children?: React.ReactNode;
}

export function Chip({
  label,
  onRemove,
  icon,
  "data-feature": dataFeature,
  className = "",
  children,
}: ChipProps) {
  return (
    <span
      data-feature={dataFeature}
      className={`locus-chip ${className}`.trim()}
    >
      {icon && <span aria-hidden="true">{icon}</span>}
      <span>{children ?? label}</span>
      {onRemove && (
        <button
          type="button"
          className="locus-chip__remove"
          onClick={onRemove}
          aria-label={`Remove ${label}`}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="1" y1="1" x2="9" y2="9" />
            <line x1="9" y1="1" x2="1" y2="9" />
          </svg>
        </button>
      )}
    </span>
  );
}
