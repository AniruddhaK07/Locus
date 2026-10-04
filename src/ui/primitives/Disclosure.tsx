import React, { useState, useId } from "react";

export interface DisclosureProps {
  title: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  id?: string;
  className?: string;
  "data-feature"?: string;
}

export function Disclosure({
  title,
  children,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  id: explicitId,
  className = "",
  "data-feature": dataFeature,
}: DisclosureProps) {
  const generatedId = useId();
  const id = explicitId || generatedId;
  const contentId = `${id}-content`;

  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isOpen = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;

  const toggle = () => {
    const next = !isOpen;
    if (controlledOpen === undefined) {
      setUncontrolledOpen(next);
    }
    onOpenChange?.(next);
  };

  return (
    <div
      id={id}
      data-feature={dataFeature}
      className={`locus-disclosure ${isOpen ? "locus-disclosure--open" : ""} ${className}`.trim()}
    >
      <button
        type="button"
        className="locus-disclosure__trigger"
        onClick={toggle}
        aria-expanded={isOpen}
        aria-controls={contentId}
      >
        <span>{title}</span>
        <span className="locus-disclosure__chevron" aria-hidden="true">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 2 8 6 4 10" />
          </svg>
        </span>
      </button>

      {isOpen && (
        <div id={contentId} className="locus-disclosure__content">
          {children}
        </div>
      )}
    </div>
  );
}
