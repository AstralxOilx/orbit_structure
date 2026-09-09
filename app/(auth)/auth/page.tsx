import type { Metadata } from "next";
import { AuthScreen } from "@/features/auth/auth-screen";
import "@/features/auth/auth.css";

export const metadata: Metadata = {
  title: "Welcome to Orbit — Sign in or create an account",
};

export default function AuthPage() {
  return <AuthScreen />;
}
