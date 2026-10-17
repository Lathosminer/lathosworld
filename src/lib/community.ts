/** Public community counts. Null means that source is not configured or did not answer. */
export type CommunityPayload = {
  twitch: number | null;
  youtube: number | null;
  x: number | null;
  recent: { name: string; followedAt: string }[];
};

export const EMPTY_COMMUNITY: CommunityPayload = {
  twitch: null,
  youtube: null,
  x: null,
  recent: [],
};

export function hasCommunity(data: CommunityPayload | null | undefined): boolean {
  if (!data) return false;
  return data.twitch != null || data.youtube != null || data.x != null || data.recent.length > 0;
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
