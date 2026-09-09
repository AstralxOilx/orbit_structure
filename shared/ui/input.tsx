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
  label: string;
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
    <div className="ui-field w-full space-y-1.5">
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-slate-700 dark:text-slate-300"
      >
        {label}
      </label>

      <div className="relative group">
        {icon && (
          <span
            className={cn(
              "pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-300",
              hasError
                ? "text-rose-500"
                : "text-slate-400 group-focus-within:text-indigo-500 dark:text-slate-500",
            )}
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
            "h-11 w-full rounded-xl border bg-white/70 text-sm text-slate-900 placeholder:text-slate-400",
            "backdrop-blur-sm transition-all duration-300 ease-out",
            "focus:outline-none focus:ring-4",
            "dark:bg-slate-900/50 dark:text-slate-100 dark:placeholder:text-slate-500",
            icon ? "pl-11" : "pl-4",
            passwordToggle ? "pr-11" : "pr-4",
            hasError
              ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/15 dark:border-rose-500/60"
              : "border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-indigo-500/15 dark:border-slate-700 dark:hover:border-slate-600 dark:focus:border-indigo-400",
            className,
          )}
          {...props}
        />

        {passwordToggle && (
          <button
            type="button"
            aria-pressed={visible}
            onClick={() => setVisible((v) => !v)}
            aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition-all duration-200 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
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
        <p
          id={errorId}
          role="alert"
          className="flex animate-slide-down items-center gap-1.5 text-xs font-medium text-rose-500"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-slate-400 dark:text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
});
