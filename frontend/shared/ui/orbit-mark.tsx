import { OrbitLogo } from "./orbit-logo";

export function OrbitMark({ small = false }: { small?: boolean }) {
  return (
    <OrbitLogo
      className={`orbit-mark ${small ? "small" : ""}`}
      size={small ? 24 : 33}
    />
  );
}
