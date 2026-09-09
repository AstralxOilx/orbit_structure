import { Avatar, type AvatarProps } from "@/shared/ui/avatar";
import { MEMBERS } from "../data";

export function MemberAvatar({
  id,
  ...props
}: Omit<AvatarProps, "name" | "initials" | "color"> & { id: string }) {
  const member = MEMBERS.find((item) => item.id === id);
  return (
    <Avatar
      {...props}
      name={member?.name ?? "Unassigned"}
      initials={member?.initials ?? "?"}
      color={member?.color ?? "slate"}
    />
  );
}
