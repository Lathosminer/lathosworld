/**
 * Server-only giveaway helpers: database reads, entry counting, and the
 * Twitch / YouTube / X checks. Secrets are read from server env only and are
 * never returned, logged, or stored. OAuth access tokens are used once to
 * check a follow, then revoked; nothing but the result is saved.
 *
 * Secrets this reads (Cloudflare > Workers & Pages > lathosworld > Settings >
 * Variables and Secrets):
 *   TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET   (already set) Twitch follow check
 *   GIVEAWAY_GOOGLE_CLIENT_ID,
 *   GIVEAWAY_GOOGLE_CLIENT_SECRET            (new) YouTube subscription check
 *   X_BEARER_TOKEN                           (new) admin X follow/repost check
 *   GIVEAWAY_OPEN                            "true" opens the page to everyone
 *   COMMUNITY_ADMIN_EMAIL                    (already set) who is the owner
 */
import { env } from "./env.server.ts";
import { YT_CHANNEL } from "./youtube-live.functions.ts";
import type { Sql } from "./db.ts";
import { isAdminEmail } from "./discussion.ts";
import {
  ACTION_MAX,
  ACTION_WINDOW_MS,
  GIVEAWAY_ENDS_AT,
  GIVEAWAY_SCOPE_NAME,
  TICKER_MAX,
  TICKER_REFRESH_MS,
  TWITCH_LOGIN,
  X_HANDLE,
  breakdown,
  commentEntriesByAuthor,
  effectiveWalletStatus,
  exclusionKey,
  walletIneligible,
  tickerName,
  giveawayState,
  type EntryBreakdown,
  type EntryStatuses,
  type GiveawayState,
} from "./giveaway.ts";

export type OAuthProvider = "twitch" | "youtube";

export const OAUTH_COOKIE = "__Host-lw-giveaway-oauth";

export function currentState(): GiveawayState {
  return giveawayState(env("GIVEAWAY_OPEN"));
}

export function twitchConfigured(): boolean {
  return Boolean(env("TWITCH_CLIENT_ID") && env("TWITCH_CLIENT_SECRET"));
}

export function googleConfigured(): boolean {
  return Boolean(env("GIVEAWAY_GOOGLE_CLIENT_ID") && env("GIVEAWAY_GOOGLE_CLIENT_SECRET"));
}

export function xConfigured(): boolean {
  return Boolean(env("X_BEARER_TOKEN"));
}

export async function isAdminUser(sql: Sql, userId: string, fallbackEmail: string | null): Promise<boolean> {
  const users = await sql<{ email: string | null }>`
    select "email" as email from "user" where id = ${userId} limit 1
  `;
  return isAdminEmail(users[0]?.email ?? fallbackEmail, env("COMMUNITY_ADMIN_EMAIL"));
}

export async function isBanned(sql: Sql, userId: string): Promise<boolean> {
  const bans = await sql<{ user_id: string }>`
    select user_id from discussion_ban where user_id = ${userId} limit 1
  `;
  return Boolean(bans[0]);
}

export function isUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  if ("code" in err && String((err as { code: unknown }).code) === "23505") return true;
  const message = err instanceof Error ? err.message : "";
  return /duplicate key|unique constraint/i.test(message);
}

/** Logs an action and says whether the caller is over the limit. */
export async function rateLimited(sql: Sql, userId: string, action: string): Promise<boolean> {
  const since = new Date(Date.now() - ACTION_WINDOW_MS).toISOString();
  const rows = await sql<{ n: number }>`
    select count(*)::int as n from giveaway_action where user_id = ${userId} and created_at > ${since}
  `;
  if (Number(rows[0]?.n ?? 0) >= ACTION_MAX) return true;
  await sql`
    insert into giveaway_action (id, user_id, action) values (${crypto.randomUUID()}, ${userId}, ${action})
  `;
  return false;
}

/** Has this person saved a wallet that isn't rejected? Entry actions need one first. */
export async function hasWallet(sql: Sql, userId: string): Promise<boolean> {
  const rows = await sql<{ wallet_address: string | null; wallet_status: string | null }>`
    select wallet_address, wallet_status from giveaway_entrant where user_id = ${userId} limit 1
  `;
  const row = rows[0];
  return Boolean(row?.wallet_address) && row?.wallet_status !== "rejected";
}

export async function ensureEntrant(sql: Sql, userId: string): Promise<void> {
  await sql`insert into giveaway_entrant (user_id) values (${userId}) on conflict (user_id) do nothing`;
}

export type EntrantRow = {
  user_id: string;
  twitch_user_id: string | null;
  twitch_login: string | null;
  twitch_status: string;
  youtube_channel_id: string | null;
  youtube_title: string | null;
  youtube_status: string;
  x_handle: string | null;
  x_status: string;
  x_repost_status: string;
  tiktok_handle: string | null;
  tiktok_status: string;
  admin_note: string;
  ticker_hidden?: boolean | string | null;
  /** Added in migration 0013; optional so reads still work before it runs. */
  wallet_address?: string | null;
  wallet_status?: string | null;
  created_at: unknown;
  updated_at: unknown;
};

export function statusesOf(row: Partial<EntrantRow> | null | undefined): EntryStatuses {
  return {
    twitch: (row?.twitch_status ?? "none") as EntryStatuses["twitch"],
    youtube: (row?.youtube_status ?? "none") as EntryStatuses["youtube"],
    x: (row?.x_status ?? "none") as EntryStatuses["x"],
    xRepost: (row?.x_repost_status ?? "none") as EntryStatuses["xRepost"],
    tiktok: (row?.tiktok_status ?? "none") as EntryStatuses["tiktok"],
  };
}

/** Visible (not held, not removed) giveaway comments, as comment entries per author. */
export async function commentEntries(sql: Sql, userId?: string): Promise<Map<string, number>> {
  const rows = userId
    ? await sql<{ author_id: string; created_at: unknown }>`
        select author_id, created_at from discussion_post
        where scope = ${GIVEAWAY_SCOPE_NAME} and author_id = ${userId}
          and hidden_at is null and deleted_at is null
      `
    : await sql<{ author_id: string; created_at: unknown }>`
        select author_id, created_at from discussion_post
        where scope = ${GIVEAWAY_SCOPE_NAME} and hidden_at is null and deleted_at is null
      `;
  return commentEntriesByAuthor(
    rows.map((row) => ({ authorId: row.author_id, createdAt: row.created_at as string | Date })),
  );
}

export async function loadEntrant(sql: Sql, userId: string): Promise<EntrantRow | null> {
  const rows = await sql<EntrantRow>`select * from giveaway_entrant where user_id = ${userId} limit 1`;
  return rows[0] ?? null;
}

export type AdminEntrant = {
  userId: string;
  name: string;
  email: string | null;
  isAdmin: boolean;
  banned: boolean;
  twitch: { login: string | null; status: string };
  youtube: { channel: string | null; title: string | null; status: string };
  x: { handle: string | null; status: string; repostStatus: string };
  tiktok: { handle: string | null; status: string };
  /**
   * Prize wallet (BNB Smart Chain). Owner-only: the full address is shown on the
   * admin detail view and in the CSV export, masked in lists, and never public.
   */
  wallet: { address: string | null; status: string; sharedWith: number };
  entries: EntryBreakdown;
  verifiedEntries: EntryBreakdown;
  note: string;
  joinedAt: string;
  tickerHidden: boolean;
  /** Matches an entry on the exclusion list (family, mods, …). */
  excluded: string | null;
  /** Site account created after the giveaway ended. */
  lateAccount: boolean;
  /** Giveaway comments currently held for review. */
  heldComments: number;
  /** Can this person win? Null when eligible, otherwise why not. */
  ineligible: string | null;
};

function iso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  const parsed = Date.parse(String(value ?? ""));
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : "";
}

function truthy(value: unknown): boolean {
  return value === true || value === "t" || value === "true" || value === 1;
}

export async function loadExclusions(sql: Sql): Promise<{ value: string; note: string }[]> {
  return sql<{ value: string; note: string }>`select value, note from giveaway_exclusion order by created_at asc limit 500`;
}

/** Every entrant, including people who only commented. */
export async function loadAllEntrants(sql: Sql): Promise<AdminEntrant[]> {
  const comments = await commentEntries(sql);
  for (const userId of comments.keys()) await ensureEntrant(sql, userId);
  const rows = await sql<
    EntrantRow & { name: string | null; email: string | null; banned: string | null; account_created: unknown }
  >`
    select e.*, u."name" as name, u."email" as email, u."createdAt" as account_created, b.user_id as banned
    from giveaway_entrant e
    left join "user" u on u.id = e.user_id
    left join discussion_ban b on b.user_id = e.user_id
    order by e.created_at asc
    limit 20000
  `;
  const heldRows = await sql<{ author_id: string; n: number }>`
    select author_id, count(*)::int as n from discussion_post
    where scope = ${GIVEAWAY_SCOPE_NAME} and hidden_at is not null and deleted_at is null
    group by author_id
  `;
  const held = new Map(heldRows.map((row) => [row.author_id, Number(row.n)]));
  const exclusions = new Map((await loadExclusions(sql)).map((row) => [row.value, row.note]));
  const endsAt = Date.parse(GIVEAWAY_ENDS_AT);
  const admins = env("COMMUNITY_ADMIN_EMAIL");
  const walletUse = new Map<string, number>();
  for (const row of rows) {
    const key = row.wallet_address?.toLowerCase();
    if (key) walletUse.set(key, (walletUse.get(key) ?? 0) + 1);
  }
  return rows.map((row) => {
    const statuses = statusesOf(row);
    const commentCount = comments.get(row.user_id) ?? 0;
    const walletAddress = row.wallet_address ?? null;
    const sharedWith = walletAddress ? (walletUse.get(walletAddress.toLowerCase()) ?? 1) - 1 : 0;
    const walletStatus = effectiveWalletStatus(walletAddress, row.wallet_status ?? "none", sharedWith + 1);
    const walletProblem = walletIneligible(walletAddress, walletStatus);
    const keys = [
      row.user_id, row.email, row.twitch_login, row.x_handle, row.tiktok_handle, row.youtube_channel_id, walletAddress,
    ]
      .map((value) => exclusionKey(value))
      .filter((value): value is string => Boolean(value));
    const hit = keys.find((key) => exclusions.has(key));
    const excluded = hit ? exclusions.get(hit) || hit : null;
    const created = Date.parse(iso(row.account_created));
    const lateAccount = Number.isFinite(created) && created > endsAt;
    const isAdmin = isAdminEmail(row.email, admins);
    const banned = Boolean(row.banned);
    const ineligible = isAdmin
      ? "Owner"
      : banned
        ? "Banned"
        : excluded
          ? `Excluded: ${excluded}`
          : walletProblem
            ? walletProblem
            : lateAccount
              ? "Account made after the end date"
              : null;
    return {
      userId: row.user_id,
      name: String(row.name ?? "Fan").replace(/\s+/g, " ").trim().slice(0, 80) || "Fan",
      email: row.email ?? null,
      isAdmin,
      banned,
      twitch: { login: row.twitch_login, status: row.twitch_status },
      youtube: { channel: row.youtube_channel_id, title: row.youtube_title, status: row.youtube_status },
      x: { handle: row.x_handle, status: row.x_status, repostStatus: row.x_repost_status },
      tiktok: { handle: row.tiktok_handle, status: row.tiktok_status },
      wallet: { address: walletAddress, status: walletStatus, sharedWith },
      entries: breakdown(statuses, commentCount),
      verifiedEntries: breakdown(statuses, commentCount, true),
      note: row.admin_note ?? "",
      joinedAt: iso(row.created_at),
      tickerHidden: truthy(row.ticker_hidden),
      excluded,
      lateAccount,
      heldComments: held.get(row.user_id) ?? 0,
      ineligible,
    };
  });
}

/* ----------------------------------- Ticker ----------------------------------- */

let tickerCache: { at: number; names: string[] } | null = null;

/**
 * Recent entrants for the public ticker. Display names only (never emails).
 * Leaves out the owner, banned users, anyone with a held giveaway comment,
 * anyone the owner hid, anyone without a valid (unflagged) wallet, and anyone
 * with no entries yet. Wallet addresses are never part of the ticker.
 */
export async function loadTicker(sql: Sql, fresh = false): Promise<string[]> {
  if (!fresh && tickerCache && Date.now() - tickerCache.at < TICKER_REFRESH_MS) return tickerCache.names;
  const entrants = await loadAllEntrants(sql);
  const names = entrants
    .filter(
      (e) =>
        !e.isAdmin &&
        !e.banned &&
        !e.tickerHidden &&
        e.heldComments === 0 &&
        e.entries.total > 0 &&
        (e.wallet.status === "ok" || e.wallet.status === "cleared"),
    )
    .sort((a, b) => b.joinedAt.localeCompare(a.joinedAt))
    .map((e) => tickerName(e.name, e.x.handle ? `@${e.x.handle}` : e.twitch.login))
    .filter((name): name is string => Boolean(name))
    .slice(0, TICKER_MAX);
  tickerCache = { at: Date.now(), names };
  return names;
}

export function clearTickerCache(): void {
  tickerCache = null;
}

/* ---------------------------- OAuth (Twitch / Google) ---------------------------- */

export function callbackUrl(origin: string, provider: OAuthProvider): string {
  return `${origin}/api/giveaway/callback/${provider}`;
}

export function authorizeUrl(provider: OAuthProvider, origin: string, state: string): string | null {
  const redirect = callbackUrl(origin, provider);
  if (provider === "twitch") {
    const clientId = env("TWITCH_CLIENT_ID");
    if (!clientId || !twitchConfigured()) return null;
    const url = new URL("https://id.twitch.tv/oauth2/authorize");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirect);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "user:read:follows");
    url.searchParams.set("state", state);
    url.searchParams.set("force_verify", "true");
    return url.toString();
  }
  const clientId = env("GIVEAWAY_GOOGLE_CLIENT_ID");
  if (!clientId || !googleConfigured()) return null;
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirect);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "https://www.googleapis.com/auth/youtube.readonly");
  url.searchParams.set("access_type", "online");
  url.searchParams.set("prompt", "select_account");
  url.searchParams.set("state", state);
  return url.toString();
}

async function readJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

const TIMEOUT = 8000;

export type TwitchResult =
  | { ok: true; userId: string; login: string; following: boolean }
  | { ok: false; error: string };

export async function checkTwitch(code: string, origin: string): Promise<TwitchResult> {
  const clientId = env("TWITCH_CLIENT_ID");
  const secret = env("TWITCH_CLIENT_SECRET");
  if (!clientId || !secret) return { ok: false, error: "not_configured" };
  const tokenRes = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: secret,
      code,
      grant_type: "authorization_code",
      redirect_uri: callbackUrl(origin, "twitch"),
    }),
    signal: AbortSignal.timeout(TIMEOUT),
  });
  const token = await readJson<{ access_token?: string }>(tokenRes);
  const access = tokenRes.ok ? token?.access_token : undefined;
  if (!access) return { ok: false, error: "token" };
  try {
    const headers = { Authorization: `Bearer ${access}`, "Client-Id": clientId };
    const meRes = await fetch("https://api.twitch.tv/helix/users", { headers, signal: AbortSignal.timeout(TIMEOUT) });
    const me = (await readJson<{ data?: { id?: string; login?: string }[] }>(meRes))?.data?.[0];
    const chRes = await fetch(`https://api.twitch.tv/helix/users?login=${encodeURIComponent(TWITCH_LOGIN)}`, {
      headers,
      signal: AbortSignal.timeout(TIMEOUT),
    });
    const channel = (await readJson<{ data?: { id?: string }[] }>(chRes))?.data?.[0];
    if (!me?.id || !me.login || !channel?.id) return { ok: false, error: "lookup" };
    const followRes = await fetch(
      `https://api.twitch.tv/helix/channels/followed?user_id=${encodeURIComponent(me.id)}&broadcaster_id=${encodeURIComponent(channel.id)}`,
      { headers, signal: AbortSignal.timeout(TIMEOUT) },
    );
    if (!followRes.ok) return { ok: false, error: "lookup" };
    const follows = await readJson<{ data?: unknown[] }>(followRes);
    return { ok: true, userId: me.id, login: me.login, following: (follows?.data?.length ?? 0) > 0 };
  } finally {
    // We only needed the token for this one check.
    void fetch("https://id.twitch.tv/oauth2/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: clientId, token: access }),
      signal: AbortSignal.timeout(TIMEOUT),
    }).catch(() => undefined);
  }
}

export type YouTubeResult =
  | { ok: true; channelId: string; title: string; subscribed: boolean }
  | { ok: false; error: string };

export async function checkYouTube(code: string, origin: string): Promise<YouTubeResult> {
  const clientId = env("GIVEAWAY_GOOGLE_CLIENT_ID");
  const secret = env("GIVEAWAY_GOOGLE_CLIENT_SECRET");
  if (!clientId || !secret) return { ok: false, error: "not_configured" };
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: secret,
      code,
      grant_type: "authorization_code",
      redirect_uri: callbackUrl(origin, "youtube"),
    }),
    signal: AbortSignal.timeout(TIMEOUT),
  });
  const token = await readJson<{ access_token?: string }>(tokenRes);
  const access = tokenRes.ok ? token?.access_token : undefined;
  if (!access) return { ok: false, error: "token" };
  try {
    const headers = { Authorization: `Bearer ${access}` };
    const meRes = await fetch("https://www.googleapis.com/youtube/v3/channels?part=id,snippet&mine=true", {
      headers,
      signal: AbortSignal.timeout(TIMEOUT),
    });
    const me = (await readJson<{ items?: { id?: string; snippet?: { title?: string } }[] }>(meRes))?.items?.[0];
    if (!me?.id) return { ok: false, error: "no_channel" };
    const subRes = await fetch(
      `https://www.googleapis.com/youtube/v3/subscriptions?part=id&mine=true&forChannelId=${encodeURIComponent(YT_CHANNEL)}`,
      { headers, signal: AbortSignal.timeout(TIMEOUT) },
    );
    if (!subRes.ok) return { ok: false, error: "lookup" };
    const subs = await readJson<{ items?: unknown[] }>(subRes);
    return {
      ok: true,
      channelId: me.id,
      title: String(me.snippet?.title ?? "").slice(0, 100),
      subscribed: (subs?.items?.length ?? 0) > 0,
    };
  } finally {
    void fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(access)}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      signal: AbortSignal.timeout(TIMEOUT),
    }).catch(() => undefined);
  }
}

/* ---------------------------------- X check ---------------------------------- */

const X_API = "https://api.x.com/2";
const X_MAX_PAGES = 30;

type XUsersPage = { data?: { username?: string }[]; meta?: { next_token?: string }; title?: string; detail?: string };

async function xUsernames(path: string, pageSize: number, bearer: string): Promise<
  { ok: true; names: Set<string>; complete: boolean } | { ok: false; error: string }
> {
  const names = new Set<string>();
  let next: string | undefined;
  for (let page = 0; page < X_MAX_PAGES; page += 1) {
    const url = new URL(`${X_API}${path}`);
    url.searchParams.set("max_results", String(pageSize));
    url.searchParams.set("user.fields", "username");
    if (next) url.searchParams.set("pagination_token", next);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${bearer}` }, signal: AbortSignal.timeout(TIMEOUT) });
    const body = await readJson<XUsersPage>(res);
    if (!res.ok) {
      const why = body?.title || body?.detail || `HTTP ${res.status}`;
      return { ok: false, error: `X said: ${String(why).slice(0, 160)} (status ${res.status})` };
    }
    for (const user of body?.data ?? []) if (user.username) names.add(user.username.toLowerCase());
    next = body?.meta?.next_token;
    if (!next) return { ok: true, names, complete: true };
  }
  return { ok: true, names, complete: false };
}

export type XCheckSummary = {
  checked: number;
  followVerified: number;
  followMissing: number;
  repostVerified: number;
  repostMissing: number;
  notes: string[];
};

/** Admin-only: checks every entrant's X handle against followers, likes, and reposts. */
export async function runXCheck(sql: Sql, postId: string | null): Promise<{ ok: true; summary: XCheckSummary } | { ok: false; error: string }> {
  const bearer = env("X_BEARER_TOKEN");
  if (!bearer) return { ok: false, error: "X_BEARER_TOKEN isn't set yet, so X entries stay 'pending check'." };
  const lookup = await fetch(`${X_API}/users/by/username/${X_HANDLE}`, {
    headers: { Authorization: `Bearer ${bearer}` },
    signal: AbortSignal.timeout(TIMEOUT),
  });
  const me = await readJson<{ data?: { id?: string }; title?: string }>(lookup);
  if (!lookup.ok || !me?.data?.id) {
    return { ok: false, error: `Couldn't look up @${X_HANDLE} (status ${lookup.status}). Check the X API plan and token.` };
  }
  const notes: string[] = [];
  const followers = await xUsernames(`/users/${me.data.id}/followers`, 1000, bearer);
  if (!followers.ok) return followers;
  if (!followers.complete) notes.push("Follower list was too long to read in full, so missing follows were left pending.");

  let likers: Set<string> | null = null;
  let reposters: Set<string> | null = null;
  let engagementComplete = true;
  if (postId) {
    const likes = await xUsernames(`/tweets/${postId}/liking_users`, 100, bearer);
    const reposts = await xUsernames(`/tweets/${postId}/retweeted_by`, 100, bearer);
    if (!likes.ok) notes.push(`Likes: ${likes.error}`);
    if (!reposts.ok) notes.push(`Reposts: ${reposts.error}`);
    if (likes.ok && reposts.ok) {
      likers = likes.names;
      reposters = reposts.names;
      engagementComplete = likes.complete && reposts.complete;
      if (!engagementComplete) notes.push("Like/repost lists were too long to read in full, so missing ones were left pending.");
    }
  } else {
    notes.push("No giveaway post set, so like + repost bonuses were not checked.");
  }

  const rows = await sql<{ user_id: string; x_handle: string; x_status: string; x_repost_status: string }>`
    select user_id, x_handle, x_status, x_repost_status from giveaway_entrant
    where x_handle is not null and x_status <> 'rejected'
  `;
  const summary: XCheckSummary = { checked: 0, followVerified: 0, followMissing: 0, repostVerified: 0, repostMissing: 0, notes };
  for (const row of rows) {
    summary.checked += 1;
    const handle = row.x_handle.toLowerCase();
    let follow = row.x_status;
    if (followers.names.has(handle)) {
      follow = "verified";
      summary.followVerified += 1;
    } else if (followers.complete) {
      follow = "not_following";
      summary.followMissing += 1;
    }
    let repost = row.x_repost_status;
    if (likers && reposters && repost !== "none" && repost !== "rejected") {
      if (likers.has(handle) && reposters.has(handle)) {
        repost = "verified";
        summary.repostVerified += 1;
      } else if (engagementComplete) {
        repost = "not_found";
        summary.repostMissing += 1;
      }
    }
    await sql`
      update giveaway_entrant
      set x_status = ${follow}, x_repost_status = ${repost}, x_checked_at = now(), updated_at = now()
      where user_id = ${row.user_id}
    `;
  }
  return { ok: true, summary };
}
