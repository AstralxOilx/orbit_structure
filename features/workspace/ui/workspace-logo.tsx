"use client";

import { Layers3, Orbit, Rocket, Sparkles } from "lucide-react";
import type { WorkspaceRecord } from "../catalog";

export function WorkspaceLogo({
  workspace,
  size = "md",
}: {
  workspace: Pick<WorkspaceRecord, "logo" | "initials" | "color">;
  size?: "sm" | "md" | "lg";
}) {
  const Icon =
    workspace.logo === "orbit"
      ? Orbit
      : workspace.logo === "spark"
        ? Sparkles
        : workspace.logo === "layers"
          ? Layers3
          : workspace.logo === "rocket"
            ? Rocket
            : null;
  return (
    <span
      className={`workspace-logo workspace-logo-${workspace.color} workspace-logo-${size}`}
      aria-hidden="true"
    >
      {Icon ? (
        <Icon size={size === "lg" ? 27 : size === "md" ? 18 : 15} />
      ) : (
        workspace.initials
      )}
    </span>
  );
}
