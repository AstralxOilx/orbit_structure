"use client";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, LockKeyhole, Mail, UserRound } from "lucide-react";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import {
  registerSchema,
  type RegisterFormValues,
} from "@/lib/schemas/auth.schema";
import { SocialButtons } from "./socialButtons";
import { PasswordStrengthMeter } from "./passwordStrengthMeter";
import { useTranslation } from "react-i18next";

export function RegisterForm({
  onSwitchToLogin,
  onTerms,
}: {
  onSwitchToLogin: () => void;
  onTerms: () => void;
}) {
  const { t } = useTranslation();
  const [notice, setNotice] = useState("");
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: "onTouched",
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
    },
  });
  const password = useWatch({ control, name: "password" });
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-[30px] font-semibold tracking-tight sm:text-[34px]">
          {t("auth.fresh")}
        </h1>
        <p className="mt-2 text-sm text-muted">{t("auth.start")}</p>
      </header>
      <SocialButtons disabled={isSubmitting} />
      <div className="auth-divider flex items-center gap-4 text-xs text-muted">
        <span />
        {t("auth.signUpEmail")}
        <span />
      </div>
      <form
        noValidate
        className="space-y-4"
        onSubmit={handleSubmit(() =>
          setNotice(t("auth.registerPreviewNotice")),
        )}
      >
        <Input
          label={t("auth.fullName")}
          placeholder={t("auth.namePlaceholder")}
          autoComplete="name"
          icon={<UserRound size={17} />}
          error={errors.fullName?.message}
          {...register("fullName")}
        />
        <Input
          label={t("auth.email")}
          type="email"
          placeholder={t("auth.emailPlaceholder")}
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          icon={<Mail size={17} />}
          error={errors.email?.message}
          {...register("email")}
        />
        <div>
          <Input
            label={t("auth.password")}
            placeholder={t("auth.createPasswordPlaceholder")}
            autoComplete="new-password"
            passwordToggle
            icon={<LockKeyhole size={17} />}
            error={errors.password?.message}
            {...register("password")}
          />
          <PasswordStrengthMeter value={password} />
        </div>
        <Input
          label={t("auth.confirm")}
          placeholder={t("auth.confirmPasswordPlaceholder")}
          autoComplete="new-password"
          passwordToggle
          icon={<LockKeyhole size={17} />}
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />
        <div className="flex flex-wrap items-start gap-x-1.5 gap-y-1">
          <Checkbox
            label={t("auth.agreeTo")}
            error={errors.acceptTerms?.message}
            {...register("acceptTerms")}
          />
          <button
            type="button"
            className="auth-text-link text-xs leading-5"
            onClick={onTerms}
          >
            {t("auth.terms")}
          </button>
        </div>
        {notice && (
          <p className="auth-notice" role="status">
            {notice}
          </p>
        )}
        <Button
          type="submit"
          size="lg"
          className="auth-submit group"
          isLoading={isSubmitting}
        >
          {t("auth.create")}{" "}
          <ArrowRight
            size={16}
            className="transition-transform duration-300 group-hover:translate-x-1"
          />
        </Button>
      </form>
      <p className="text-center text-xs text-muted">
        {t("auth.already")}{" "}
        <button
          className="auth-text-link font-medium"
          onClick={onSwitchToLogin}
        >
          {t("auth.signIn")}
        </button>
      </p>
    </div>
  );
}
