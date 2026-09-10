import type { ButtonHTMLAttributes } from "react";
import { Tooltip } from "./tooltip";

export function IconButton({
  label,
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <Tooltip content={label}>
      <button
        type="button"
        className={`icon-button ${className}`}
        aria-label={label}
        {...props}
      >
        {children}
      </button>
    </Tooltip>
  );
}
