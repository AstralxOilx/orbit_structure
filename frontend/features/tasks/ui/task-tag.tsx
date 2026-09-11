import { Tag } from "@/shared/ui/tag";
import { TAG_COLORS } from "@/features/workspace/data";

export function TaskTag({ name }: { name: string }) {
  return <Tag name={name} color={TAG_COLORS[name] ?? "purple"} />;
}
