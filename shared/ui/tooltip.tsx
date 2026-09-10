"use client";

import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

export function Tooltip({
  content,
  children,
  side = "right",
  asChild = false,
  forceOpen = false,
  onInteract,
}: {
  content: string;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  asChild?: boolean;
  forceOpen?: boolean;
  onInteract?: () => void;
}) {
  const id = useId();
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const adjustedRef = useRef(false);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const show = useCallback(
    (target?: HTMLElement) => {
      const rect = (target ?? wrapperRef.current)?.getBoundingClientRect();
      if (!rect) return;
      adjustedRef.current = false;
      setPosition(
        side === "right"
          ? { top: rect.top + rect.height / 2, left: rect.right + 9 }
          : side === "left"
            ? { top: rect.top + rect.height / 2, left: rect.left - 9 }
            : side === "top"
              ? { top: rect.top - 9, left: rect.left + rect.width / 2 }
              : { top: rect.bottom + 9, left: rect.left + rect.width / 2 },
      );
    },
    [side],
  );
  useEffect(() => {
    if (!position) return;
    const reposition = () => show();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [position, show]);
  useLayoutEffect(() => {
    const tooltip = tooltipRef.current;
    if (!tooltip || !position) return;
    if (adjustedRef.current) return;
    adjustedRef.current = true;
    const rect = tooltip.getBoundingClientRect();
    let left = position.left;
    let top = position.top;
    if (rect.left < 8) left += 8 - rect.left;
    if (rect.right > window.innerWidth - 8)
      left -= rect.right - (window.innerWidth - 8);
    if (rect.top < 8) top += 8 - rect.top;
    if (rect.bottom > window.innerHeight - 8)
      top -= rect.bottom - (window.innerHeight - 8);
    const nextPosition = {
      top: Math.round(top * 10) / 10,
      left: Math.round(left * 10) / 10,
    };
    if (
      Math.abs(position.top - nextPosition.top) >= 0.1 ||
      Math.abs(position.left - nextPosition.left) >= 0.1
    ) {
      setPosition(nextPosition);
    }
  }, [position]);
  useEffect(() => {
    if (forceOpen) show();
  }, [forceOpen, show]);
  const describedChild = isValidElement(children)
    ? cloneElement(children as ReactElement<{ "aria-describedby"?: string }>, {
        "aria-describedby": id,
      })
    : children;
  return (
    <span
      ref={wrapperRef}
      className={`ui-tooltip ui-tooltip-${side} ${asChild ? "ui-tooltip-as-child" : ""}`}
      onMouseEnter={(event) => show(event.target as HTMLElement)}
      onFocusCapture={(event) => {
        show(event.target as HTMLElement);
        onInteract?.();
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setPosition(null);
      }}
      onMouseLeave={() => {
        if (!forceOpen) setPosition(null);
      }}
      onClick={onInteract}
    >
      {describedChild}
      {position &&
        createPortal(
          <span
            ref={tooltipRef}
            id={id}
            className={`ui-tooltip-content ui-tooltip-floating ui-tooltip-floating-${side}`}
            role="tooltip"
            style={{ top: position.top, left: position.left }}
          >
            {content}
          </span>,
          document.body,
        )}
    </span>
  );
}

export function NewUserTooltip({
  id,
  content,
  children,
  side = "right",
}: {
  id: string;
  content: string;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
}) {
  const storageKey = `orbit.onboarding.tooltip.v1.${id}`;
  const [open, setOpen] = useState(false);
  useEffect(() => {
    queueMicrotask(() => setOpen(localStorage.getItem(storageKey) !== "1"));
  }, [storageKey]);
  const dismiss = () => {
    if (!open) return;
    localStorage.setItem(storageKey, "1");
    setOpen(false);
  };
  return (
    <Tooltip
      content={content}
      side={side}
      forceOpen={open}
      onInteract={dismiss}
    >
      {children}
    </Tooltip>
  );
}
