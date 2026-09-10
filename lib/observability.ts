export function reportClientError(
  error: unknown,
  context?: Record<string, unknown>,
) {
  const payload = {
    message: error instanceof Error ? error.message : String(error),
    context,
    at: new Date().toISOString(),
  };
  console.error("[orbit:error]", payload);
  try {
    const key = "orbit.client-errors.v1";
    const previous = JSON.parse(localStorage.getItem(key) ?? "[]");
    localStorage.setItem(
      key,
      JSON.stringify(
        [payload, ...(Array.isArray(previous) ? previous : [])].slice(0, 50),
      ),
    );
  } catch {
    /* Reporting must never break the error boundary. */
  }
}
