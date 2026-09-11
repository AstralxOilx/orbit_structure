export function Tag({
  name,
  color = "purple",
}: {
  name: string;
  color?: string;
}) {
  return (
    <span className={`tag tag-${color}`}>
      <span />
      {name}
    </span>
  );
}
