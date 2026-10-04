import React from "react";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  id: string;
  options: SelectOption[];
  "data-feature"?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    label,
    id,
    options,
    className = "",
    "data-feature": dataFeature,
    ...props
  },
  ref
) {
  return (
    <div className="locus-field">
      {label && (
        <label htmlFor={id} className="locus-field__label">
          {label}
        </label>
      )}
      <div className="locus-select-wrap">
        <select
          ref={ref}
          id={id}
          data-feature={dataFeature}
          className={`locus-select ${className}`.trim()}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className="locus-select-chevron" aria-hidden="true">
          <svg width="12" height="8" viewBox="0 0 12 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="2 2 6 6 10 2" />
          </svg>
        </span>
      </div>
    </div>
  );
});
