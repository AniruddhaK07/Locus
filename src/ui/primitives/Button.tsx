import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "md" | "sm";
  loading?: boolean;
  arrow?: boolean;
  "data-feature"?: string;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "secondary",
    size = "md",
    loading = false,
    arrow = false,
    className = "",
    children,
    disabled,
    ...props
  },
  ref
) {
  const isPrimary = variant === "primary";
  const hasArrow = arrow || isPrimary;

  return (
    <button
      ref={ref}
      className={`locus-btn locus-btn--${variant} ${size === "sm" ? "locus-btn--sm" : ""} ${loading ? "locus-btn--loading" : ""} ${className}`.trim()}
      disabled={disabled || loading}
      aria-busy={loading ? "true" : undefined}
      {...props}
    >
      <span className={loading ? "locus-btn__content--hidden" : undefined} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
        {children}
        {hasArrow && (
          <span className="locus-btn__arrow" aria-hidden="true">
            →
          </span>
        )}
      </span>
      {loading && <span className="locus-btn__progress-line" aria-hidden="true" />}
    </button>
  );
});
