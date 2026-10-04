export interface SliderProps {
  label: string;
  id: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  unit?: string;
  formatValue?: (value: number) => string;
  "data-feature"?: string;
  className?: string;
  disabled?: boolean;
}

export function Slider({
  label,
  id,
  min,
  max,
  step = 1,
  value,
  onChange,
  unit = "",
  formatValue,
  "data-feature": dataFeature,
  className = "",
  disabled = false,
}: SliderProps) {
  const displayVal = formatValue ? formatValue(value) : `${value}${unit ? ` ${unit}` : ""}`;

  return (
    <div className={`locus-slider-container ${className}`.trim()}>
      <div className="locus-slider-header">
        <label htmlFor={id} className="locus-field__label">
          {label}
        </label>
        <span className="locus-slider-val" aria-hidden="true">
          {displayVal}
        </span>
      </div>

      <div className="locus-slider-input-wrap">
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          data-feature={dataFeature}
          className="locus-slider"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-valuetext={displayVal}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </div>
    </div>
  );
}
