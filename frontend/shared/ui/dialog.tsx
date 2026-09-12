"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { IconButton } from "./icon-button";

export function Dialog({
  children,
  title,
  onClose,
  onRequestClose,
  confirmClose,
  className = "",
}: {
  children: ReactNode;
  title: string;
  onClose: () => void;
  onRequestClose?: () => boolean;
  confirmClose?: {
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel: string;
  };
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [confirmingClose, setConfirmingClose] = useState(false);
  const requestClose = () => {
    if (onRequestClose && !onRequestClose()) {
      if (confirmClose) setConfirmingClose(true);
      return;
    }
    onClose();
  };
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    const frame = requestAnimationFrame(() =>
      dialog
        ?.querySelector<HTMLElement>(
          "[autofocus], button, input, textarea, select",
        )
        ?.focus(),
    );
    return () => {
      cancelAnimationFrame(frame);
      dialog?.close();
      requestAnimationFrame(() => {
        if (previous?.isConnected && previous.getClientRects().length)
          previous.focus();
      });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`dialog ${className}${confirmingClose ? " dialog-is-confirming" : ""}`}
      aria-labelledby={titleId}
      onSubmitCapture={(event) => {
        const form = event.target as HTMLFormElement;
        if (form.dataset.submitting === "true") {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        form.dataset.submitting = "true";
        queueMicrotask(() => delete form.dataset.submitting);
      }}
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const bounds = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom
          )
            requestClose();
        }
      }}
    >
      <div className="dialog-heading">
        <h2 id={titleId}>{title}</h2>
        <IconButton label="Close dialog" onClick={requestClose}>
          <X size={19} />
        </IconButton>
      </div>
      {children}
      {confirmingClose && confirmClose && (
        <div className="dialog-discard-backdrop" role="presentation">
          <div
            className="dialog-discard-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={`${titleId}-discard`}
          >
            <h3 id={`${titleId}-discard`}>{confirmClose.title}</h3>
            <p>{confirmClose.message}</p>
            <div className="dialog-actions">
              <button
                type="button"
                className="button"
                autoFocus
                onClick={() => setConfirmingClose(false)}
              >
                {confirmClose.cancelLabel}
              </button>
              <button
                type="button"
                className="button button-primary"
                onClick={() => {
                  setConfirmingClose(false);
                  onClose();
                }}
              >
                {confirmClose.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </dialog>
  );
}
