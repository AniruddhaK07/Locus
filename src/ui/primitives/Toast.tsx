import { useEffect } from "react";

export interface ToastProps {
  message: string;
  onDismiss: () => void;
  durationMs?: number;
  className?: string;
}

export function Toast({
  message,
  onDismiss,
  durationMs = 3000,
  className = "",
}: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, durationMs);
    return () => clearTimeout(timer);
  }, [durationMs, onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`locus-toast ${className}`.trim()}
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        style={{
          marginLeft: "8px",
          cursor: "pointer",
          border: "none",
          background: "transparent",
          color: "var(--ink-muted)",
          padding: "2px",
          display: "inline-flex",
          alignItems: "center"
        }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <line x1="2" y1="2" x2="10" y2="10" />
          <line x1="10" y1="2" x2="2" y2="10" />
        </svg>
      </button>
    </div>
  );
}
