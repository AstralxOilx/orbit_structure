"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/shared/theme/theme-toggle";
import { motion } from "framer-motion";
import { ArrowUpRight, Check, Layers3, Sparkles, Orbit } from "lucide-react";
import type { AuthInfo } from "./auth-info";
import { LanguageSwitcher } from "@/shared/ui";
import { useTranslation } from "react-i18next";

export function AuthLayout({
  children,
  activeTab,
  onTabChange,
  onInfo,
}: {
  children: ReactNode;
  activeTab: "login" | "register";
  onTabChange: (tab: "login" | "register") => void;
  onInfo: (info: AuthInfo) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="auth-shell min-h-dvh lg:grid lg:grid-cols-[1.05fr_1fr]">
      <aside
        className="auth-story relative hidden min-h-dvh flex-col justify-between overflow-hidden p-10 lg:flex xl:p-14"
        aria-label={t("auth.aboutOrbit")}
      >
        <div className="relative z-0 mx-auto w-full max-w-lg pb-12 pt-28">
          <div className="auth-eyebrow mb-6 flex items-center gap-2 text-xs font-medium tracking-[.16em]">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
            {t("auth.storyEyebrow")}
          </div>
          <h2 className="text-[clamp(2.5rem,4vw,4rem)] font-medium leading-[1.1] tracking-[-.05em]">
            {t("auth.storyHeading")}
            <br />
            <span className="auth-gradient-text">
              {t("auth.storyHeadingAccent")}
            </span>
          </h2>
          <p className="mt-6 max-w-sm text-[15px] leading-7 text-muted">
            {t("auth.storyDescription")}
          </p>
          <div
            className="auth-orbit-scene relative my-10 h-64"
            aria-hidden="true"
          >
            <span className="auth-shooting-star auth-shooting-star-one" />
            <span className="auth-shooting-star auth-shooting-star-two" />
            <div className="auth-orbit-ring ring-one" />
            <div className="auth-orbit-ring ring-two" />
            <div className="auth-orbit-ring ring-three" />
            <div className="auth-orbit-core">
              <Orbit size={58} strokeWidth={1} />
            </div>
            <span className="auth-satellite auth-satellite-one">✦</span>
            <motion.div
              className="auth-float-card auth-float-project"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
            >
              <span className="auth-mini-icon">
                <Layers3 size={17} />
              </span>
              <div>
                <strong>{t("auth.storyProject")}</strong>
                <small>{t("auth.storyProjectHint")}</small>
              </div>
              <span className="auth-mini-dots">
                <i />
                <i />
                <i />
              </span>
            </motion.div>
            <motion.div
              className="auth-float-card auth-float-done"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <span className="auth-mini-check">
                <Check size={15} />
              </span>
              <div>
                <strong>{t("auth.storyWin")}</strong>
                <small>{t("auth.storyWinHint")}</small>
              </div>
            </motion.div>
            <span className="auth-star star-one">✦</span>
            <span className="auth-star star-two">✧</span>
          </div>
          <div className="flex items-start gap-3 border-t border-white/10 pt-6">
            <Sparkles size={18} className="mt-1 text-primary" />
            <p className="max-w-sm text-sm leading-6 text-muted">
              {t("auth.storyFooterLine1")}
              <br />
              <span className="text-foreground">
                {t("auth.storyFooterLine2")}
              </span>
            </p>
          </div>
        </div>
        <div className="relative z-10 flex items-center justify-between text-xs text-muted">
          <span>© {new Date().getFullYear()} Orbit</span>
          <span>{t("auth.builtForBetterDays")}</span>
        </div>
      </aside>
      <main className="auth-main relative flex min-h-dvh flex-col px-6 pb-6 pt-24 sm:px-10 sm:pb-8 lg:px-12">
        <nav
          className="auth-navbar flex items-center justify-between gap-3"
          aria-label="Main navigation"
        >
          <Link
            href="/workspace"
            aria-label={t("auth.demoWorkspace")}
            className="auth-brand flex items-center gap-2.5 text-2xl font-semibold"
          >
            <Orbit size={32} strokeWidth={1.6} />
            orbit.
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <LanguageSwitcher compact />
            <ThemeToggle />
            <Link
              href="/workspace"
              className="auth-demo-link flex items-center gap-1.5 text-xs"
            >
              {t("auth.exploreWorkspace")} <ArrowUpRight size={14} />
            </Link>
          </div>
        </nav>
        <div className="auth-form-panel mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10 sm:py-12">
          <div
            className="auth-tabs relative mb-8 grid grid-cols-2 rounded-xl p-1"
            role="tablist"
            aria-label={t("auth.accountAccess")}
          >
            {(["login", "register"] as const).map((tab) => (
              <button
                key={tab}
                id={`auth-tab-${tab}`}
                role="tab"
                aria-selected={activeTab === tab}
                aria-controls={`auth-panel-${tab}`}
                tabIndex={activeTab === tab ? 0 : -1}
                type="button"
                className="relative h-10 rounded-lg text-sm font-medium"
                onClick={() => onTabChange(tab)}
                onKeyDown={(event) => {
                  if (
                    !["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                      event.key,
                    )
                  )
                    return;
                  event.preventDefault();
                  const next =
                    event.key === "Home"
                      ? "login"
                      : event.key === "End"
                        ? "register"
                        : activeTab === "login"
                          ? "register"
                          : "login";
                  onTabChange(next);
                  document.getElementById(`auth-tab-${next}`)?.focus();
                }}
              >
                {activeTab === tab && (
                  <motion.span
                    className="auth-tab-highlight absolute inset-0 rounded-lg"
                    layoutId="auth-tab"
                  />
                )}
                <span className="relative z-10">
                  {tab === "login" ? t("auth.loginTab") : t("auth.signUpTab")}
                </span>
              </button>
            ))}
          </div>
          {children}
        </div>
        <footer className="mx-auto flex w-full max-w-[400px] items-center justify-between gap-3 text-[11px] text-muted">
          <span>{t("auth.uiPreview")}</span>
          <div className="flex gap-4">
            <button onClick={() => onInfo("privacy")}>
              {t("auth.privacy")}
            </button>
            <button onClick={() => onInfo("terms")}>{t("auth.terms")}</button>
          </div>
        </footer>
      </main>
    </div>
  );
}
