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

export function RegisterForm({
  onSwitchToLogin,
  onTerms,
}: {
  onSwitchToLogin: () => void;
  onTerms: () => void;
}) {
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
          Make room for more.
        </h1>
        <p className="mt-2 text-sm text-muted">
          A fresh start for you and your team.
        </p>
      </header>
      <SocialButtons disabled={isSubmitting} />
      <div className="auth-divider flex items-center gap-4 text-xs text-muted">
        <span />
        or sign up with email
        <span />
      </div>
      <form
        noValidate
        className="space-y-4"
        onSubmit={handleSubmit(() =>
          setNotice(
            "Your details pass validation. Account creation is not connected in this preview; no account has been created.",
          ),
        )}
      >
        <Input
          label="Full name"
          placeholder="Alex Morgan"
          autoComplete="name"
          icon={<UserRound size={17} />}
          error={errors.fullName?.message}
          {...register("fullName")}
        />
        <Input
          label="Email address"
          type="email"
          placeholder="you@company.com"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          icon={<Mail size={17} />}
          error={errors.email?.message}
          {...register("email")}
        />
        <div>
          <Input
            label="Password"
            placeholder="Create a password"
            autoComplete="new-password"
            passwordToggle
            icon={<LockKeyhole size={17} />}
            error={errors.password?.message}
            {...register("password")}
          />
          <PasswordStrengthMeter value={password} />
        </div>
        <Input
          label="Confirm password"
          placeholder="Re-enter your password"
          autoComplete="new-password"
          passwordToggle
          icon={<LockKeyhole size={17} />}
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />
        <div className="flex flex-wrap items-start gap-x-1.5 gap-y-1">
          <Checkbox
            label="I agree to the"
            error={errors.acceptTerms?.message}
            {...register("acceptTerms")}
          />
          <button
            type="button"
            className="auth-text-link text-xs leading-5"
            onClick={onTerms}
          >
            Terms &amp; Conditions
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
          Create Account{" "}
          <ArrowRight
            size={16}
            className="transition-transform duration-300 group-hover:translate-x-1"
          />
        </Button>
      </form>
      <p className="text-center text-xs text-muted">
        Already part of Orbit?{" "}
        <button
          className="auth-text-link font-medium"
          onClick={onSwitchToLogin}
        >
          Sign in
        </button>
      </p>
    </div>
  );
}
