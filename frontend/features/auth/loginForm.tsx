"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, LockKeyhole, Mail } from "lucide-react";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { loginSchema, type LoginFormValues } from "@/lib/schemas/auth.schema";
import { SocialButtons } from "./socialButtons";
import { useTranslation } from "react-i18next";
import { Toast } from "@/shared/ui/toast";

export function LoginForm({
  onSwitchToRegister,
  onForgotPassword,
  onLoginSuccess,
}: {
  onSwitchToRegister: () => void;
  onForgotPassword: () => void;
  onLoginSuccess: (values: LoginFormValues) => Promise<void>;
}) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: "onTouched",
    defaultValues: { identifier: "", password: "", rememberMe: false },
  });
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 6000);
    return () => window.clearTimeout(timer);
  }, [notice]);
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[30px] font-semibold tracking-tight sm:text-[34px]">
          {t("auth.welcome")}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">{t("auth.waiting")}</p>
      </header>
      <SocialButtons disabled={isSubmitting} />
      <div className="auth-divider flex items-center gap-4 text-xs text-muted">
        <span />
        {t("auth.continueEmail")}
        <span />
      </div>
      <form
        noValidate
        onSubmit={handleSubmit(async (values) => {
          setNotice("");
          try {
            await onLoginSuccess(values);
          } catch (error) {
            setNotice(
              error instanceof Error ? error.message : "Could not sign in.",
            );
          }
        })}
        className="space-y-5"
      >
        <Input
          label={t("auth.emailOrUsername")}
          placeholder={t("auth.emailPlaceholder")}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          icon={<Mail size={17} />}
          error={errors.identifier?.message}
          {...register("identifier")}
        />
        <Input
          label={t("auth.password")}
          placeholder={t("auth.passwordPlaceholder")}
          autoComplete="current-password"
          passwordToggle
          icon={<LockKeyhole size={17} />}
          error={errors.password?.message}
          {...register("password")}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Checkbox label={t("auth.remember")} {...register("rememberMe")} />
          <button
            type="button"
            className="auth-text-link text-xs"
            onClick={onForgotPassword}
          >
            {t("auth.forgot")}
          </button>
        </div>
        {notice && (
          <div className="auth-toast">
            <Toast message={notice} onDismiss={() => setNotice("")} />
          </div>
        )}
        <Button
          type="submit"
          size="lg"
          className="auth-submit group"
          isLoading={isSubmitting}
        >
          {t("auth.signIn")}{" "}
          <ArrowRight
            size={16}
            className="transition-transform duration-300 group-hover:translate-x-1"
          />
        </Button>
      </form>
      <p className="text-center text-xs text-muted">
        {t("auth.newHere")}{" "}
        <button
          className="auth-text-link font-medium"
          onClick={onSwitchToRegister}
        >
          {t("auth.createAccount")}
        </button>
      </p>
    </div>
  );
}
