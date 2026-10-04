import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  "data-feature"?: string;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(function Card(
  {
    interactive = false,
    className = "",
    children,
    ...props
  },
  ref
) {
  return (
    <div
      ref={ref}
      className={`locus-card ${interactive ? "locus-card--interactive" : ""} ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
});
