"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { logout } from "@/lib/auth-api";
import { IconButton } from "@/shared/ui";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await logout();
    } catch {
      // The local route must still be closed if the session already expired.
    } finally {
      // Redirect even if the server session has already expired.
      router.replace("/");
      router.refresh();
      setLoading(false);
    }
  };

  return (
    <IconButton
      label="Sign out"
      onClick={() => void handleLogout()}
      disabled={loading}
      aria-busy={loading}
    >
      <LogOut size={16} />
    </IconButton>
  );
}
