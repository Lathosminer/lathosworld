import { COMMUNITY_COUNT_FALLBACK, COMMUNITY_HANDLES } from "./community-counts.ts";

/** Public community counts. Null means that source is not configured or did not answer. */
export type CommunityPayload = {
  twitch: number | null;
  youtube: number | null;
  x: number | null;
  tiktok: number | null;
  recent: { name: string; followedAt: string }[];
};

export const EMPTY_COMMUNITY: CommunityPayload = {
  twitch: null,
  youtube: null,
  x: null,
  tiktok: null,
  recent: [],
};

export function hasCommunity(data: CommunityPayload | null | undefined): boolean {
  if (!data) return false;
  return (
    data.twitch != null ||
    data.youtube != null ||
    data.x != null ||
    data.tiktok != null ||
    data.recent.length > 0
  );
}

/** Keeps a live count. A null X or TikTok count falls back to `community-counts.ts`. */
export function applyCommunityFallback(body: CommunityPayload): CommunityPayload {
  return {
    ...body,
    x: body.x ?? COMMUNITY_COUNT_FALLBACK.x,
    tiktok: body.tiktok ?? COMMUNITY_COUNT_FALLBACK.tiktok,
  };
}

function count(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value;
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  return null;
}

function text(row: object, key: string): string {
  const value = (row as Record<string, unknown>)[key];
  return typeof value === "string" ? value.trim() : "";
}

/** Helix Get Channel Followers. Drops user ids so the browser only sees display names. */
export function parseTwitchFollowers(body: unknown): { total: number | null; recent: CommunityPayload["recent"] } {
  if (!body || typeof body !== "object") return { total: null, recent: [] };
  const total = count((body as { total?: unknown }).total);
  const rows = (body as { data?: unknown }).data;
  const recent: CommunityPayload["recent"] = [];
  if (Array.isArray(rows)) {
    for (const row of rows) {
      if (!row || typeof row !== "object") continue;
      const name = text(row, "user_name") || text(row, "user_login");
      if (!name) continue;
      recent.push({ name: name.slice(0, 40), followedAt: text(row, "followed_at") });
    }
  }
  return { total, recent };
}

/** YouTube channels.list statistics. A hidden count stays null. */
export function parseYouTubeSubscribers(body: unknown): number | null {
  if (!body || typeof body !== "object") return null;
  const items = (body as { items?: unknown }).items;
  if (!Array.isArray(items) || !items[0] || typeof items[0] !== "object") return null;
  const stats = (items[0] as { statistics?: unknown }).statistics;
  if (!stats || typeof stats !== "object") return null;
  if ((stats as { hiddenSubscriberCount?: unknown }).hiddenSubscriberCount === true) return null;
  return count((stats as { subscriberCount?: unknown }).subscriberCount);
}

/** X API v2 user public_metrics.followers_count. */
export function parseXFollowers(body: unknown): number | null {
  if (!body || typeof body !== "object") return null;
  const data = (body as { data?: unknown }).data;
  if (!data || typeof data !== "object") return null;
  const metrics = (data as { public_metrics?: unknown }).public_metrics;
  if (!metrics || typeof metrics !== "object") return null;
  return count((metrics as { followers_count?: unknown }).followers_count);
}

/**
 * Follower count from a public x.com profile document.
 * Accepts the escaped `relationship_counts` blob and the inline `followers:` field.
 * Returns null unless the handle is on the page, so a login wall does not match.
 */
export function parseXProfileFollowers(page: string, username = COMMUNITY_HANDLES.x): number | null {
  if (!page.includes(username)) return null;
  const patterns = [
    /\\"relationship_counts\\":\{\\"followers\\":(\d+)/,
    /"relationship_counts":\{"followers":(\d+)/,
    /,followers:(\d+),following:/,
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(page);
    const value = match ? count(match[1]) : null;
    if (value != null) return value;
  }
  return null;
}

/** TikTok Display API `user/info` follower_count. */
export function parseTikTokUserInfo(body: unknown): number | null {
  if (!body || typeof body !== "object") return null;
  const data = (body as { data?: unknown }).data;
  if (!data || typeof data !== "object") return null;
  const user = (data as { user?: unknown }).user;
  if (!user || typeof user !== "object") return null;
  return count((user as { follower_count?: unknown }).follower_count);
}

/**
 * Follower count from a public TikTok profile document.
 * The number has to sit on the same user as `uniqueId`, not a suggested account.
 */
export function parseTikTokProfileFollowers(
  page: string,
  uniqueId = COMMUNITY_HANDLES.tiktok,
): number | null {
  const idAt = page.indexOf(`"uniqueId":"${uniqueId}"`);
  if (idAt < 0) return null;
  const window = page.slice(idAt, idAt + 30_000);
  const marker = '"stats":{"followerCount":';
  const at = window.indexOf(marker);
  if (at < 0) return null;
  const nextUser = window.indexOf('"uniqueId":"', 1);
  if (nextUser !== -1 && nextUser < at) return null;
  return count(/^(\d+)/.exec(window.slice(at + marker.length, at + marker.length + 16))?.[1]);
}
