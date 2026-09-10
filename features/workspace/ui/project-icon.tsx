import {
  BriefcaseBusiness,
  Code2,
  FolderKanban,
  Gamepad2,
  Globe2,
  LayoutGrid,
  Megaphone,
  Palette,
  Smartphone,
  type LucideProps,
} from "lucide-react";
import type { ComponentType } from "react";
import type { ProjectRecord } from "../catalog";

export type ProjectIconName =
  | "website"
  | "mobile"
  | "app"
  | "game"
  | "design"
  | "marketing"
  | "code"
  | "system"
  | "other";
const ICONS: Record<ProjectIconName, ComponentType<LucideProps>> = {
  website: Globe2,
  mobile: Smartphone,
  app: Smartphone,
  game: Gamepad2,
  design: Palette,
  marketing: Megaphone,
  code: Code2,
  system: LayoutGrid,
  other: BriefcaseBusiness,
};

export function ProjectIcon({
  project,
  size = 22,
  strokeWidth = 1.8,
}: {
  project: Pick<ProjectRecord, "icon"> & { color?: string };
  size?: number;
  strokeWidth?: number;
}) {
  const Icon =
    ICONS[
      (project.icon as ProjectIconName) in ICONS
        ? (project.icon as ProjectIconName)
        : "other"
    ] ?? FolderKanban;
  return <Icon size={size} strokeWidth={strokeWidth} aria-hidden="true" />;
}
