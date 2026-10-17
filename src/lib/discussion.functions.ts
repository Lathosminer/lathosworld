/**
 * Fan discussion stored in the same Postgres as Better Auth (`getSql`).
 *
 * The site owner is whoever's account email is listed in the server env var
 * `COMMUNITY_ADMIN_EMAIL` (comma-separated). That account can delete any post,
 * restore a hidden post, and ban users. The variable is read on the server
 * only — never a `VITE_` key.
 *
 * Clean posts are inserted and returned immediately. Slurs, threats, and
 * harassment are stored hidden for the review queue. Link spam, duplicates,
 * caps floods, and emoji floods are rejected and never stored.
 */
import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { getSql, type Sql } from "@/lib/db";
import { clipScope } from "@/lib/clips";
import { authMiddleware } from "@/lib/auth/middleware";
import {
  ANON_VIEWER,
  BOARD_SCOPE,
  depthError,
  duplicateError,
  isAdminEmail,
  isAllowedClipId,
  isNewAccount,
  isUuid,
  muteMessage,
  penaltyForStrikes,
  rateLimitError,
  reportRateError,
  safeAvatarUrl,
  shouldHideForReports,
  validateBody,
  validateReason,
  validateTitle,
  type TalkBan,
  type TalkFeed,
  type TalkPost,
  type TalkReview,
  type TalkViewer,
} from "@/lib/discussion";

type Actor = {
  id: string;
  email: string | null;
  name: string;
  image: string | null;
  isAdmin: boolean;
  banned: boolean;
  mutedUntil: string | null;
  createdAtMs: number | null;
};

type Session = { id: string; email: string | null } | null;

type PostRow = {
  id: string;
  parent_id: string | null;
  title: string | null;
  body: string;
  created_at: unknown;
  deleted_at: unknown;
  author_id: string;
  author_name: string | null;
  author_image: string | null;
  reply_count: number | null;
  report_count: number | null;
  reported_by_me: boolean | null;
};

type OkId = { ok: true; id: string; held: boolean };
type Ok = { ok: true };
type Fail = { ok: false; error: string };

/** Dynamic lookup so a bundler cannot inline this server-only value. */
function adminAllowlist(): string | undefined {
  const value = process.env["COMMUNITY_ADMIN_EMAIL"];
  return typeof value === "string" && value.trim() ? value : undefined;
}

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
    console.error("[discussion] session", err);
    return null;
  }
}

function displayName(name: string | null | undefined, authorId: string): string {
  const clean = String(name ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
  if (clean) return clean;
  if (authorId === "dev-user") return "Dev User";
  return "Fan";
}

function stamp(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && value) {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return new Date(parsed).toISOString();
  }
  if (typeof value === "number" && Number.isFinite(value)) return new Date(value).toISOString();
  return new Date().toISOString();
}

function timeMs(value: unknown): number | null {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string" && value) {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}

function count(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function flagged(value: unknown): boolean {
  return value === true || value === "t" || value === "true" || value === 1;
}

function present(value: unknown): boolean {
  return value != null && value !== "";
}

function isUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  if ("code" in err && String((err as { code: unknown }).code) === "23505") return true;
  const message = err instanceof Error ? err.message : "";
  return /duplicate key|unique constraint/i.test(message);
}

async function loadActor(sql: Sql, userId: string, fallbackEmail: string | null): Promise<Actor> {
  const users = await sql<{ name: string | null; email: string | null; image: string | null; created_at: unknown }>`
    select "name" as name, "email" as email, "image" as image, "createdAt" as created_at
    from "user"
    where id = ${userId}
    limit 1
  `;
  const bans = await sql<{ user_id: string }>`
    select user_id from discussion_ban where user_id = ${userId} limit 1
  `;
  const mutes = await sql<{ until: unknown }>`
    select until from discussion_mute where user_id = ${userId} and until > now() limit 1
  `;
  const row = users[0];
  const email = row?.email ?? fallbackEmail;
  const isAdmin = isAdminEmail(email, adminAllowlist());
  return {
    id: userId,
    email,
    name: displayName(row?.name, userId),
    image: safeAvatarUrl(row?.image),
    isAdmin,
    banned: Boolean(bans[0]) && !isAdmin,
    mutedUntil: isAdmin || !mutes[0] ? null : stamp(mutes[0].until),
    createdAtMs: timeMs(row?.created_at),
  };
}

function toViewer(actor: Actor | null): TalkViewer {
  if (!actor) return ANON_VIEWER;
  return {
    signedIn: true,
    userId: actor.id,
    name: actor.name,
    image: actor.image,
    isAdmin: actor.isAdmin,
    banned: actor.banned,
    mutedUntil: actor.mutedUntil,
  };
}

async function viewerFor(sql: Sql, session: Session): Promise<{ viewer: TalkViewer; actor: Actor | null }> {
  if (!session) return { viewer: ANON_VIEWER, actor: null };
  const actor = await loadActor(sql, session.id, session.email);
  return { viewer: toViewer(actor), actor };
}

function mapPost(row: PostRow, isAdmin: boolean): TalkPost {
  const deleted = present(row.deleted_at);
  return {
    id: row.id,
    parentId: row.parent_id,
    title: deleted ? null : row.title,
    body: deleted ? "This post was removed." : row.body,
    createdAt: stamp(row.created_at),
    deleted,
    author: {
      id: row.author_id,
      name: displayName(row.author_name, row.author_id),
      image: safeAvatarUrl(row.author_image),
    },
    replyCount: count(row.reply_count),
    reportCount: isAdmin ? count(row.report_count) : 0,
    reportedByMe: flagged(row.reported_by_me),
  };
}

async function selectPosts(sql: Sql, where: string, params: unknown[], viewerId: string): Promise<PostRow[]> {
  const text = `
    select
      p.id,
      p.parent_id,
      p.title,
      p.body,
      p.created_at,
      p.deleted_at,
      p.author_id,
      u."name" as author_name,
      u."image" as author_image,
      (select count(*)::int from discussion_post c
        where c.root_id = p.id and c.id <> p.id and c.deleted_at is null and c.hidden_at is null) as reply_count,
      (select count(*)::int from discussion_report r where r.post_id = p.id) as report_count,
      exists (
        select 1 from discussion_report r
        where r.post_id = p.id and r.reporter_id = $${params.length + 1}
      ) as reported_by_me
    from discussion_post p
    left join "user" u on u.id = p.author_id
    where ${where}
  `;
  return sql.query<PostRow>(text, [...params, viewerId]);
}

async function listBans(sql: Sql): Promise<TalkBan[]> {
  const rows = await sql<{ user_id: string; reason: string; created_at: unknown; name: string | null }>`
    select b.user_id, b.reason, b.created_at, u."name" as name
    from discussion_ban b
    left join "user" u on u.id = b.user_id
    order by b.created_at desc
    limit 100
  `;
  return rows.map((row) => ({
    userId: row.user_id,
    name: displayName(row.name, row.user_id),
    reason: row.reason,
    createdAt: stamp(row.created_at),
  }));
}

async function listQueue(sql: Sql): Promise<TalkReview[]> {
  const rows = await sql<{
    id: string;
    scope: string;
    title: string | null;
    body: string;
    created_at: unknown;
    hidden_at: unknown;
    hidden_reason: string | null;
    author_id: string;
    author_name: string | null;
    author_image: string | null;
    report_count: number | null;
  }>`
    select
      p.id,
      p.scope,
      p.title,
      p.body,
      p.created_at,
      p.hidden_at,
      p.hidden_reason,
      p.author_id,
      u."name" as author_name,
      u."image" as author_image,
      (select count(*)::int from discussion_report r where r.post_id = p.id) as report_count
    from discussion_post p
    left join "user" u on u.id = p.author_id
    where p.deleted_at is null
      and (
        p.hidden_at is not null
        or exists (select 1 from discussion_report r where r.post_id = p.id)
      )
    order by p.hidden_at desc nulls last, p.created_at desc
    limit 50
  `;
  return rows.map((row) => ({
    id: row.id,
    scope: row.scope,
    title: row.title,
    body: row.body,
    createdAt: stamp(row.created_at),
    hidden: present(row.hidden_at),
    hiddenReason: row.hidden_reason || (present(row.hidden_at) ? "hidden" : ""),
    reportCount: count(row.report_count),
    author: {
      id: row.author_id,
      name: displayName(row.author_name, row.author_id),
      image: safeAvatarUrl(row.author_image),
    },
  }));
}

async function rateMessage(sql: Sql, userId: string, fresh: boolean): Promise<string | null> {
  const rows = await sql<{ n: number; ago: number | null }>`
    select count(*)::int as n,
           extract(epoch from (now() - max(created_at))) as ago
    from discussion_post
    where author_id = ${userId}
      and created_at > now() - interval '10 minutes'
  `;
  const recent = count(rows[0]?.n);
  const ago = rows[0]?.ago;
  const ms = ago == null ? null : count(ago) * 1000;
  return rateLimitError(recent, recent === 0 ? null : ms, fresh);
}

async function duplicateMessage(sql: Sql, userId: string, body: string, title: string | null): Promise<string | null> {
  const rows = await sql<{ title: string | null; body: string }>`
    select title, body from discussion_post
    where author_id = ${userId}
      and created_at > now() - interval '1 day'
    order by created_at desc
    limit 20
  `;
  return duplicateError(body, title, rows);
}

async function strikeCount(sql: Sql, userId: string): Promise<number> {
  const rows = await sql<{ n: number }>`
    select count(*)::int as n from discussion_strike where user_id = ${userId}
  `;
  return count(rows[0]?.n);
}

async function userIsAdmin(sql: Sql, userId: string): Promise<boolean> {
  const rows = await sql<{ email: string | null }>`
    select "email" as email from "user" where id = ${userId} limit 1
  `;
  return isAdminEmail(rows[0]?.email, adminAllowlist());
}

async function applyPenalty(sql: Sql, userId: string): Promise<void> {
  if (await userIsAdmin(sql, userId)) return;
  const strikes = await strikeCount(sql, userId);
  const penalty = penaltyForStrikes(strikes);
  if (penalty.ban) {
    await sql`
      insert into discussion_ban (user_id, banned_by, reason)
      values (${userId}, ${"auto"}, ${"Automatic ban after repeated violations."})
      on conflict (user_id) do update
        set reason = excluded.reason, banned_by = excluded.banned_by, created_at = now()
    `;
    await sql`delete from discussion_mute where user_id = ${userId}`;
    return;
  }
  await sql`delete from discussion_ban where user_id = ${userId} and banned_by = ${"auto"}`;
  if (penalty.muteHours <= 0) {
    await sql`delete from discussion_mute where user_id = ${userId}`;
    return;
  }
  const until = new Date(Date.now() + penalty.muteHours * 3_600_000).toISOString();
  await sql`
    insert into discussion_mute (user_id, until)
    values (${userId}, ${until})
    on conflict (user_id) do update
      set until = case when discussion_mute.until > excluded.until then discussion_mute.until else excluded.until end,
          created_at = now()
  `;
}

async function addStrike(sql: Sql, userId: string, postId: string, reason: string): Promise<void> {
  if (await userIsAdmin(sql, userId)) return;
  try {
    await sql`
      insert into discussion_strike (id, user_id, post_id, reason)
      values (${crypto.randomUUID()}, ${userId}, ${postId}, ${reason})
    `;
  } catch (err) {
    if (isUniqueViolation(err)) return;
    throw err;
  }
  await applyPenalty(sql, userId);
}

async function parentDepth(sql: Sql, parentId: string): Promise<number | null> {
  const rows = await sql<{ depth: number | null }>`
    with recursive chain as (
      select id, parent_id, 1 as depth
      from discussion_post
      where id = ${parentId}
      union all
      select p.id, p.parent_id, chain.depth + 1
      from discussion_post p
      join chain on p.id = chain.parent_id
      where chain.depth < 12
    )
    select max(depth)::int as depth from chain
  `;
  if (!rows[0] || rows[0].depth == null) return null;
  return count(rows[0].depth);
}

async function requireActor(userId: string, writing: boolean): Promise<{ sql: Sql; actor: Actor } | Fail> {
  const sql = await getSql();
  const actor = await loadActor(sql, userId, null);
  if (actor.banned) return { ok: false, error: "This account can't post." };
  if (writing && actor.mutedUntil) return { ok: false, error: muteMessage(actor.mutedUntil) };
  return { sql, actor };
}

function failed(error: string): Fail {
  return { ok: false, error };
}

async function savePost(
  sql: Sql,
  actor: Actor,
  row: { scope: string; parentId: string | null; rootId: string; title: string | null; body: string; hold: boolean },
): Promise<OkId> {
  const id = crypto.randomUUID();
  const rootId = row.parentId ? row.rootId : id;
  await sql`
    insert into discussion_post (id, scope, parent_id, root_id, author_id, title, body, hidden_at, hidden_reason)
    values (
      ${id},
      ${row.scope},
      ${row.parentId},
      ${rootId},
      ${actor.id},
      ${row.title},
      ${row.body},
      ${row.hold ? new Date().toISOString() : null},
      ${row.hold ? "language" : ""}
    )
  `;
  if (row.hold) await addStrike(sql, actor.id, id, "language");
  return { ok: true, id, held: row.hold };
}

async function feed(sql: Sql, viewer: TalkViewer, posts: TalkPost[], withQueue: boolean): Promise<TalkFeed> {
  return {
    posts,
    viewer,
    bans: viewer.isAdmin ? await listBans(sql) : [],
    queue: viewer.isAdmin && withQueue ? await listQueue(sql) : [],
  };
}

export const listThreads = createServerFn({ method: "POST" })
  .middleware([optionalSession])
  .handler(async ({ context }): Promise<TalkFeed> => {
    const sql = await getSql();
    const { viewer } = await viewerFor(sql, context.session);
    const rows = await selectPosts(
      sql,
      `p.scope = $1 and p.parent_id is null and p.hidden_at is null order by p.created_at desc limit 50`,
      [BOARD_SCOPE],
      viewer.userId ?? "",
    );
    return feed(
      sql,
      viewer,
      rows.map((row) => mapPost(row, viewer.isAdmin)),
      true,
    );
  });

export const getThread = createServerFn({ method: "POST" })
  .middleware([optionalSession])
  .validator((input: { id?: string }) => String(input?.id ?? "").trim())
  .handler(async ({ context, data }): Promise<TalkFeed> => {
    if (!isUuid(data)) throw new Error("That thread is not here.");
    const sql = await getSql();
    const { viewer } = await viewerFor(sql, context.session);
    const rows = await selectPosts(
      sql,
      `p.scope = $1 and p.root_id = $2 and p.hidden_at is null order by p.created_at asc limit 300`,
      [BOARD_SCOPE, data],
      viewer.userId ?? "",
    );
    if (!rows.some((row) => row.id === data && row.parent_id == null)) {
      throw new Error("That thread is not here.");
    }
    return feed(
      sql,
      viewer,
      rows.map((row) => mapPost(row, viewer.isAdmin)),
      true,
    );
  });

export const listClipComments = createServerFn({ method: "POST" })
  .middleware([optionalSession])
  .validator((input: { clipId?: string }) => String(input?.clipId ?? "").trim())
  .handler(async ({ context, data }): Promise<TalkFeed> => {
    if (!isAllowedClipId(data)) throw new Error("That clip is not here.");
    const sql = await getSql();
    const { viewer } = await viewerFor(sql, context.session);
    const rows = await selectPosts(
      sql,
      `p.scope = $1 and p.hidden_at is null order by p.created_at asc limit 300`,
      [clipScope(data)],
      viewer.userId ?? "",
    );
    return feed(
      sql,
      viewer,
      rows.map((row) => mapPost(row, viewer.isAdmin)),
      false,
    );
  });

export const createThread = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { title?: unknown; body?: unknown }) => ({
    title: input?.title,
    body: input?.body,
  }))
  .handler(async ({ context, data }): Promise<OkId | Fail> => {
    const title = validateTitle(data.title);
    if (!title.ok) return title;
    const body = validateBody(data.body);
    if (!body.ok) return body;
    const ready = await requireActor(context.userId, true);
    if ("ok" in ready) return ready;
    const dup = await duplicateMessage(ready.sql, ready.actor.id, body.body, title.title);
    if (dup) return failed(dup);
    const limited = await rateMessage(ready.sql, ready.actor.id, !ready.actor.isAdmin && isNewAccount(ready.actor.createdAtMs));
    if (limited) return failed(limited);
    return savePost(ready.sql, ready.actor, {
      scope: BOARD_SCOPE,
      parentId: null,
      rootId: "",
      title: title.title,
      body: body.body,
      hold: title.hold || body.hold,
    });
  });

export const replyToPost = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { parentId?: unknown; body?: unknown }) => ({
    parentId: String(input?.parentId ?? "").trim(),
    body: input?.body,
  }))
  .handler(async ({ context, data }): Promise<OkId | Fail> => {
    if (!isUuid(data.parentId)) return failed("That post is not here.");
    const body = validateBody(data.body);
    if (!body.ok) return body;
    const ready = await requireActor(context.userId, true);
    if ("ok" in ready) return ready;
    const dup = await duplicateMessage(ready.sql, ready.actor.id, body.body, null);
    if (dup) return failed(dup);
    const limited = await rateMessage(ready.sql, ready.actor.id, !ready.actor.isAdmin && isNewAccount(ready.actor.createdAtMs));
    if (limited) return failed(limited);
    const parents = await ready.sql<{ scope: string; root_id: string; deleted_at: unknown; hidden_at: unknown }>`
      select scope, root_id, deleted_at, hidden_at from discussion_post where id = ${data.parentId} limit 1
    `;
    const parent = parents[0];
    if (!parent || present(parent.deleted_at) || present(parent.hidden_at)) return failed("That post is not here.");
    const depth = await parentDepth(ready.sql, data.parentId);
    if (depth == null) return failed("That post is not here.");
    const tooDeep = depthError(depth);
    if (tooDeep) return failed(tooDeep);
    return savePost(ready.sql, ready.actor, {
      scope: parent.scope,
      parentId: data.parentId,
      rootId: parent.root_id,
      title: null,
      body: body.body,
      hold: body.hold,
    });
  });

export const commentOnClip = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { clipId?: unknown; parentId?: unknown; body?: unknown }) => ({
    clipId: String(input?.clipId ?? "").trim(),
    parentId: input?.parentId == null || input.parentId === "" ? null : String(input.parentId).trim(),
    body: input?.body,
  }))
  .handler(async ({ context, data }): Promise<OkId | Fail> => {
    if (!isAllowedClipId(data.clipId)) return failed("That clip is not here.");
    const body = validateBody(data.body);
    if (!body.ok) return body;
    const ready = await requireActor(context.userId, true);
    if ("ok" in ready) return ready;
    const dup = await duplicateMessage(ready.sql, ready.actor.id, body.body, null);
    if (dup) return failed(dup);
    const limited = await rateMessage(ready.sql, ready.actor.id, !ready.actor.isAdmin && isNewAccount(ready.actor.createdAtMs));
    if (limited) return failed(limited);
    const scope = clipScope(data.clipId);
    let parentId: string | null = null;
    let rootId = "";
    if (data.parentId) {
      if (!isUuid(data.parentId)) return failed("That comment is not here.");
      const parents = await ready.sql<{ scope: string; root_id: string; deleted_at: unknown; hidden_at: unknown }>`
        select scope, root_id, deleted_at, hidden_at from discussion_post where id = ${data.parentId} limit 1
      `;
      const parent = parents[0];
      if (!parent || parent.scope !== scope || present(parent.deleted_at) || present(parent.hidden_at)) {
        return failed("That comment is not here.");
      }
      const depth = await parentDepth(ready.sql, data.parentId);
      if (depth == null) return failed("That comment is not here.");
      const tooDeep = depthError(depth);
      if (tooDeep) return failed(tooDeep);
      parentId = data.parentId;
      rootId = parent.root_id;
    }
    return savePost(ready.sql, ready.actor, {
      scope,
      parentId,
      rootId,
      title: null,
      body: body.body,
      hold: body.hold,
    });
  });

export const reportPost = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { postId?: unknown; reason?: unknown }) => ({
    postId: String(input?.postId ?? "").trim(),
    reason: input?.reason,
  }))
  .handler(async ({ context, data }): Promise<Ok | Fail> => {
    if (!isUuid(data.postId)) return failed("That post is not here.");
    const reason = validateReason(data.reason);
    if (!reason.ok) return reason;
    const ready = await requireActor(context.userId, false);
    if ("ok" in ready) return ready;
    const posts = await ready.sql<{ author_id: string; deleted_at: unknown; hidden_at: unknown }>`
      select author_id, deleted_at, hidden_at from discussion_post where id = ${data.postId} limit 1
    `;
    const post = posts[0];
    if (!post || present(post.deleted_at) || present(post.hidden_at)) return failed("That post is not here.");
    if (post.author_id === ready.actor.id) return failed("You can't report your own post.");
    const recent = await ready.sql<{ n: number }>`
      select count(*)::int as n from discussion_report
      where reporter_id = ${ready.actor.id}
        and created_at > now() - interval '1 hour'
    `;
    const tooMany = reportRateError(count(recent[0]?.n));
    if (tooMany) return failed(tooMany);
    try {
      await ready.sql`
        insert into discussion_report (id, post_id, reporter_id, reason)
        values (${crypto.randomUUID()}, ${data.postId}, ${ready.actor.id}, ${reason.reason})
      `;
    } catch (err) {
      if (isUniqueViolation(err)) return failed("You already reported that post.");
      throw err;
    }
    const totals = await ready.sql<{ n: number }>`
      select count(*)::int as n from discussion_report where post_id = ${data.postId}
    `;
    if (shouldHideForReports(count(totals[0]?.n))) {
      const hidden = await ready.sql<{ author_id: string }>`
        update discussion_post
        set hidden_at = now(), hidden_reason = 'reports'
        where id = ${data.postId} and hidden_at is null and deleted_at is null
        returning author_id
      `;
      const authorId = hidden[0]?.author_id;
      if (authorId) await addStrike(ready.sql, authorId, data.postId, "reports");
    }
    return { ok: true };
  });

export const removePost = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { postId?: unknown }) => String(input?.postId ?? "").trim())
  .handler(async ({ context, data }): Promise<Ok | Fail> => {
    if (!isUuid(data)) return failed("That post is not here.");
    const sql = await getSql();
    const actor = await loadActor(sql, context.userId, null);
    const posts = await sql<{ author_id: string }>`
      select author_id from discussion_post where id = ${data} limit 1
    `;
    const post = posts[0];
    if (!post) return failed("That post is not here.");
    if (post.author_id !== actor.id && !actor.isAdmin) return failed("You can only remove your own post.");
    await sql`
      update discussion_post set deleted_at = now()
      where id = ${data} and deleted_at is null
    `;
    return { ok: true };
  });

export const restorePost = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { postId?: unknown }) => String(input?.postId ?? "").trim())
  .handler(async ({ context, data }): Promise<Ok | Fail> => {
    if (!isUuid(data)) return failed("That post is not here.");
    const sql = await getSql();
    const actor = await loadActor(sql, context.userId, null);
    if (!actor.isAdmin) return failed("Only the site owner can do that.");
    const posts = await sql<{ author_id: string }>`
      update discussion_post
      set hidden_at = null, hidden_reason = ''
      where id = ${data} and deleted_at is null
      returning author_id
    `;
    const authorId = posts[0]?.author_id;
    if (!authorId) return failed("That post is not here.");
    await sql`delete from discussion_strike where post_id = ${data}`;
    await applyPenalty(sql, authorId);
    return { ok: true };
  });

export const banUser = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { userId?: unknown; reason?: unknown }) => ({
    userId: String(input?.userId ?? "").trim(),
    reason: input?.reason,
  }))
  .handler(async ({ context, data }): Promise<Ok | Fail> => {
    if (data.userId.length < 1 || data.userId.length > 200) return failed("That account is not here.");
    const reason = validateReason(data.reason);
    if (!reason.ok) return reason;
    const sql = await getSql();
    const actor = await loadActor(sql, context.userId, null);
    if (!actor.isAdmin) return failed("Only the site owner can do that.");
    if (data.userId === actor.id) return failed("You can't ban your own account.");
    const targets = await sql<{ email: string | null }>`
      select "email" as email from "user" where id = ${data.userId} limit 1
    `;
    if (isAdminEmail(targets[0]?.email, adminAllowlist())) {
      return failed("That account is an owner.");
    }
    await sql`
      insert into discussion_ban (user_id, banned_by, reason)
      values (${data.userId}, ${actor.id}, ${reason.reason})
      on conflict (user_id) do update
        set reason = excluded.reason, banned_by = excluded.banned_by, created_at = now()
    `;
    await sql`delete from discussion_mute where user_id = ${data.userId}`;
    return { ok: true };
  });

export const unbanUser = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { userId?: unknown }) => String(input?.userId ?? "").trim())
  .handler(async ({ context, data }): Promise<Ok | Fail> => {
    if (data.length < 1 || data.length > 200) return failed("That account is not here.");
    const sql = await getSql();
    const actor = await loadActor(sql, context.userId, null);
    if (!actor.isAdmin) return failed("Only the site owner can do that.");
    await sql`delete from discussion_ban where user_id = ${data}`;
    return { ok: true };
  });
