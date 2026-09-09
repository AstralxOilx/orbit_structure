"use client";

import { useState } from "react";
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

export function AuthScreen() {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [info, setInfo] = useState<AuthInfo | null>(null);
  const reduced = useReducedMotion();
  return (
    <MotionConfig
      reducedMotion="user"
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <AuthLayout activeTab={tab} onTabChange={setTab} onInfo={setInfo}>
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
              />
            ) : (
              <RegisterForm
                onSwitchToLogin={() => setTab("login")}
                onTerms={() => setInfo("terms")}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </AuthLayout>
      {info && <AuthInfoDialog kind={info} onClose={() => setInfo(null)} />}
    </MotionConfig>
  );
}
