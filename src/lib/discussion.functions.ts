/**
 * Fan discussion stored in the same Postgres as Better Auth (`getSql`).
 *
 * The site owner is whoever's account email is listed in the server env var
 * `COMMUNITY_ADMIN_EMAIL` (comma-separated). That account can delete any post
 * and ban users. The variable is read on the server only — never a `VITE_` key.
 */
import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { getSql, type Sql } from "@/lib/db";
import { clipScope } from "@/lib/clip-ids";
import { authMiddleware } from "@/lib/auth/middleware";
import {
  ANON_VIEWER,
  BOARD_SCOPE,
  depthError,
  isAdminEmail,
  isAllowedClipId,
  isUuid,
  rateLimitError,
  reportRateError,
  safeAvatarUrl,
  validateBody,
  validateReason,
  validateTitle,
  type TalkBan,
  type TalkFeed,
  type TalkPost,
  type TalkViewer,
} from "@/lib/discussion";

type Actor = {
  id: string;
  email: string | null;
  name: string;
  image: string | null;
  isAdmin: boolean;
  banned: boolean;
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

type OkId = { ok: true; id: string };
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

function count(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function flagged(value: unknown): boolean {
  return value === true || value === "t" || value === "true" || value === 1;
}

function isUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  if ("code" in err && String((err as { code: unknown }).code) === "23505") return true;
  const message = err instanceof Error ? err.message : "";
  return /duplicate key|unique constraint/i.test(message);
}

async function loadActor(sql: Sql, userId: string, fallbackEmail: string | null): Promise<Actor> {
  const users = await sql<{ name: string | null; email: string | null; image: string | null }>`
    select "name" as name, "email" as email, "image" as image
    from "user"
    where id = ${userId}
    limit 1
  `;
  const bans = await sql<{ user_id: string }>`
    select user_id from discussion_ban where user_id = ${userId} limit 1
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
  };
}

async function viewerFor(sql: Sql, session: Session): Promise<{ viewer: TalkViewer; actor: Actor | null }> {
  if (!session) return { viewer: ANON_VIEWER, actor: null };
  const actor = await loadActor(sql, session.id, session.email);
  return { viewer: toViewer(actor), actor };
}

function mapPost(row: PostRow, isAdmin: boolean): TalkPost {
  const deleted = row.deleted_at != null && row.deleted_at !== "";
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
        where c.root_id = p.id and c.id <> p.id and c.deleted_at is null) as reply_count,
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

async function rateMessage(sql: Sql, userId: string): Promise<string | null> {
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
  return rateLimitError(recent, recent === 0 ? null : ms);
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

async function requireActor(userId: string): Promise<{ sql: Sql; actor: Actor } | Fail> {
  const sql = await getSql();
  const actor = await loadActor(sql, userId, null);
  if (actor.banned) return { ok: false, error: "This account can't post." };
  return { sql, actor };
}

function failed(error: string): Fail {
  return { ok: false, error };
}

export const listThreads = createServerFn({ method: "POST" })
  .middleware([optionalSession])
  .handler(async ({ context }): Promise<TalkFeed> => {
    const sql = await getSql();
    const { viewer } = await viewerFor(sql, context.session);
    const rows = await selectPosts(
      sql,
      `p.scope = $1 and p.parent_id is null order by p.created_at desc limit 50`,
      [BOARD_SCOPE],
      viewer.userId ?? "",
    );
    return {
      posts: rows.map((row) => mapPost(row, viewer.isAdmin)),
      viewer,
      bans: viewer.isAdmin ? await listBans(sql) : [],
    };
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
      `p.scope = $1 and p.root_id = $2 order by p.created_at asc limit 300`,
      [BOARD_SCOPE, data],
      viewer.userId ?? "",
    );
    if (!rows.some((row) => row.id === data && row.parent_id == null)) {
      throw new Error("That thread is not here.");
    }
    return {
      posts: rows.map((row) => mapPost(row, viewer.isAdmin)),
      viewer,
      bans: viewer.isAdmin ? await listBans(sql) : [],
    };
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
      `p.scope = $1 order by p.created_at asc limit 300`,
      [clipScope(data)],
      viewer.userId ?? "",
    );
    return {
      posts: rows.map((row) => mapPost(row, viewer.isAdmin)),
      viewer,
      bans: [],
    };
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
    const ready = await requireActor(context.userId);
    if ("ok" in ready) return ready;
    const limited = await rateMessage(ready.sql, ready.actor.id);
    if (limited) return failed(limited);
    const id = crypto.randomUUID();
    await ready.sql`
      insert into discussion_post (id, scope, parent_id, root_id, author_id, title, body)
      values (${id}, ${BOARD_SCOPE}, null, ${id}, ${ready.actor.id}, ${title.title}, ${body.body})
    `;
    return { ok: true, id };
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
    const ready = await requireActor(context.userId);
    if ("ok" in ready) return ready;
    const limited = await rateMessage(ready.sql, ready.actor.id);
    if (limited) return failed(limited);
    const parents = await ready.sql<{ scope: string; root_id: string; deleted_at: unknown }>`
      select scope, root_id, deleted_at from discussion_post where id = ${data.parentId} limit 1
    `;
    const parent = parents[0];
    if (!parent) return failed("That post is not here.");
    if (parent.deleted_at != null && parent.deleted_at !== "") return failed("That post was removed.");
    const depth = await parentDepth(ready.sql, data.parentId);
    if (depth == null) return failed("That post is not here.");
    const tooDeep = depthError(depth);
    if (tooDeep) return failed(tooDeep);
    const id = crypto.randomUUID();
    await ready.sql`
      insert into discussion_post (id, scope, parent_id, root_id, author_id, title, body)
      values (${id}, ${parent.scope}, ${data.parentId}, ${parent.root_id}, ${ready.actor.id}, null, ${body.body})
    `;
    return { ok: true, id };
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
    const ready = await requireActor(context.userId);
    if ("ok" in ready) return ready;
    const limited = await rateMessage(ready.sql, ready.actor.id);
    if (limited) return failed(limited);
    const scope = clipScope(data.clipId);
    let parentId: string | null = null;
    let rootId = "";
    if (data.parentId) {
      if (!isUuid(data.parentId)) return failed("That comment is not here.");
      const parents = await ready.sql<{ scope: string; root_id: string; deleted_at: unknown }>`
        select scope, root_id, deleted_at from discussion_post where id = ${data.parentId} limit 1
      `;
      const parent = parents[0];
      if (!parent || parent.scope !== scope) return failed("That comment is not here.");
      if (parent.deleted_at != null && parent.deleted_at !== "") return failed("That comment was removed.");
      const depth = await parentDepth(ready.sql, data.parentId);
      if (depth == null) return failed("That comment is not here.");
      const tooDeep = depthError(depth);
      if (tooDeep) return failed(tooDeep);
      parentId = data.parentId;
      rootId = parent.root_id;
    }
    const id = crypto.randomUUID();
    if (!parentId) rootId = id;
    await ready.sql`
      insert into discussion_post (id, scope, parent_id, root_id, author_id, title, body)
      values (${id}, ${scope}, ${parentId}, ${rootId}, ${ready.actor.id}, null, ${body.body})
    `;
    return { ok: true, id };
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
    const ready = await requireActor(context.userId);
    if ("ok" in ready) return ready;
    const posts = await ready.sql<{ author_id: string; deleted_at: unknown }>`
      select author_id, deleted_at from discussion_post where id = ${data.postId} limit 1
    `;
    const post = posts[0];
    if (!post || (post.deleted_at != null && post.deleted_at !== "")) return failed("That post is not here.");
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
