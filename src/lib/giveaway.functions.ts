/**
 * Giveaway server functions. Entrants are site accounts (the existing sign-in);
 * one record per account, one entry per platform, and each platform account can
 * only be entered once across all site accounts. The owner is whoever is listed
 * in COMMUNITY_ADMIN_EMAIL, the same as the community board.
 */
import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql, type Sql } from "@/lib/db";
import { cleanText } from "@/lib/discussion";
import {
  ADMIN_NOTE_MAX,
  ADMIN_STATUSES,
  GIVEAWAY_ENDS_AT,
  GIVEAWAY_X_POST_ID,
  breakdown,
  cryptoRandomInt,
  isEntryWindowOpen,
  normalizeTikTokHandle,
  normalizeXHandle,
  normalizeYouTubeHandle,
  pickWeighted,
  statusLabel,
  toCsv,
  xPostId,
  type EntryBreakdown,
  type EntryStatuses,
  type GiveawayState,
  type Platform,
} from "@/lib/giveaway";

type Session = { id: string; email: string | null } | null;
type Fail = { ok: false; error: string };
type Ok = { ok: true };

const server = () => import("@/lib/giveaway.server");

const optionalSession = createMiddleware({ type: "function" })
  .client(async ({ next }) => {
    const { getBearerToken } = await import("@/lib/auth/client");
    return next({ sendContext: { bearerToken: getBearerToken() ?? undefined } });
  })
  .server(async ({ next, context }) => {
    const token = typeof context.bearerToken === "string" ? context.bearerToken : undefined;
    return next({ context: { session: await readSession(token) } });
  });

async function readSession(bearerToken?: string): Promise<Session> {
  try {
    const { assertSameSiteRequest } = await import("@/lib/auth/isolation.server");
    assertSameSiteRequest();
  } catch {
    return null;
  }
  try {
    const { authConfigured, DEV_USER_ID, getSessionUser } = await import("@/lib/auth/verify.server");
    const session = await getSessionUser(bearerToken);
    if (session) return session;
    if (!authConfigured && !process.env.DATABASE_URL?.trim()) {
      return { id: DEV_USER_ID, email: "dev@example.com" };
    }
    return null;
  } catch (err) {
    console.error("[giveaway] session", err);
    return null;
  }
}

function failed(error: string): Fail {
  return { ok: false, error };
}

export type MyEntry = {
  statuses: EntryStatuses;
  twitchLogin: string | null;
  youtubeChannel: string | null;
  youtubeTitle: string | null;
  xHandle: string | null;
  tiktokHandle: string | null;
  entries: EntryBreakdown;
};

export type GiveawayView =
  | { state: "hidden"; isAdmin: false }
  | {
      state: GiveawayState;
      isAdmin: boolean;
      signedIn: boolean;
      banned: boolean;
      endsAt: string;
      entriesOpen: boolean;
      twitchReady: boolean;
      youtubeOAuthReady: boolean;
      me: MyEntry | null;
    };

async function gate(userId: string): Promise<{ sql: Sql; isAdmin: boolean } | Fail> {
  const sql = await getSql();
  const s = await server();
  const isAdmin = await s.isAdminUser(sql, userId, null);
  if (!isAdmin) {
    if (s.currentState() !== "open" || !isEntryWindowOpen()) return failed("Entries aren't open.");
    if (await s.isBanned(sql, userId)) return failed("This account can't enter.");
  }
  return { sql, isAdmin };
}

async function requireAdmin(userId: string): Promise<{ sql: Sql } | Fail> {
  const sql = await getSql();
  const s = await server();
  if (!(await s.isAdminUser(sql, userId, null))) return failed("Only the site owner can do that.");
  return { sql };
}

async function myEntry(sql: Sql, userId: string): Promise<MyEntry> {
  const s = await server();
  const row = await s.loadEntrant(sql, userId);
  const comments = (await s.commentEntries(sql, userId)).get(userId) ?? 0;
  const statuses = s.statusesOf(row);
  return {
    statuses,
    twitchLogin: row?.twitch_login ?? null,
    youtubeChannel: row?.youtube_channel_id ?? null,
    youtubeTitle: row?.youtube_title ?? null,
    xHandle: row?.x_handle ?? null,
    tiktokHandle: row?.tiktok_handle ?? null,
    entries: breakdown(statuses, comments),
  };
}

export const getGiveaway = createServerFn({ method: "POST" })
  .middleware([optionalSession])
  .handler(async ({ context }): Promise<GiveawayView> => {
    const sql = await getSql();
    const s = await server();
    const session = context.session;
    const isAdmin = session ? await s.isAdminUser(sql, session.id, session.email) : false;
    const state = s.currentState();
    if (state === "hidden" && !isAdmin) return { state: "hidden", isAdmin: false };
    const banned = session ? await s.isBanned(sql, session.id) : false;
    return {
      state,
      isAdmin,
      signedIn: Boolean(session),
      banned: banned && !isAdmin,
      endsAt: GIVEAWAY_ENDS_AT,
      entriesOpen: isAdmin || (state === "open" && isEntryWindowOpen()),
      twitchReady: s.twitchConfigured(),
      youtubeOAuthReady: s.googleConfigured(),
      me: session ? await myEntry(sql, session.id) : null,
    };
  });

type HandlePlatform = "x" | "tiktok" | "youtube";

export const saveHandle = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { platform?: unknown; handle?: unknown }) => ({
    platform: String(input?.platform ?? "") as HandlePlatform,
    handle: input?.handle,
  }))
  .handler(async ({ context, data }): Promise<{ ok: true; me: MyEntry } | Fail> => {
    if (!["x", "tiktok", "youtube"].includes(data.platform)) return failed("That platform isn't here.");
    const checked =
      data.platform === "x"
        ? normalizeXHandle(data.handle)
        : data.platform === "tiktok"
          ? normalizeTikTokHandle(data.handle)
          : normalizeYouTubeHandle(data.handle);
    if (!checked.ok) return checked;
    const ready = await gate(context.userId);
    if ("ok" in ready) return ready;
    const s = await server();
    if (await s.rateLimited(ready.sql, context.userId, `handle:${data.platform}`)) {
      return failed("Slow down a little. Try again in a few minutes.");
    }
    await s.ensureEntrant(ready.sql, context.userId);
    const current = await s.loadEntrant(ready.sql, context.userId);
    try {
      if (data.platform === "x") {
        const same = current?.x_handle?.toLowerCase() === checked.handle.toLowerCase();
        if (current?.x_status === "rejected" && !same) return failed("Your X entry was already reviewed.");
        await ready.sql`
          update giveaway_entrant
          set x_handle = ${checked.handle},
              x_status = ${same && current?.x_status && current.x_status !== "none" ? current.x_status : "pending"},
              x_repost_status = ${same ? (current?.x_repost_status ?? "none") : "none"},
              updated_at = now()
          where user_id = ${context.userId}
        `;
      } else if (data.platform === "tiktok") {
        if (current?.tiktok_status === "rejected") return failed("Your TikTok entry was already reviewed.");
        await ready.sql`
          update giveaway_entrant
          set tiktok_handle = ${checked.handle}, tiktok_status = 'unverified', updated_at = now()
          where user_id = ${context.userId}
        `;
      } else {
        if (s.googleConfigured()) return failed("Use the YouTube button to check your subscription.");
        if (current?.youtube_status === "verified") return failed("Your YouTube entry is already verified.");
        if (current?.youtube_status === "rejected") return failed("Your YouTube entry was already reviewed.");
        await ready.sql`
          update giveaway_entrant
          set youtube_channel_id = ${checked.handle}, youtube_title = null, youtube_status = 'self_reported', updated_at = now()
          where user_id = ${context.userId}
        `;
      }
    } catch (err) {
      if (s.isUniqueViolation(err)) return failed("That account is already entered by someone else.");
      throw err;
    }
    return { ok: true, me: await myEntry(ready.sql, context.userId) };
  });

export const claimRepost = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { claimed?: unknown }) => ({ claimed: input?.claimed === true }))
  .handler(async ({ context, data }): Promise<{ ok: true; me: MyEntry } | Fail> => {
    const ready = await gate(context.userId);
    if ("ok" in ready) return ready;
    const s = await server();
    if (await s.rateLimited(ready.sql, context.userId, "repost")) return failed("Slow down a little. Try again in a few minutes.");
    const current = await s.loadEntrant(ready.sql, context.userId);
    if (!current?.x_handle) return failed("Add your X handle first.");
    if (current.x_repost_status === "rejected" || current.x_repost_status === "verified") {
      return { ok: true, me: await myEntry(ready.sql, context.userId) };
    }
    await ready.sql`
      update giveaway_entrant
      set x_repost_status = ${data.claimed ? "pending" : "none"}, updated_at = now()
      where user_id = ${context.userId}
    `;
    return { ok: true, me: await myEntry(ready.sql, context.userId) };
  });

export const removeMyEntry = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { platform?: unknown }) => String(input?.platform ?? "") as HandlePlatform | "twitch")
  .handler(async ({ context, data }): Promise<{ ok: true; me: MyEntry } | Fail> => {
    const sql = await getSql();
    const s = await server();
    const current = await s.loadEntrant(sql, context.userId);
    if (!current) return { ok: true, me: await myEntry(sql, context.userId) };
    if (data === "x" && current.x_status !== "rejected") {
      await sql`update giveaway_entrant set x_handle = null, x_status = 'none', x_repost_status = 'none', updated_at = now() where user_id = ${context.userId}`;
    } else if (data === "tiktok" && current.tiktok_status !== "rejected") {
      await sql`update giveaway_entrant set tiktok_handle = null, tiktok_status = 'none', updated_at = now() where user_id = ${context.userId}`;
    } else if (data === "youtube" && current.youtube_status !== "rejected") {
      await sql`update giveaway_entrant set youtube_channel_id = null, youtube_title = null, youtube_status = 'none', updated_at = now() where user_id = ${context.userId}`;
    } else if (data === "twitch" && current.twitch_status !== "rejected") {
      await sql`update giveaway_entrant set twitch_user_id = null, twitch_login = null, twitch_status = 'none', updated_at = now() where user_id = ${context.userId}`;
    }
    return { ok: true, me: await myEntry(sql, context.userId) };
  });

/* --------------------------------- Admin --------------------------------- */

export type AdminDraw = {
  id: string;
  userId: string;
  name: string;
  entries: number;
  poolEntries: number;
  verifiedOnly: boolean;
  status: "picked" | "redrawn";
  createdAt: string;
};

export type AdminBoard = {
  entrants: import("@/lib/giveaway.server").AdminEntrant[];
  draws: AdminDraw[];
  state: GiveawayState;
  xReady: boolean;
  twitchReady: boolean;
  youtubeOAuthReady: boolean;
  defaultPostId: string;
};

async function loadDraws(sql: Sql): Promise<AdminDraw[]> {
  const rows = await sql<{
    id: string;
    user_id: string;
    name: string | null;
    entries: number;
    pool_entries: number;
    verified_only: boolean | string;
    status: string;
    created_at: unknown;
  }>`
    select d.*, u."name" as name from giveaway_draw d
    left join "user" u on u.id = d.user_id
    order by d.created_at desc
    limit 100
  `;
  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    name: String(row.name ?? "Fan").slice(0, 80),
    entries: Number(row.entries),
    poolEntries: Number(row.pool_entries),
    verifiedOnly: row.verified_only === true || row.verified_only === "t" || row.verified_only === "true",
    status: row.status === "redrawn" ? "redrawn" : "picked",
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at ?? ""),
  }));
}

export const getAdminBoard = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<AdminBoard | Fail> => {
    const ready = await requireAdmin(context.userId);
    if ("ok" in ready) return ready;
    const s = await server();
    return {
      entrants: await s.loadAllEntrants(ready.sql),
      draws: await loadDraws(ready.sql),
      state: s.currentState(),
      xReady: s.xConfigured(),
      twitchReady: s.twitchConfigured(),
      youtubeOAuthReady: s.googleConfigured(),
      defaultPostId: GIVEAWAY_X_POST_ID,
    };
  });

export const exportEntrantsCsv = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ ok: true; csv: string } | Fail> => {
    const ready = await requireAdmin(context.userId);
    if ("ok" in ready) return ready;
    const s = await server();
    const entrants = await s.loadAllEntrants(ready.sql);
    const csv = toCsv(
      [
        "name", "email", "twitch", "twitch_status", "youtube", "youtube_status", "x", "x_follow_status",
        "x_like_repost_status", "tiktok", "tiktok_status", "follow_entries", "comment_entries", "total_entries",
        "verified_total", "admin_note", "banned", "joined", "user_id",
      ],
      entrants.map((e) => [
        e.name, e.email ?? "", e.twitch.login ?? "", statusLabel(e.twitch.status), (e.youtube.title || e.youtube.channel || "").replace(/^@/, ""),
        statusLabel(e.youtube.status), e.x.handle ?? "", statusLabel(e.x.status), statusLabel(e.x.repostStatus),
        e.tiktok.handle ?? "", statusLabel(e.tiktok.status), e.entries.follows, e.entries.comments,
        e.entries.total, e.verifiedEntries.total, e.note, e.banned ? "yes" : "", e.joinedAt, e.userId,
      ]),
    );
    return { ok: true, csv };
  });

export const setEntrantNote = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { userId?: unknown; note?: unknown }) => ({
    userId: String(input?.userId ?? "").trim().slice(0, 200),
    note: cleanText(input?.note).trim(),
  }))
  .handler(async ({ context, data }): Promise<Ok | Fail> => {
    if (!data.userId) return failed("That entrant isn't here.");
    if (data.note.length > ADMIN_NOTE_MAX) return failed(`Notes can be up to ${ADMIN_NOTE_MAX} characters.`);
    const ready = await requireAdmin(context.userId);
    if ("ok" in ready) return ready;
    const rows = await ready.sql<{ user_id: string }>`
      update giveaway_entrant set admin_note = ${data.note}, updated_at = now()
      where user_id = ${data.userId}
      returning user_id
    `;
    return rows[0] ? { ok: true } : failed("That entrant isn't here.");
  });

const STATUS_COLUMN: Record<Platform, string> = {
  twitch: "twitch_status",
  youtube: "youtube_status",
  x: "x_status",
  x_repost: "x_repost_status",
  tiktok: "tiktok_status",
};

export const setEntrantStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { userId?: unknown; platform?: unknown; status?: unknown }) => ({
    userId: String(input?.userId ?? "").trim().slice(0, 200),
    platform: String(input?.platform ?? "") as Platform,
    status: String(input?.status ?? ""),
  }))
  .handler(async ({ context, data }): Promise<Ok | Fail> => {
    const allowed = ADMIN_STATUSES[data.platform];
    if (!allowed || !allowed.includes(data.status)) return failed("That status isn't allowed.");
    const ready = await requireAdmin(context.userId);
    if ("ok" in ready) return ready;
    // Column name comes from a fixed map, never from input.
    const column = STATUS_COLUMN[data.platform];
    const rows = await ready.sql.query<{ user_id: string }>(
      `update giveaway_entrant set ${column} = $1, updated_at = now() where user_id = $2 returning user_id`,
      [data.status, data.userId],
    );
    return rows[0] ? { ok: true } : failed("That entrant isn't here.");
  });

export const runXCheck = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { post?: unknown }) => String(input?.post ?? "").trim().slice(0, 300))
  .handler(async ({ context, data }) => {
    const ready = await requireAdmin(context.userId);
    if ("ok" in ready) return ready;
    const s = await server();
    const postId = xPostId(data) ?? xPostId(GIVEAWAY_X_POST_ID);
    if (data && !xPostId(data)) return failed("That doesn't look like an X post link.");
    return s.runXCheck(ready.sql, postId);
  });

export const drawWinner = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { verifiedOnly?: unknown; redraw?: unknown }) => ({
    verifiedOnly: input?.verifiedOnly === true,
    redraw: input?.redraw === true,
  }))
  .handler(async ({ context, data }): Promise<{ ok: true; winner: AdminDraw; draws: AdminDraw[] } | Fail> => {
    const ready = await requireAdmin(context.userId);
    if ("ok" in ready) return ready;
    const s = await server();
    if (data.redraw) {
      await ready.sql`
        update giveaway_draw set status = 'redrawn'
        where id = (select id from giveaway_draw where status = 'picked' order by created_at desc limit 1)
      `;
    }
    const already = new Set((await loadDraws(ready.sql)).map((d) => d.userId));
    const entrants = await s.loadAllEntrants(ready.sql);
    // Owner accounts, banned accounts, and anyone already drawn are left out.
    const pool = entrants
      .filter((e) => !e.isAdmin && !e.banned && e.userId !== context.userId && !already.has(e.userId))
      .map((e) => ({ id: e.userId, weight: data.verifiedOnly ? e.verifiedEntries.total : e.entries.total }));
    const poolEntries = pool.reduce((sum, c) => sum + c.weight, 0);
    const pick = pickWeighted(pool, cryptoRandomInt);
    if (!pick) return failed("Nobody left with entries to draw.");
    await ready.sql`
      insert into giveaway_draw (id, user_id, entries, pool_entries, verified_only, status)
      values (${crypto.randomUUID()}, ${pick.id}, ${pick.weight}, ${poolEntries}, ${data.verifiedOnly}, 'picked')
    `;
    const draws = await loadDraws(ready.sql);
    const winner = draws.find((d) => d.userId === pick.id && d.status === "picked");
    if (!winner) return failed("The draw didn't save. Try again.");
    return { ok: true, winner, draws };
  });

export const resetDraws = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<Ok | Fail> => {
    const ready = await requireAdmin(context.userId);
    if ("ok" in ready) return ready;
    await ready.sql`delete from giveaway_draw`;
    return { ok: true };
  });
