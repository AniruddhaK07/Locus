import React from "react";
import { Button } from "./Button";

export interface EmptyStateProps {
  message: string;
  action?: {
    label: string;
    onClick: () => void;
    dataFeature?: string;
  };
  icon?: React.ReactNode;
  className?: string;
  "data-feature"?: string;
}

export function EmptyState({
  message,
  action,
  icon,
  className = "",
  "data-feature": dataFeature,
}: EmptyStateProps) {
  return (
    <div
      data-feature={dataFeature}
      className={`locus-state-box ${className}`.trim()}
    >
      {icon && <div aria-hidden="true" style={{ color: "var(--ink-muted)" }}>{icon}</div>}
      <p className="locus-state-box__text">{message}</p>
      {action && (
        <Button
          variant="secondary"
          size="sm"
          data-feature={action.dataFeature}
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
