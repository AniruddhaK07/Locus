import React from "react";

export interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
  hint?: string;
  error?: string | null;
  "data-feature"?: string;
  renderControl?: (inputProps: React.InputHTMLAttributes<HTMLInputElement> & { ref?: React.ForwardedRef<HTMLInputElement>; "data-feature"?: string }) => React.ReactNode;
}

export const Field = React.forwardRef<HTMLInputElement, FieldProps>(function Field(
  {
    label,
    id,
    hint,
    error,
    className = "",
    required,
    renderControl,
    "data-feature": dataFeature,
    ...props
  },
  ref
) {
  const errorId = error ? `${id}-error` : undefined;
  const hintId = hint ? `${id}-hint` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={`locus-field ${className}`.trim()}>
      <div className="locus-field__label-row">
        <label htmlFor={id} className="locus-field__label">
          {label}
          {required && <span aria-hidden="true" style={{ color: "var(--danger)", marginLeft: "2px" }}>*</span>}
        </label>
        {hint && <span id={hintId} className="locus-field__hint">{hint}</span>}
      </div>

      <div className="locus-field__control-wrap">
        {renderControl ? (
          renderControl({
            id,
            ref,
            required,
            "aria-invalid": Boolean(error),
            "aria-describedby": describedBy,
            "data-feature": dataFeature,
            className: `locus-field__input ${error ? "locus-field__input--error" : ""}`.trim(),
            ...props,
          })
        ) : (
          <input
            id={id}
            ref={ref}
            required={required}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            data-feature={dataFeature}
            className={`locus-field__input ${error ? "locus-field__input--error" : ""}`.trim()}
            {...props}
          />
        )}
      </div>

      <div className="locus-field__error-slot" aria-live="polite">
        {error && (
          <span id={errorId} role="alert">
            {error}
          </span>
        )}
      </div>
    </div>
  );
});
