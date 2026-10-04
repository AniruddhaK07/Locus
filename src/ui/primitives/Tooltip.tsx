import React, { useId } from "react";

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  id?: string;
  className?: string;
}

export function Tooltip({
  content,
  children,
  id: explicitId,
  className = "",
}: TooltipProps) {
  const generatedId = useId();
  const tooltipId = explicitId || generatedId;

  if (!content) {
    return <>{children}</>;
  }

  return (
    <span className={`locus-tooltip-wrap ${className}`.trim()} tabIndex={0} aria-describedby={tooltipId}>
      {children}
      <span id={tooltipId} role="tooltip" className="locus-tooltip">
        {content}
      </span>
    </span>
  );
}
