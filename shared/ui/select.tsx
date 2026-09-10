"use client";

import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Compact controls fit toolbars; regular controls fit forms. */
  density?: "compact" | "regular";
  variant?: "default" | "subtle";
}

/** Native form semantics, keyboard navigation and mobile picker are preserved.
 * Supply a wrapping label, htmlFor label, or aria-label at the call site.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select(
    { className, density = "regular", variant = "default", ...props },
    ref,
  ) {
    return (
      <select
        {...props}
        ref={ref}
        className={cn("ui-select", className)}
        data-density={density}
        data-variant={variant}
      />
    );
  },
);
