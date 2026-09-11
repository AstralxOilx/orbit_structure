"use client";

import { Avatar, type AvatarProps } from "@/shared/ui/avatar";
import { useMembers } from "../catalog";

export function MemberAvatar({
  id,
  ...props
}: Omit<AvatarProps, "name" | "initials" | "color"> & { id: string }) {
  const member = useMembers().find((item) => item.id === id);
  return (
    <Avatar
      {...props}
      name={member?.name ?? "—"}
      initials={member?.initials ?? "—"}
      color={member?.color ?? "slate"}
    />
  );
}
