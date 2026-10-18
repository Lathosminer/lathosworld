/**
 * The `next` param on /login (where to go after signing in). Only same-site paths:
 * it must start with "/" but not "//" or "/\", so it can never send someone off-site.
 */
export function safeNext(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const next = value.trim();
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\") || next.length > 300) return undefined;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(next)) return undefined;
  return next;
}
