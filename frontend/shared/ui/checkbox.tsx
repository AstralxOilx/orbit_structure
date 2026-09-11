"use client";
import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

export interface CheckboxProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
  label: ReactNode;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  function Checkbox({ label, error, id, ...props }, ref) {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    return (
      <div className="space-y-1">
        <label className="ui-checkbox" htmlFor={inputId}>
          <input
            {...props}
            ref={ref}
            id={inputId}
            type="checkbox"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${inputId}-error` : undefined}
          />
          <span>{label}</span>
        </label>
        {error && (
          <p className="ui-checkbox-error" id={`${inputId}-error`} role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);
