/**
 * Request handlers for the Twitch / YouTube follow checks. Sign-in to the site
 * is required first; the OAuth hop only proves which Twitch / YouTube account
 * the person controls and whether it follows / subscribes. Tokens are revoked
 * right after the check and never stored.
 */
import { getSql } from "./db.ts";
import {
  OAUTH_COOKIE,
  authorizeUrl,
  checkTwitch,
  checkYouTube,
  currentState,
  ensureEntrant,
  hasWallet,
  isAdminUser,
  isBanned,
  isUniqueViolation,
  rateLimited,
  type OAuthProvider,
} from "./giveaway.server.ts";
import { isEntryWindowOpen } from "./giveaway.ts";

function back(origin: string, provider: string, result: string, extraCookie?: string): Response {
  const headers = new Headers({ Location: `${origin}/giveaway?${provider}=${encodeURIComponent(result)}#entries` });
  headers.set("Cache-Control", "no-store");
  if (extraCookie) headers.append("Set-Cookie", extraCookie);
  return new Response(null, { status: 302, headers });
}

/** Not signed in: go to sign-in, then come straight back to the giveaway. */
function toLogin(origin: string, extraCookie?: string): Response {
  const headers = new Headers({ Location: `${origin}/login?next=${encodeURIComponent("/giveaway")}` });
  headers.set("Cache-Control", "no-store");
  if (extraCookie) headers.append("Set-Cookie", extraCookie);
  return new Response(null, { status: 302, headers });
}

function clearCookie(): string {
  return `${OAUTH_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

function readCookie(request: Request, name: string): string | null {
  const raw = request.headers.get("cookie") ?? "";
  for (const part of raw.split(/;\s*/)) {
    const eq = part.indexOf("=");
    if (eq > 0 && part.slice(0, eq) === name) return decodeURIComponent(part.slice(eq + 1));
  }
  return null;
}

function asProvider(value: string | undefined): OAuthProvider | null {
  return value === "twitch" || value === "youtube" ? value : null;
}

async function sessionUserId(request: Request): Promise<string | null> {
  try {
    const { auth } = await import("./auth/server.ts");
    const session = await auth.api.getSession({ headers: request.headers });
    return session?.user?.id ?? null;
  } catch (err) {
    console.error("[giveaway] session", err);
    return null;
  }
}

async function allowed(userId: string): Promise<boolean> {
  const sql = await getSql();
  if (await isAdminUser(sql, userId, null)) return true;
  if (currentState() !== "open" || !isEntryWindowOpen()) return false;
  return !(await isBanned(sql, userId));
}

export async function startOAuth(request: Request, providerParam: string | undefined): Promise<Response> {
  const origin = new URL(request.url).origin;
  const provider = asProvider(providerParam);
  if (!provider) return back(origin, "oauth", "error");
  const userId = await sessionUserId(request);
  if (!userId) return toLogin(origin);
  if (!(await allowed(userId))) return back(origin, provider, "closed");
  const sql = await getSql();
  // A BNB Smart Chain wallet is required before any entry counts.
  if (!(await hasWallet(sql, userId))) return back(origin, provider, "wallet");
  if (await rateLimited(sql, userId, `oauth:${provider}`)) return back(origin, provider, "slow");
  const state = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const url = authorizeUrl(provider, origin, state);
  if (!url) return back(origin, provider, "not_configured");
  const headers = new Headers({ Location: url, "Cache-Control": "no-store" });
  headers.append(
    "Set-Cookie",
    `${OAUTH_COOKIE}=${encodeURIComponent(`${provider}.${state}.${userId}`)}; Path=/; Max-Age=600; HttpOnly; Secure; SameSite=Lax`,
  );
  return new Response(null, { status: 302, headers });
}

export async function finishOAuth(request: Request, providerParam: string | undefined): Promise<Response> {
  const url = new URL(request.url);
  const origin = url.origin;
  const provider = asProvider(providerParam);
  if (!provider) return back(origin, "oauth", "error", clearCookie());
  const cookie = readCookie(request, OAUTH_COOKIE) ?? "";
  const [cookieProvider, cookieState, cookieUser] = cookie.split(".");
  const state = url.searchParams.get("state") ?? "";
  const code = url.searchParams.get("code") ?? "";
  if (url.searchParams.get("error")) return back(origin, provider, "cancelled", clearCookie());
  if (!code || !state || cookieProvider !== provider || cookieState !== state) {
    return back(origin, provider, "expired", clearCookie());
  }
  const userId = await sessionUserId(request);
  if (!userId) return toLogin(origin, clearCookie());
  if (userId !== cookieUser) return back(origin, provider, "signin", clearCookie());
  if (!(await allowed(userId))) return back(origin, provider, "closed", clearCookie());
  const sql = await getSql();
  await ensureEntrant(sql, userId);
  try {
    if (provider === "twitch") {
      const result = await checkTwitch(code, origin);
      if (!result.ok) return back(origin, provider, result.error === "not_configured" ? "not_configured" : "error", clearCookie());
      const status = result.following ? "verified" : "not_following";
      await sql`
        update giveaway_entrant
        set twitch_user_id = ${result.userId}, twitch_login = ${result.login}, twitch_status = ${status},
            twitch_checked_at = now(), updated_at = now()
        where user_id = ${userId} and twitch_status <> 'rejected'
      `;
      return back(origin, provider, status, clearCookie());
    }
    const result = await checkYouTube(code, origin);
    if (!result.ok) {
      const reason = result.error === "not_configured" || result.error === "no_channel" ? result.error : "error";
      return back(origin, provider, reason, clearCookie());
    }
    const status = result.subscribed ? "verified" : "not_subscribed";
    await sql`
      update giveaway_entrant
      set youtube_channel_id = ${result.channelId}, youtube_title = ${result.title}, youtube_status = ${status},
          youtube_checked_at = now(), updated_at = now()
      where user_id = ${userId} and youtube_status <> 'rejected'
    `;
    return back(origin, provider, status, clearCookie());
  } catch (err) {
    if (isUniqueViolation(err)) return back(origin, provider, "taken", clearCookie());
    console.error("[giveaway] oauth", provider, err instanceof Error ? err.message : "failed");
    return back(origin, provider, "error", clearCookie());
  }
}
