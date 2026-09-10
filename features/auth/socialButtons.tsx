"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

type Provider = "google" | "github";

interface Props {
  onProviderClick?: (provider: Provider) => Promise<void> | void;
  disabled?: boolean;
}

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden>
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 0 0-9.82 6.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
    />
  </svg>
);

const GithubIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className="h-[18px] w-[18px] fill-current"
    aria-hidden
  >
    <path d="M12 .5a12 12 0 0 0-3.79 23.4c.6.1.82-.26.82-.58v-2.17c-3.34.73-4.04-1.42-4.04-1.42-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.96 0-1.32.47-2.39 1.24-3.23-.13-.3-.54-1.53.11-3.18 0 0 1.01-.32 3.3 1.23a11.4 11.4 0 0 1 6.01 0c2.29-1.55 3.3-1.23 3.3-1.23.65 1.65.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.23 0 4.63-2.8 5.65-5.48 5.95.43.37.82 1.1.82 2.22v3.29c0 .32.21.7.82.58A12 12 0 0 0 12 .5Z" />
  </svg>
);

export function SocialButtons({ onProviderClick, disabled = false }: Props) {
  const { t } = useTranslation();
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState<Provider | null>(null);

  const handleClick = async (provider: Provider) => {
    try {
      setNotice("");
      if (!onProviderClick) {
        setNotice(
          t("auth.socialUnavailable", {
            provider: provider === "google" ? "Google" : "GitHub",
          }),
        );
        return;
      }
      setPending(provider);
      await onProviderClick(provider);
    } catch {
      setNotice(t("auth.socialError"));
    } finally {
      setPending(null);
    }
  };

  const providers = [
    { id: "google" as const, label: "Google", icon: <GoogleIcon /> },
    { id: "github" as const, label: "GitHub", icon: <GithubIcon /> },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
        {providers.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => handleClick(p.id)}
            disabled={disabled || pending !== null}
            className={cn(
              "auth-social group inline-flex h-11 items-center justify-center gap-2.5 rounded-xl",
              "border text-sm font-medium backdrop-blur-sm",
              "transition-all duration-300 ease-out",
              "hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/60",
              "active:translate-y-0 active:scale-[0.98]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
              "disabled:pointer-events-none disabled:opacity-50",
              "",
            )}
          >
            {pending === p.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <span className="transition-transform duration-300 group-hover:scale-110">
                {p.icon}
              </span>
            )}
            <span>{t("auth.continueWith", { provider: p.label })}</span>
          </button>
        ))}
      </div>
      {notice && (
        <p role="status" className="auth-notice">
          {notice}
        </p>
      )}
    </div>
  );
}
