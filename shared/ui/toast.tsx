"use client";

import { Check, X } from "lucide-react";

export function Toast({
  message,
  onDismiss,
  action,
  onAction,
}: {
  message: string;
  onDismiss?: () => void;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="toast" role="status" aria-live="polite">
      <span className="toast-check">
        <Check size={15} />
      </span>
      <span>{message}</span>
      {action && onAction && (
        <button className="toast-action" type="button" onClick={onAction}>
          {action}
        </button>
      )}
      {onDismiss && (
        <button aria-label="Dismiss notification" onClick={onDismiss}>
          <X size={15} />
        </button>
      )}
    </div>
  );
}
