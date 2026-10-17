import { env } from "@/lib/env.server";
import { YT_CHANNEL } from "@/lib/youtube-live.functions";
import {
  EMPTY_COMMUNITY,
  parseTwitchFollowers,
  parseXFollowers,
  parseYouTubeSubscribers,
  type CommunityPayload,
} from "@/lib/community";

const TTL_MS = 8 * 60 * 1000;
const FAIL_TTL_MS = 30 * 1000;
const TWITCH_LOGIN = "lathosworld";
const X_USERNAME = "lathos563";

let statsCache: { at: number; body: CommunityPayload } | null = null;
let appTokenCache: { token: string; exp: number } | null = null;

async function readJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function twitchAppToken(clientId: string, secret: string): Promise<string | null> {
  if (appTokenCache && Date.now() < appTokenCache.exp) return appTokenCache.token;
  try {
    const res = await fetch("https://id.twitch.tv/oauth2/token", {
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
    appTokenCache = { token: json.access_token, exp: Date.now() + Math.max(60, expires - 120) * 1000 };
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

async function twitchFollowers(clientId: string, token: string, broadcasterId: string, first: number) {
  try {
    const url = `https://api.twitch.tv/helix/channels/followers?broadcaster_id=${encodeURIComponent(broadcasterId)}&first=${first}`;
    const res = await fetch(url, {
      headers: helixHeaders(clientId, token),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    return parseTwitchFollowers(await readJson(res));
  } catch {
    return null;
  }
}

async function loadTwitch(): Promise<Pick<CommunityPayload, "twitch" | "recent">> {
  const clientId = env("TWITCH_CLIENT_ID");
  const secret = env("TWITCH_CLIENT_SECRET");
  const userToken = env("TWITCH_USER_TOKEN");
  if (!clientId || (!secret && !userToken)) return { twitch: null, recent: [] };

  const appToken = secret ? await twitchAppToken(clientId, secret) : null;
  const lookup = appToken ?? userToken;
  if (!lookup) return { twitch: null, recent: [] };
  const broadcasterId = await twitchUserId(clientId, lookup);
  if (!broadcasterId) return { twitch: null, recent: [] };

  // The recent list needs a broadcaster (or moderator) user token. That call also returns total.
  if (userToken) {
    const listed = await twitchFollowers(clientId, userToken, broadcasterId, 20);
    if (listed) return { twitch: listed.total, recent: listed.recent };
  }

  // App access token: counts only. Twitch may reject this; then the Twitch stat stays hidden.
  if (appToken) {
    const counted = await twitchFollowers(clientId, appToken, broadcasterId, 1);
    if (counted?.total != null) return { twitch: counted.total, recent: [] };
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

async function loadX(): Promise<number | null> {
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

async function loadCommunity(): Promise<CommunityPayload> {
  const [twitch, youtube, x] = await Promise.all([
    loadTwitch().catch(() => ({ twitch: null, recent: [] as CommunityPayload["recent"] })),
    loadYouTube().catch(() => null),
    loadX().catch(() => null),
  ]);
  return {
    twitch: twitch.twitch,
    youtube,
    x,
    recent: twitch.recent,
  };
}

/** Cached public counts. Secrets stay in this module. */
export async function getCommunityStats(): Promise<CommunityPayload> {
  const now = Date.now();
  if (statsCache && now - statsCache.at < TTL_MS) return statsCache.body;
  let body = EMPTY_COMMUNITY;
  try {
    body = await loadCommunity();
  } catch {
    body = EMPTY_COMMUNITY;
  }
  const fresh = body.twitch != null || body.youtube != null || body.x != null || body.recent.length > 0;
  statsCache = { at: fresh ? now : now - (TTL_MS - FAIL_TTL_MS), body };
  return body;
}
