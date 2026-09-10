"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/observability";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError(new Error("Application render error"));
  }, []);
  return (
    <main role="alert" style={{ padding: 32 }}>
      <h1>Something went wrong</h1>
      <p>Orbit could not display this page.</p>
      <button type="button" onClick={() => reset()}>
        Try again
      </button>
    </main>
  );
}
