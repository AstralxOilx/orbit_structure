"use client";

import { OrbitLogo } from "@/shared/ui";
import type { WorkspaceRecord } from "../catalog";

export function WorkspaceLogo({
  workspace,
  size = "md",
}: {
  workspace: Pick<WorkspaceRecord, "logo" | "initials" | "color">;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <span
      className={`workspace-logo workspace-logo-${workspace.color} workspace-logo-${size}`}
      aria-hidden="true"
    >
      <OrbitLogo size={size === "lg" ? 58 : 36} />
    </span>
  );
}
