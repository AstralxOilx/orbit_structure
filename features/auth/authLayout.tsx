"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/shared/theme/theme-toggle";
import { motion } from "framer-motion";
import { ArrowUpRight, Check, Layers3, Sparkles, Orbit } from "lucide-react";
import type { AuthInfo } from "./auth-info";

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
  return (
    <div className="auth-shell min-h-dvh lg:grid lg:grid-cols-[1.05fr_1fr]">
      <aside
        className="auth-story relative hidden min-h-dvh flex-col justify-between overflow-hidden p-10 lg:flex xl:p-14"
        aria-label="About Orbit"
      >
        <Link
          href="/workspace"
          className="auth-brand relative z-10 flex w-fit items-center gap-2.5 text-2xl font-semibold tracking-tight"
          aria-label="Orbit demo workspace"
        >
          <Orbit size={32} strokeWidth={1.6} />
          orbit<span className="auth-brand-dot">.</span>
        </Link>
        <div className="relative z-10 mx-auto w-full max-w-lg py-12">
          <div className="auth-eyebrow mb-6 flex items-center gap-2 text-xs font-medium tracking-[.16em]">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400" /> A LITTLE
            CLARITY. A LOT OF POSSIBILITY.
          </div>
          <h2 className="text-[clamp(2.5rem,4vw,4rem)] font-medium leading-[1.1] tracking-[-.05em]">
            Your best work.
            <br />
            <span className="auth-gradient-text">All in one orbit.</span>
          </h2>
          <p className="mt-6 max-w-sm text-[15px] leading-7 text-muted">
            Bring your projects, people, and next big ideas together. Make a
            little progress, every day.
          </p>
          <div
            className="auth-orbit-scene relative my-10 h-64"
            aria-hidden="true"
          >
            <div className="auth-orbit-ring ring-one" />
            <div className="auth-orbit-ring ring-two" />
            <div className="auth-orbit-ring ring-three" />
            <div className="auth-orbit-core">
              <Orbit size={58} strokeWidth={1} />
            </div>
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
                <strong>Website redesign</strong>
                <small>Ideas taking shape</small>
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
                <strong>A little win.</strong>
                <small>One step closer to the big picture.</small>
              </div>
            </motion.div>
            <span className="auth-star star-one">✦</span>
            <span className="auth-star star-two">✧</span>
          </div>
          <div className="flex items-start gap-3 border-t border-white/10 pt-6">
            <Sparkles size={18} className="mt-1 text-primary" />
            <p className="max-w-sm text-sm leading-6 text-muted">
              Less switching between tools.
              <br />
              <span className="text-foreground">
                More space for what matters.
              </span>
            </p>
          </div>
        </div>
        <div className="relative z-10 flex items-center justify-between text-xs text-muted">
          <span>© {new Date().getFullYear()} Orbit</span>
          <span>Built for better days.</span>
        </div>
      </aside>
      <main className="relative flex min-h-dvh flex-col px-6 py-6 sm:px-10 lg:px-12">
        <header className="flex items-center justify-between gap-3">
          <Link
            href="/workspace"
            aria-label="Orbit demo workspace"
            className="auth-brand flex items-center gap-2 text-xl font-semibold lg:invisible"
          >
            <Orbit size={27} />
            orbit.
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/workspace"
              className="auth-demo-link flex items-center gap-1.5 text-xs"
            >
              Explore the workspace <ArrowUpRight size={14} />
            </Link>
          </div>
        </header>
        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10 sm:py-12">
          <div
            className="auth-tabs relative mb-8 grid grid-cols-2 rounded-xl p-1"
            role="tablist"
            aria-label="Account access"
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
                  {tab === "login" ? "Login" : "Sign Up"}
                </span>
              </button>
            ))}
          </div>
          {children}
        </div>
        <footer className="mx-auto flex w-full max-w-[400px] items-center justify-between gap-3 text-[11px] text-muted">
          <span>Orbit workspace · UI preview</span>
          <div className="flex gap-4">
            <button onClick={() => onInfo("privacy")}>Privacy</button>
            <button onClick={() => onInfo("terms")}>Terms</button>
          </div>
        </footer>
      </main>
    </div>
  );
}
