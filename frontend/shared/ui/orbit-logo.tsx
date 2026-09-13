type OrbitLogoProps = {
  size?: number;
  className?: string;
};

export function OrbitLogo({ size = 32, className = "" }: OrbitLogoProps) {
  return (
    <span
      className={`orbit-logo ${className}`.trim()}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 40 40" fill="none" role="presentation">
        <rect x="3" y="3" width="34" height="34" rx="10" fill="currentColor" />
        <path
          d="M8.5 24.2C10.8 15.9 18.1 9.8 26.3 10.4c4.2.3 7.1 2 8.8 4.1"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity=".72"
        />
        <ellipse
          cx="20"
          cy="20"
          rx="13.5"
          ry="6.2"
          transform="rotate(-34 20 20)"
          stroke="white"
          strokeWidth="1.5"
          opacity=".92"
        />
        <circle cx="20" cy="20" r="4.6" fill="white" opacity=".92" />
      </svg>
    </span>
  );
}
