"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AnimatePresence,
  motion,
  MotionConfig,
  useReducedMotion,
} from "framer-motion";
import { AuthLayout } from "./authLayout";
import { LoginForm } from "./loginForm";
import { RegisterForm } from "./registerForm";
import { AuthInfoDialog, type AuthInfo } from "./auth-info";
import {
  AssetManager,
  AssetManagerError,
  type AssetProgress,
} from "@/features/assets/asset-manager";
import "@/features/assets/assets.css";
import { currentUser, login, register } from "@/lib/auth-api";
import type {
  LoginFormValues,
  RegisterFormValues,
} from "@/lib/schemas/auth.schema";

export function AuthScreen() {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [info, setInfo] = useState<AuthInfo | null>(null);
  const [assetProgress, setAssetProgress] = useState<AssetProgress | null>(
    null,
  );
  const assetManager = useRef<AssetManager | null>(null);
  const starting = useRef(false);
  const router = useRouter();
  const reduced = useReducedMotion();

  useEffect(() => {
    let active = true;
    void currentUser()
      .then(() => {
        if (active) router.replace("/workspace");
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [router]);

  const startAssetPreparation = () => {
    if (starting.current) return;
    starting.current = true;
    const manager = new AssetManager(setAssetProgress, 4);
    assetManager.current = manager;
    void manager
      .prepare()
      .then(() => {
        starting.current = false;
        if (!manager.isPaused) router.replace("/workspace");
      })
      .catch((error: unknown) => {
        starting.current = false;
        setAssetProgress({
          state: "error",
          downloadedBytes: 0,
          totalBytes: 0,
          percent: 0,
          bytesPerSecond: 0,
          error:
            error instanceof Error ? error.message : "Asset download failed",
          errorCode:
            error instanceof AssetManagerError ? error.code : "DOWNLOAD_FAILED",
        });
      });
  };

  const cancelAssetPreparation = () => {
    assetManager.current?.cancel();
    starting.current = false;
    setAssetProgress(null);
  };

  const pauseAssetPreparation = () => {
    assetManager.current?.pause();
    starting.current = false;
  };
  const handleLogin = async ({
    identifier,
    password,
    rememberMe,
  }: LoginFormValues) => {
    await login(identifier, password, rememberMe);
    startAssetPreparation();
  };
  const handleRegister = async ({
    fullName,
    email,
    password,
  }: RegisterFormValues) => {
    await register(fullName, email, password);
    startAssetPreparation();
  };
  return (
    <MotionConfig
      reducedMotion="user"
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <AuthLayout
        activeTab={tab}
        onTabChange={setTab}
        onInfo={setInfo}
        assetProgress={assetProgress}
        onPauseAssets={pauseAssetPreparation}
        onResumeAssets={startAssetPreparation}
        onRetryAssets={startAssetPreparation}
        onCancelAssets={cancelAssetPreparation}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            role="tabpanel"
            id={`auth-panel-${tab}`}
            aria-labelledby={`auth-tab-${tab}`}
            initial={{ opacity: 0, y: reduced ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduced ? 0 : -5 }}
            transition={{ duration: reduced ? 0 : 0.15 }}
          >
            {tab === "login" ? (
              <LoginForm
                onSwitchToRegister={() => setTab("register")}
                onForgotPassword={() => setInfo("reset")}
                onLoginSuccess={handleLogin}
              />
            ) : (
              <RegisterForm
                onSwitchToLogin={() => setTab("login")}
                onTerms={() => setInfo("terms")}
                onRegisterSuccess={handleRegister}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </AuthLayout>
      {info && <AuthInfoDialog kind={info} onClose={() => setInfo(null)} />}
    </MotionConfig>
  );
}
