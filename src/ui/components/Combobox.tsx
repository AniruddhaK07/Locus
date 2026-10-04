import React, { useState, useEffect, useRef, useId } from "react";
import type { PlaceSuggestion } from "@engine";
import { Chip } from "../primitives/Chip";

export interface ComboboxProps {
  label: string;
  inputId: string;
  placeholder?: string;
  hint?: string;
  value: string;
  selectedItem: { id: string; name: string } | null;
  onInputChange: (val: string) => void;
  onSelect: (item: PlaceSuggestion) => void;
  onClear: () => void;
  fetchSuggestions: (query: string, signal: AbortSignal) => Promise<PlaceSuggestion[]>;
  inputDataFeature?: string;
  suggestionsDataFeature?: string;
  selectBtnDataFeature?: string;
  chipDataFeature?: string;
  error?: string | null;
  autoFocus?: boolean;
}

export function Combobox({
  label,
  inputId,
  placeholder,
  hint,
  value,
  selectedItem,
  onInputChange,
  onSelect,
  onClear,
  fetchSuggestions,
  inputDataFeature,
  suggestionsDataFeature,
  selectBtnDataFeature,
  chipDataFeature,
  error,
  autoFocus = false,
}: ComboboxProps) {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);

  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Debounced search
  useEffect(() => {
    if (selectedItem || value.trim().length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await fetchSuggestions(value.trim(), controller.signal);
        if (!controller.signal.aborted) {
          setSuggestions(results);
          setIsOpen(results.length > 0);
          setActiveIndex(-1);
        }
      } catch {
        // Aborted or network error
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value, selectedItem, fetchSuggestions]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === "ArrowDown" && suggestions.length > 0) {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        handleSelectItem(suggestions[activeIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  const handleSelectItem = (item: PlaceSuggestion) => {
    onSelect(item);
    setSuggestions([]);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const errorId = error ? `${inputId}-error` : undefined;
  const hintId = hint ? `${inputId}-hint` : undefined;

  return (
    <div className="locus-field locus-combobox">
      <div className="locus-field__label-row">
        <label htmlFor={inputId} className="locus-field__label">
          {label}
        </label>
        {hint && <span id={hintId} className="locus-field__hint">{hint}</span>}
      </div>

      <div className="locus-combobox__control-wrap" role="combobox" aria-expanded={isOpen} aria-haspopup="listbox" aria-controls={listboxId}>
        {selectedItem ? (
          <div className="locus-combobox__selected-row">
            <Chip
              label={selectedItem.name}
              data-feature={chipDataFeature}
              onRemove={onClear}
            >
              <span>✓ {selectedItem.name}</span>
            </Chip>
          </div>
        ) : (
          <div style={{ position: "relative", width: "100%" }}>
            <input
              id={inputId}
              ref={inputRef}
              type="text"
              autoFocus={autoFocus}
              value={value}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => {
                // Short delay to permit clicks on dropdown
                setTimeout(() => setIsOpen(false), 200);
              }}
              onFocus={() => {
                if (suggestions.length > 0 && !selectedItem) {
                  setIsOpen(true);
                }
              }}
              placeholder={placeholder}
              data-feature={inputDataFeature}
              aria-autocomplete="list"
              aria-controls={listboxId}
              aria-activedescendant={
                activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined
              }
              aria-invalid={Boolean(error)}
              aria-describedby={[errorId, hintId].filter(Boolean).join(" ") || undefined}
              className={`locus-field__input ${error ? "locus-field__input--error" : ""}`.trim()}
            />
            {loading && (
              <span className="locus-combobox__loading" aria-hidden="true">
                …
              </span>
            )}
          </div>
        )}

        {isOpen && suggestions.length > 0 && !selectedItem && (
          <ul
            id={listboxId}
            role="listbox"
            data-feature={suggestionsDataFeature}
            className="locus-combobox__dropdown"
          >
            {suggestions.map((item, idx) => {
              const isHighlighted = idx === activeIndex;
              const subtext = [item.district, item.city, item.state].filter(Boolean).join(", ") || item.type;
              return (
                <li
                  key={item.id}
                  id={`${listboxId}-opt-${idx}`}
                  role="option"
                  aria-selected={isHighlighted}
                  className={`locus-combobox__option ${isHighlighted ? "locus-combobox__option--highlighted" : ""}`}
                  onMouseDown={(e) => {
                    // Prevent blur before selection
                    e.preventDefault();
                    handleSelectItem(item);
                  }}
                >
                  <div className="locus-combobox__option-main">
                    <span className="locus-combobox__option-name">{item.name}</span>
                    <span className="locus-combobox__option-sub">{subtext}</span>
                  </div>
                  <button
                    type="button"
                    tabIndex={-1}
                    data-feature={selectBtnDataFeature}
                    className="locus-btn locus-btn--secondary locus-btn--sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectItem(item);
                    }}
                  >
                    Select
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="locus-field__error-slot" aria-live="polite">
        {error && (
          <span id={errorId} role="alert" data-feature="validation-error">
            {error}
          </span>
        )}
      </div>
    </div>
  );
}
