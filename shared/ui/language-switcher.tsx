"use client";

import { Globe2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Select } from "./select";
import type { LanguagePreference } from "@/features/workspace/preferences";

export function LanguageSwitcher({
  value,
  onChange,
  compact = false,
}: {
  value?: LanguagePreference;
  onChange?: (language: LanguagePreference) => void;
  compact?: boolean;
}) {
  const { i18n } = useTranslation();
  const language = value ?? (i18n.language === "th" ? "th" : "en");
  const changeLanguage = (next: LanguagePreference) => {
    document.documentElement.lang = next;
    localStorage.setItem("orbit.language.v1", next);
    void i18n.changeLanguage(next);
    onChange?.(next);
  };
  return (
    <div className={`ui-language-switcher ${compact ? "is-compact" : ""}`}>
      <Globe2 size={compact ? 14 : 16} aria-hidden="true" />
      <Select
        aria-label="Language"
        value={language}
        onChange={(event) =>
          changeLanguage(event.target.value as LanguagePreference)
        }
        density={compact ? "compact" : "regular"}
      >
        <option value="en">EN</option>
        <option value="th">TH</option>
      </Select>
    </div>
  );
}
