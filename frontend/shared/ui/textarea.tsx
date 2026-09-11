"use client";

import { forwardRef, useId, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ label, hint, error, id, className, ...props }, ref) {
    const generatedId = useId();
    const textareaId = id ?? generatedId;
    const errorId = `${textareaId}-error`;
    return (
      <div className="ui-field">
        {label && (
          <label className="ui-field-label" htmlFor={textareaId}>
            {label}
          </label>
        )}
        <textarea
          {...props}
          ref={ref}
          id={textareaId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={cn("ui-textarea", error ? "is-error" : "", className)}
        />
        {error ? (
          <p id={errorId} className="ui-field-error">
            {error}
          </p>
        ) : hint ? (
          <p className="ui-field-hint">{hint}</p>
        ) : null}
      </div>
    );
  },
);
