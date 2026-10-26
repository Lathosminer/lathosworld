import { COMMUNITY_HANDLES } from "./community-counts.ts";
import { env } from "./env.server.ts";
import { YT_CHANNEL } from "./youtube-live.functions.ts";
import {
  EMPTY_COMMUNITY,
  applyCommunityFallback,
  parseTikTokProfileFollowers,
  parseTikTokUserInfo,
  parseTwitchFollowers,
  parseXFollowers,
  parseXProfileFollowers,
  parseYouTubeSubscribers,
  type CommunityPayload,
} from "./community.ts";

const TTL_MS = 8 * 60 * 1000;
const FAIL_TTL_MS = 30 * 1000;
const TWITCH_LOGIN = "lathosworld";
const X_USERNAME = COMMUNITY_HANDLES.x;
const TIKTOK_HANDLE = COMMUNITY_HANDLES.tiktok;
/** Public profile reads. A browser UA is what those pages actually answer. */
const PUBLIC_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const TOKEN_URL = "https://id.twitch.tv/oauth2/token";
/** Drop the cached user access token this many seconds before Twitch says it expires. */
const USER_TOKEN_SKEW_S = 120;

let statsCache: { at: number; body: CommunityPayload } | null = null;
let appTokenCache: { token: string; exp: number } | null = null;
let userTokenCache: { token: string; exp: number } | null = null;
/** Latest refresh token from Twitch. The env value is only the cold-start seed. */
let refreshTokenMemory: string | null = null;
let userTokenInflight: Promise<string | null> | null = null;

/** Clears cached stats and Twitch tokens. Used by unit tests. */
export function resetCommunityCaches(): void {
  statsCache = null;
  appTokenCache = null;
  userTokenCache = null;
  refreshTokenMemory = null;
  userTokenInflight = null;
}

async function readJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function userTokenExpiry(expiresIn: unknown): number {
  const seconds =
    typeof expiresIn === "number" && Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 3600;
  const skew = Math.min(USER_TOKEN_SKEW_S, Math.max(1, Math.floor(seconds / 2)));
  return Date.now() + (seconds - skew) * 1000;
}

function readRefreshToken(): string | undefined {
  return refreshTokenMemory || env("TWITCH_REFRESH_TOKEN");
}

async function requestUserToken(clientId: string, secret: string): Promise<string | null> {
  const refreshToken = readRefreshToken();
  if (!refreshToken) return null;
  try {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: secret,
      }),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const json = (await readJson(res)) as {
      access_token?: unknown;
      expires_in?: unknown;
      refresh_token?: unknown;
    } | null;
    if (!json || typeof json.access_token !== "string" || !json.access_token) return null;
    if (typeof json.refresh_token === "string" && json.refresh_token) {
      refreshTokenMemory = json.refresh_token;
    }
    userTokenCache = { token: json.access_token, exp: userTokenExpiry(json.expires_in) };
    return json.access_token;
  } catch {
    return null;
  }
}

/** One network refresh at a time so two callers cannot rotate the same refresh token. */
function forceRefreshUserToken(clientId: string, secret: string): Promise<string | null> {
  if (userTokenInflight) return userTokenInflight;
  const pending = requestUserToken(clientId, secret);
  userTokenInflight = pending;
  void pending.finally(() => {
    if (userTokenInflight === pending) userTokenInflight = null;
  });
  return pending;
}

async function userAccessToken(clientId: string, secret: string): Promise<string | null> {
  if (userTokenCache && Date.now() < userTokenCache.exp) return userTokenCache.token;
  return forceRefreshUserToken(clientId, secret);
}

async function resolveUserToken(
  clientId: string,
  secret: string | undefined,
): Promise<string | null> {
  if (secret && readRefreshToken()) return userAccessToken(clientId, secret);
  return env("TWITCH_USER_TOKEN") ?? null;
}

async function twitchAppToken(clientId: string, secret: string): Promise<string | null> {
  if (appTokenCache && Date.now() < appTokenCache.exp) return appTokenCache.token;
  try {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: secret,
        grant_type: "client_credentials",
      }),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const json = (await readJson(res)) as { access_token?: unknown; expires_in?: unknown } | null;
    if (!json || typeof json.access_token !== "string" || !json.access_token) return null;
    const expires = typeof json.expires_in === "number" ? json.expires_in : 3600;
    appTokenCache = {
      token: json.access_token,
      exp: Date.now() + Math.max(60, expires - 120) * 1000,
    };
    return json.access_token;
  } catch {
    return null;
  }
}

function helixHeaders(clientId: string, token: string): HeadersInit {
  return { "Client-Id": clientId, Authorization: `Bearer ${token}` };
}

async function twitchUserId(clientId: string, token: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.twitch.tv/helix/users?login=${TWITCH_LOGIN}`, {
      headers: helixHeaders(clientId, token),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const json = (await readJson(res)) as { data?: { id?: string }[] } | null;
    const id = json?.data?.[0]?.id;
    return typeof id === "string" && id ? id : null;
  } catch {
    return null;
  }
}

type HelixFollowers =
  | { ok: true; total: number | null; recent: CommunityPayload["recent"] }
  | { ok: false; status: number };

async function twitchFollowers(
  clientId: string,
  token: string,
  broadcasterId: string,
  first: number,
): Promise<HelixFollowers | null> {
  try {
    const url = `https://api.twitch.tv/helix/channels/followers?broadcaster_id=${encodeURIComponent(broadcasterId)}&first=${first}`;
    const res = await fetch(url, {
      headers: helixHeaders(clientId, token),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return { ok: false, status: res.status };
    const parsed = parseTwitchFollowers(await readJson(res));
    return { ok: true, total: parsed.total, recent: parsed.recent };
  } catch {
    return null;
  }
}

/** Recent followers need a user token. A 401 refreshes that token once and retries. */
async function recentFollowers(
  clientId: string,
  secret: string | undefined,
  token: string,
  broadcasterId: string,
): Promise<{ total: number | null; recent: CommunityPayload["recent"] } | null> {
  let current = token;
  let refresh = Boolean(secret && readRefreshToken());
  for (let attempt = 0; attempt < 2; attempt++) {
    const listed = await twitchFollowers(clientId, current, broadcasterId, 20);
    if (listed?.ok) return { total: listed.total, recent: listed.recent };
    const unauthorized = listed?.status === 401;
    if (!unauthorized || !refresh || !secret) {
      if (unauthorized) userTokenCache = null;
      return null;
    }
    userTokenCache = null;
    const next = await forceRefreshUserToken(clientId, secret);
    refresh = false;
    if (!next) return null;
    current = next;
  }
  return null;
}

async function loadTwitch(): Promise<Pick<CommunityPayload, "twitch" | "recent">> {
  const clientId = env("TWITCH_CLIENT_ID");
  const secret = env("TWITCH_CLIENT_SECRET");
  const staticUserToken = env("TWITCH_USER_TOKEN");
  if (!clientId || (!secret && !staticUserToken)) return { twitch: null, recent: [] };

  const [appToken, userToken] = await Promise.all([
    secret ? twitchAppToken(clientId, secret) : Promise.resolve(null),
    resolveUserToken(clientId, secret),
  ]);
  const lookup = appToken ?? userToken;
  if (!lookup) return { twitch: null, recent: [] };
  const broadcasterId = await twitchUserId(clientId, lookup);
  if (!broadcasterId) return { twitch: null, recent: [] };

  // The recent list needs a broadcaster (or moderator) user token. That call also returns total.
  if (userToken) {
    const listed = await recentFollowers(clientId, secret, userToken, broadcasterId);
    if (listed) return { twitch: listed.total, recent: listed.recent };
  }

  // App access token: counts only. Twitch may reject this; then the Twitch stat stays hidden.
  if (appToken) {
    const counted = await twitchFollowers(clientId, appToken, broadcasterId, 1);
    if (counted?.ok && counted.total != null) return { twitch: counted.total, recent: [] };
  }

  return { twitch: null, recent: [] };
}

async function loadYouTube(): Promise<number | null> {
  const key = env("YOUTUBE_API_KEY");
  if (!key) return null;
  try {
    const url = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${encodeURIComponent(YT_CHANNEL)}&key=${encodeURIComponent(key)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    return parseYouTubeSubscribers(await readJson(res));
  } catch {
    return null;
  }
}

async function loadXApi(): Promise<number | null> {
  const token = env("X_BEARER_TOKEN");
  if (!token) return null;
  try {
    const res = await fetch(
      `https://api.x.com/2/users/by/username/${X_USERNAME}?user.fields=public_metrics`,
      { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(6000) },
    );
    if (!res.ok) return null;
    return parseXFollowers(await readJson(res));
  } catch {
    return null;
  }
}

/** TikTok Display API. Only the account's own user token can see follower_count. */
async function loadTikTokApi(): Promise<number | null> {
  const token = env("TIKTOK_ACCESS_TOKEN");
  if (!token) return null;
  try {
    const res = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=follower_count", {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    return parseTikTokUserInfo(await readJson(res));
  } catch {
    return null;
  }
}

async function loadPublicPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "user-agent": PUBLIC_UA,
        accept: "text/html,application/xhtml+xml",
        "accept-language": "en-US,en;q=0.9",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const page = await res.text();
    return page.length > 1_500_000 ? page.slice(0, 1_500_000) : page;
  } catch {
    return null;
  }
}

/** Official API first, then the public profile. Null lets the static fallback show. */
async function loadX(): Promise<number | null> {
  const fromApi = await loadXApi();
  if (fromApi != null) return fromApi;
  const page = await loadPublicPage(`https://x.com/${X_USERNAME}`);
  return page ? parseXProfileFollowers(page) : null;
}

async function loadTikTok(): Promise<number | null> {
  const fromApi = await loadTikTokApi();
  if (fromApi != null) return fromApi;
  const page = await loadPublicPage(`https://www.tiktok.com/@${TIKTOK_HANDLE}`);
  return page ? parseTikTokProfileFollowers(page) : null;
}

async function loadCommunity(): Promise<CommunityPayload> {
  const [twitch, youtube, x, tiktok] = await Promise.all([
    loadTwitch().catch(() => ({ twitch: null, recent: [] as CommunityPayload["recent"] })),
    loadYouTube().catch(() => null),
    loadX().catch(() => null),
    loadTikTok().catch(() => null),
  ]);
  return {
    twitch: twitch.twitch,
    youtube,
    x,
    tiktok,
    recent: twitch.recent,
  };
}

function liveCount(body: CommunityPayload): boolean {
  return (
    body.twitch != null ||
    body.youtube != null ||
    body.x != null ||
    body.tiktok != null ||
    body.recent.length > 0
  );
}

/** Cached public counts. Secrets stay in this module. */
export async function getCommunityStats(): Promise<CommunityPayload> {
  const now = Date.now();
  if (statsCache && now - statsCache.at < TTL_MS) return statsCache.body;
  let loaded = EMPTY_COMMUNITY;
  try {
    loaded = await loadCommunity();
  } catch {
    loaded = EMPTY_COMMUNITY;
  }
  const fresh = liveCount(loaded);
  const body = applyCommunityFallback(loaded);
  statsCache = { at: fresh ? now : now - (TTL_MS - FAIL_TTL_MS), body };
  return body;
}
