import React from "react";

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  radius?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({
  width = "100%",
  height = "1.25rem",
  radius = "var(--radius-sm)",
  className = "",
  style,
}: SkeletonProps) {
  return (
    <div
      className={`locus-skeleton ${className}`.trim()}
      aria-hidden="true"
      style={{
        width,
        height,
        borderRadius: radius,
        ...style,
      }}
    />
  );
}
