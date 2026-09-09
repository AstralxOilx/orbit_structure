"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: ReactNode;
  fullWidth?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-slate-900 text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800 hover:shadow-xl hover:shadow-slate-900/25 active:scale-[0.98] dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 dark:shadow-black/40",
  outline:
    "border border-slate-200 bg-white/60 text-slate-700 hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98] dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800/60",
  ghost:
    "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-6 text-[15px]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      loadingText,
      leftIcon,
      fullWidth = true,
      disabled,
      children,
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        className={cn(
          `ui-button ui-button-${variant}`,
          "inline-flex items-center justify-center gap-2 rounded-xl font-semibold",
          "transition-all duration-300 ease-out",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950",
          "disabled:pointer-events-none disabled:opacity-60",
          fullWidth && "w-full",
          VARIANTS[variant],
          SIZES[size],
          className,
        )}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            <span>{loadingText ?? "กำลังดำเนินการ…"}</span>
          </>
        ) : (
          <>
            {leftIcon}
            {children}
          </>
        )}
      </button>
    );
  },
);
