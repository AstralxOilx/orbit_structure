export function OrbitMark({ small = false }: { small?: boolean }) {
  return (
    <span className={`orbit-mark ${small ? "small" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="7" stroke="currentColor" strokeWidth="2.3" />
        <ellipse
          cx="16"
          cy="16"
          rx="16"
          ry="6.5"
          transform="rotate(-40 16 16)"
          stroke="currentColor"
          strokeWidth="2"
        />
        <circle cx="26" cy="8" r="3" fill="currentColor" />
      </svg>
    </span>
  );
}
