"use client";
import { Check } from "lucide-react";

export function PasswordStrengthMeter({ value }: { value: string }) {
  const rules = [
    { label: "8+ characters", passed: value.length >= 8 },
    {
      label: "Upper & lowercase",
      passed: /[a-z]/.test(value) && /[A-Z]/.test(value),
    },
    { label: "A number", passed: /[0-9]/.test(value) },
    { label: "A symbol", passed: /[^A-Za-z0-9]/.test(value) },
  ];
  const score = rules.filter((rule) => rule.passed).length;
  const level = !value
    ? "Use 8+ characters, letters, a number & a symbol."
    : score <= 1
      ? "Weak"
      : score <= 3
        ? "Getting stronger"
        : "Strong";
  return (
    <div className="mt-2.5 space-y-2" aria-label="Password strength">
      <div
        className="flex gap-1.5"
        role="meter"
        aria-label="Password strength"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={4}
        aria-valuetext={level}
      >
        {rules.map((rule, index) => (
          <span
            key={rule.label}
            className={`auth-strength-segment h-1 flex-1 rounded-full ${index < score ? (score === 4 ? "strength-strong" : score > 1 ? "strength-medium" : "strength-weak") : ""}`}
          />
        ))}
      </div>
      <p className="text-[11px] leading-5 text-muted" aria-live="polite">
        {level}
      </p>
      {value && (
        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
          {rules.map((rule) => (
            <span
              key={rule.label}
              className={`flex items-center gap-1 text-[10px] ${rule.passed ? "text-[var(--auth-success)]" : "text-muted"}`}
            >
              <Check
                size={11}
                className={rule.passed ? "opacity-100" : "opacity-30"}
              />
              {rule.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
