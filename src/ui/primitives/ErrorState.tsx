import { Button } from "./Button";

export interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  retryDataFeature?: string;
  secondaryAction?: {
    label: string;
    onClick: () => void;
    dataFeature?: string;
  };
  className?: string;
  "data-feature"?: string;
}

export function ErrorState({
  message,
  onRetry,
  retryLabel = "Try again",
  retryDataFeature,
  secondaryAction,
  className = "",
  "data-feature": dataFeature,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      data-feature={dataFeature}
      className={`locus-state-box locus-state-box--error ${className}`.trim()}
    >
      <p className="locus-state-box__text">{message}</p>
      {(onRetry || secondaryAction) && (
        <div
          className="locus-state-box__actions"
          style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-3)", flexWrap: "wrap" }}
        >
          {onRetry && (
            <Button
              variant="secondary"
              size="sm"
              data-feature={retryDataFeature}
              onClick={onRetry}
            >
              {retryLabel}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant="ghost"
              size="sm"
              data-feature={secondaryAction.dataFeature}
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

