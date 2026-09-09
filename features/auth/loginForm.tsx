"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, LockKeyhole, Mail } from "lucide-react";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { loginSchema, type LoginFormValues } from "@/lib/schemas/auth.schema";
import { SocialButtons } from "./socialButtons";

export function LoginForm({
  onSwitchToRegister,
  onForgotPassword,
}: {
  onSwitchToRegister: () => void;
  onForgotPassword: () => void;
}) {
  const [notice, setNotice] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: "onTouched",
    defaultValues: { identifier: "", password: "", rememberMe: false },
  });
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[30px] font-semibold tracking-tight sm:text-[34px]">
          Welcome back.
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Your next great idea is waiting for you.
        </p>
      </header>
      <SocialButtons disabled={isSubmitting} />
      <div className="auth-divider flex items-center gap-4 text-xs text-muted">
        <span />
        or continue with email
        <span />
      </div>
      <form
        noValidate
        onSubmit={handleSubmit(() =>
          setNotice(
            "Sign-in is not connected in this preview. You can explore the demo workspace using the link above.",
          ),
        )}
        className="space-y-5"
      >
        <Input
          label="Email or username"
          placeholder="you@company.com"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          icon={<Mail size={17} />}
          error={errors.identifier?.message}
          {...register("identifier")}
        />
        <Input
          label="Password"
          placeholder="Enter your password"
          autoComplete="current-password"
          passwordToggle
          icon={<LockKeyhole size={17} />}
          error={errors.password?.message}
          {...register("password")}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Checkbox label="Remember me" {...register("rememberMe")} />
          <button
            type="button"
            className="auth-text-link text-xs"
            onClick={onForgotPassword}
          >
            Forgot password?
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
          Sign In{" "}
          <ArrowRight
            size={16}
            className="transition-transform duration-300 group-hover:translate-x-1"
          />
        </Button>
      </form>
      <p className="text-center text-xs text-muted">
        New around here?{" "}
        <button
          className="auth-text-link font-medium"
          onClick={onSwitchToRegister}
        >
          Create an account
        </button>
      </p>
    </div>
  );
}
