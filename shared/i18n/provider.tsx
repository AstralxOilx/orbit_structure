"use client";

import { useEffect, useState } from "react";
import { I18nextProvider } from "react-i18next";
import i18n from "./config";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState(i18n.language);
  useEffect(() => {
    const stored = localStorage.getItem("orbit.language.v1");
    if (stored === "th" || stored === "en") {
      document.documentElement.lang = stored;
    }
    const syncLanguage = () => {
      const language = document.documentElement.lang === "th" ? "th" : "en";
      if (i18n.language !== language) void i18n.changeLanguage(language);
    };
    syncLanguage();
    const onLanguageChanged = (next: string) => setLanguage(next);
    i18n.on("languageChanged", onLanguageChanged);
    const observer = new MutationObserver(syncLanguage);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["lang"],
    });
    return () => {
      observer.disconnect();
      i18n.off("languageChanged", onLanguageChanged);
    };
  }, []);
  return (
    <I18nextProvider i18n={i18n} key={language}>
      {children}
    </I18nextProvider>
  );
}
