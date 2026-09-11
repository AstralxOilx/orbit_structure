import { z, type ZodType } from "zod";

const buckets = new Map<string, { count: number; resetAt: number }>();

export function parseRequest<T>(schema: ZodType<T>, value: unknown) {
  return schema.parse(value);
}

export function checkRateLimit(key: string, limit = 60, windowMs = 60_000) {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }
  current.count += 1;
  return {
    allowed: current.count <= limit,
    remaining: Math.max(0, limit - current.count),
    retryAfterMs: current.resetAt - now,
  };
}

export function logServerEvent(
  event: string,
  details: Record<string, unknown> = {},
) {
  console.info("[orbit]", event, details);
}

export { z };
