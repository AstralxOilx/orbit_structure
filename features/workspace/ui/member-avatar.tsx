"use client";

import { Avatar, type AvatarProps } from "@/shared/ui/avatar";
import { useTranslation } from "react-i18next";
import { useMembers } from "../catalog";

export function MemberAvatar({
  id,
  ...props
}: Omit<AvatarProps, "name" | "initials" | "color"> & { id: string }) {
  const { t } = useTranslation();
  const member = useMembers().find((item) => item.id === id);
  return (
    <Avatar
      {...props}
      name={member?.name ?? t("workspace.unassigned")}
      initials={member?.initials ?? "?"}
      color={member?.color ?? "slate"}
    />
  );
}
