"use client";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";

export function PasswordStrengthMeter({ value }: { value: string }) {
  const { t } = useTranslation();
  const rules = [
    { label: t("auth.passwordRuleLength"), passed: value.length >= 8 },
    {
      label: t("auth.passwordRuleCase"),
      passed: /[a-z]/.test(value) && /[A-Z]/.test(value),
    },
    { label: t("auth.passwordRuleNumber"), passed: /[0-9]/.test(value) },
    { label: t("auth.passwordRuleSymbol"), passed: /[^A-Za-z0-9]/.test(value) },
  ];
  const score = rules.filter((rule) => rule.passed).length;
  const level = !value
    ? t("auth.passwordHint")
    : score <= 1
      ? t("auth.passwordWeak")
      : score <= 3
        ? t("auth.passwordGettingStronger")
        : t("auth.passwordStrong");
  return (
    <div className="mt-2.5 space-y-2" aria-label={t("auth.passwordStrength")}>
      <div
        className="flex gap-1.5"
        role="meter"
        aria-label={t("auth.passwordStrength")}
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
