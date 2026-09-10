import { Tooltip } from "./tooltip";

export interface AvatarProps {
  name?: string;
  initials?: string;
  color?: string;
  size?: "xs" | "sm" | "md" | "lg";
  label?: boolean;
}

/** A presentational avatar; callers own lookup and identity data. */
export function Avatar({
  name = "Unassigned",
  initials,
  color = "slate",
  size = "sm",
  label = true,
}: AvatarProps) {
  const text =
    initials ??
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  const avatar = (
    <span
      className={`avatar avatar-${size} avatar-${color}`}
      aria-label={label ? name : undefined}
    >
      {text || "?"}
    </span>
  );
  return label ? <Tooltip content={name}>{avatar}</Tooltip> : avatar;
}
