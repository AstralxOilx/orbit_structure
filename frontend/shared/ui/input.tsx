"use client";

import {
  forwardRef,
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export interface InputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "size"
> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
  /** เปิดปุ่ม toggle แสดง/ซ่อนรหัสผ่าน */
  passwordToggle?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    error,
    hint,
    icon,
    passwordToggle = false,
    className,
    type = "text",
    id,
    ...props
  },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;
  const [visible, setVisible] = useState(false);

  const resolvedType = passwordToggle ? (visible ? "text" : "password") : type;
  const hasError = Boolean(error);

  return (
    <div className="ui-field">
      {label && (
        <label htmlFor={inputId} className="ui-field-label">
          <span>{label}</span>
          {props.required && (
            <span className="ui-field-required">Required</span>
          )}
        </label>
      )}

      <div className="ui-input-shell">
        {icon && (
          <span
            className={cn("ui-input-icon", hasError ? "is-error" : "")}
            aria-hidden
          >
            {icon}
          </span>
        )}

        <input
          ref={ref}
          id={inputId}
          type={resolvedType}
          aria-invalid={hasError}
          aria-describedby={hasError ? errorId : undefined}
          className={cn(
            "ui-input",
            icon ? "has-icon" : "",
            passwordToggle ? "has-action" : "",
            hasError ? "is-error" : "",
            className,
          )}
          {...props}
        />

        {passwordToggle && (
          <button
            type="button"
            aria-pressed={visible}
            onClick={() => setVisible((v) => !v)}
            aria-label={`${visible ? "Hide" : "Show"} ${(label ?? "password").toLowerCase()}`}
            className="ui-input-action"
          >
            {visible ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      {hasError ? (
        <p id={errorId} role="alert" className="ui-field-error">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p className="ui-field-hint">{hint}</p>
      ) : null}
    </div>
  );
});
