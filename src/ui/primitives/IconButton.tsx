import React from "react";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  "data-feature"?: string;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    label,
    icon,
    active = false,
    className = "",
    ...props
  },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      className={`locus-icon-btn ${active ? "locus-icon-btn--active" : ""} ${className}`.trim()}
      aria-label={label}
      title={label}
      aria-pressed={active}
      {...props}
    >
      {icon}
    </button>
  );
});
