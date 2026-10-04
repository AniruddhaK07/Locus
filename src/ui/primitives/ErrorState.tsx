import { Button } from "./Button";

export interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  retryDataFeature?: string;
  className?: string;
  "data-feature"?: string;
}

export function ErrorState({
  message,
  onRetry,
  retryLabel = "Try again",
  retryDataFeature,
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
    </div>
  );
}
