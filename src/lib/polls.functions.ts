/**
 * One featured community poll. The bank rotates each Chicago week, the same
 * clock as the daily clips. Signed-in fans get one vote. Suggestions stay
 * hidden until the owner approves them. Slurs, threats, harassment, and spam
 * are the only automatic holds. Nothing here bans anyone.
 */
import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql, type Sql } from "@/lib/db";
import { ANON_VIEWER, duplicateError, isAdminEmail, isUuid, rateLimitError, type TalkViewer } from "@/lib/discussion";
import {
  bankPollId,
  chicagoWeekKey,
  featuredBankPoll,
  pollPercents,
  validatePoll,
  type PollCard,
  type PollChoice,
  type PollSuggestionView,
} from "@/lib/polls";

type Session = { id: string; email: string | null } | null;
type Fail = { ok: false; error: string };

export type PollBoard = {
  featured: PollCard | null;
  archive: PollCard[];
  suggestions: PollSuggestionView[];
  viewer: TalkViewer;
};

type Actor = { id: string; isAdmin: boolean; banned: boolean };

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
    console.error("[polls] session", err);
    return null;
  }
}

function count(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function stamp(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && value) {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return new Date(parsed).toISOString();
  }
  return new Date().toISOString();
}

function present(value: unknown): boolean {
  return value != null && value !== "";
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

function failed(error: string): Fail {
  return { ok: false, error };
}

async function loadActor(sql: Sql, userId: string, fallbackEmail: string | null): Promise<Actor> {
  const users = await sql<{ email: string | null }>`
    select "email" as email from "user" where id = ${userId} limit 1
  `;
  const bans = await sql<{ user_id: string }>`
    select user_id from discussion_ban where user_id = ${userId} limit 1
  `;
  const email = users[0]?.email ?? fallbackEmail;
  const isAdmin = isAdminEmail(email, adminAllowlist());
  return { id: userId, isAdmin, banned: Boolean(bans[0]) && !isAdmin };
}

async function viewerFor(sql: Sql, session: Session): Promise<{ viewer: TalkViewer; actor: Actor | null }> {
  if (!session) return { viewer: ANON_VIEWER, actor: null };
  const actor = await loadActor(sql, session.id, session.email);
  return {
    viewer: {
      signedIn: true,
      userId: actor.id,
      name: null,
      image: null,
      isAdmin: actor.isAdmin,
      banned: actor.banned,
    },
    actor,
  };
}

async function requireActor(userId: string): Promise<{ sql: Sql; actor: Actor } | Fail> {
  const sql = await getSql();
  const actor = await loadActor(sql, userId, null);
  if (actor.banned) return { ok: false, error: "This account can't take part." };
  return { sql, actor };
}

type OptionRow = {
  poll_id: string;
  question: string;
  status: string;
  option_id: string;
  label: string;
  position: number | null;
  votes: number | null;
};

function cardsFrom(rows: OptionRow[], mine: Map<string, string>, closed: boolean): PollCard[] {
  const order: string[] = [];
  const grouped = new Map<string, { question: string; options: { id: string; label: string; votes: number; position: number }[] }>();
  for (const row of rows) {
    let card = grouped.get(row.poll_id);
    if (!card) {
      card = { question: row.question, options: [] };
      grouped.set(row.poll_id, card);
      order.push(row.poll_id);
    }
    card.options.push({
      id: row.option_id,
      label: row.label,
      votes: count(row.votes),
      position: count(row.position),
    });
  }
  return order.map((id) => {
    const card = grouped.get(id)!;
    card.options.sort((a, b) => a.position - b.position);
    const counts = card.options.map((option) => option.votes);
    const pct = pollPercents(counts);
    const options: PollChoice[] = card.options.map((option, index) => ({
      id: option.id,
      label: option.label,
      votes: option.votes,
      pct: pct[index] ?? 0,
    }));
    return {
      id,
      question: card.question,
      options,
      total: counts.reduce((sum, n) => sum + n, 0),
      myOptionId: mine.get(id) ?? null,
      closed,
    };
  });
}

async function myVotes(sql: Sql, userId: string, pollIds: string[]): Promise<Map<string, string>> {
  const mine = new Map<string, string>();
  if (!userId || pollIds.length === 0) return mine;
  const slots = pollIds.map((_, index) => `$${index + 2}`).join(", ");
  const rows = await sql.query<{ poll_id: string; option_id: string }>(
    `select poll_id, option_id from discussion_poll_vote where user_id = $1 and poll_id in (${slots})`,
    [userId, ...pollIds],
  );
  for (const row of rows) mine.set(row.poll_id, row.option_id);
  return mine;
}

async function ensureFeatured(sql: Sql): Promise<void> {
  const weekKey = chicagoWeekKey();
  await sql`
    update discussion_poll
    set status = 'closed', featured = false, closed_at = coalesce(closed_at, now())
    where status = 'open'
      and week_key is not null
      and week_key <> ${weekKey}
      and deleted_at is null
  `;
  const open = await sql<{ id: string }>`
    select id from discussion_poll
    where featured = true and status = 'open' and deleted_at is null
    limit 1
  `;
  if (open[0]) return;
  const bank = featuredBankPoll(weekKey);
  const id = bankPollId(weekKey, bank.id);
  const existing = await sql<{ status: string }>`
    select status from discussion_poll where id = ${id} and deleted_at is null limit 1
  `;
  if (existing[0]?.status === "closed") return;
  if (existing[0]?.status === "open") {
    await sql`update discussion_poll set featured = true where id = ${id}`;
  } else {
    try {
      await sql`
        insert into discussion_poll (id, bank_id, week_key, question, status, featured)
        values (${id}, ${bank.id}, ${weekKey}, ${bank.question}, 'open', true)
      `;
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
    }
  }
  for (let index = 0; index < bank.options.length; index += 1) {
    try {
      await sql`
        insert into discussion_poll_option (id, poll_id, label, position)
        values (${`${id}:${index}`}, ${id}, ${bank.options[index] ?? ""}, ${index})
      `;
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
    }
  }
}

async function closeFeatured(sql: Sql): Promise<void> {
  await sql`
    update discussion_poll
    set status = 'closed', featured = false, closed_at = coalesce(closed_at, now())
    where featured = true and status = 'open' and deleted_at is null
  `;
}

async function loadBoard(sql: Sql, viewer: TalkViewer): Promise<PollBoard> {
  await ensureFeatured(sql);
  const rows = await sql<OptionRow & { featured: boolean | null }>`
    select
      p.id as poll_id,
      p.question,
      p.status,
      p.featured,
      o.id as option_id,
      o.label,
      o.position,
      (select count(*)::int from discussion_poll_vote v where v.option_id = o.id) as votes
    from discussion_poll p
    join discussion_poll_option o on o.poll_id = p.id
    where p.deleted_at is null
      and (
        (p.featured = true and p.status = 'open')
        or p.status = 'closed'
      )
    order by p.featured desc, p.closed_at desc nulls last, o.position
    limit 200
  `;
  const featuredRows = rows.filter((row) => flagged(row.featured) && row.status === "open");
  const archiveRows = rows.filter((row) => row.status === "closed");
  const ids = [...new Set(rows.map((row) => row.poll_id))];
  const mine = await myVotes(sql, viewer.userId ?? "", ids);
  const featured = cardsFrom(featuredRows, mine, false)[0] ?? null;
  const archive = cardsFrom(archiveRows, mine, true).slice(0, 8);
  let suggestions: PollSuggestionView[] = [];
  if (viewer.isAdmin) {
    const suggested = await sql<{
      id: string;
      question: string;
      hidden_reason: string | null;
      created_at: unknown;
      author_name: string | null;
      label: string;
      position: number | null;
    }>`
      select
        p.id,
        p.question,
        p.hidden_reason,
        p.created_at,
        u."name" as author_name,
        o.label,
        o.position
      from discussion_poll p
      join discussion_poll_option o on o.poll_id = p.id
      left join "user" u on u.id = p.author_id
      where p.status = 'suggested' and p.deleted_at is null
      order by p.created_at desc, o.position
      limit 80
    `;
    const map = new Map<string, PollSuggestionView>();
    for (const row of suggested) {
      let item = map.get(row.id);
      if (!item) {
        item = {
          id: row.id,
          question: row.question,
          options: [],
          authorName: String(row.author_name ?? "Fan").replace(/\s+/g, " ").trim().slice(0, 80) || "Fan",
          createdAt: stamp(row.created_at),
          reason: row.hidden_reason || "approval",
        };
        map.set(row.id, item);
      }
      item.options[count(row.position)] = row.label;
    }
    suggestions = [...map.values()].map((item) => ({ ...item, options: item.options.filter(Boolean) }));
  }
  return { featured, archive, suggestions, viewer };
}

async function onePoll(sql: Sql, pollId: string, userId: string): Promise<PollCard | null> {
  const rows = await sql<OptionRow>`
    select
      p.id as poll_id,
      p.question,
      p.status,
      o.id as option_id,
      o.label,
      o.position,
      (select count(*)::int from discussion_poll_vote v where v.option_id = o.id) as votes
    from discussion_poll p
    join discussion_poll_option o on o.poll_id = p.id
    where p.id = ${pollId} and p.deleted_at is null
    order by o.position
  `;
  if (!rows[0]) return null;
  const mine = await myVotes(sql, userId, [pollId]);
  return cardsFrom(rows, mine, rows[0].status === "closed")[0] ?? null;
}

export const getPollBoard = createServerFn({ method: "POST" })
  .middleware([optionalSession])
  .handler(async ({ context }): Promise<PollBoard> => {
    const sql = await getSql();
    const { viewer } = await viewerFor(sql, context.session);
    return loadBoard(sql, viewer);
  });

export const votePoll = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { pollId?: unknown; optionId?: unknown }) => ({
    pollId: String(input?.pollId ?? "").trim(),
    optionId: String(input?.optionId ?? "").trim(),
  }))
  .handler(async ({ context, data }): Promise<{ ok: true; poll: PollCard } | Fail> => {
    if (!data.pollId || !data.optionId) return failed("That choice is not here.");
    const ready = await requireActor(context.userId);
    if ("ok" in ready) return ready;
    await ensureFeatured(ready.sql);
    const polls = await ready.sql<{ status: string }>`
      select status from discussion_poll
      where id = ${data.pollId} and deleted_at is null and hidden_at is null
      limit 1
    `;
    const poll = polls[0];
    if (!poll || poll.status !== "open") return failed("That poll is closed.");
    const options = await ready.sql<{ id: string }>`
      select id from discussion_poll_option where id = ${data.optionId} and poll_id = ${data.pollId} limit 1
    `;
    if (!options[0]) return failed("That choice is not here.");
    await ready.sql`
      insert into discussion_poll_vote (poll_id, user_id, option_id)
      values (${data.pollId}, ${ready.actor.id}, ${data.optionId})
      on conflict (poll_id, user_id) do update
        set option_id = excluded.option_id, created_at = now()
    `;
    const card = await onePoll(ready.sql, data.pollId, ready.actor.id);
    if (!card) return failed("That poll is closed.");
    return { ok: true, poll: card };
  });

export const suggestPoll = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { question?: unknown; options?: unknown }) => ({
    question: input?.question,
    options: input?.options,
  }))
  .handler(async ({ context, data }): Promise<{ ok: true; id: string; held: true } | Fail> => {
    const checked = validatePoll(data.question, data.options);
    if (!checked.ok) return checked;
    const ready = await requireActor(context.userId);
    if ("ok" in ready) return ready;
    const recent = await ready.sql<{ n: number; ago: number | null; question: string }>`
      select count(*)::int as n,
             extract(epoch from (now() - max(created_at))) as ago,
             '' as question
      from discussion_poll
      where author_id = ${ready.actor.id}
        and created_at > now() - interval '10 minutes'
    `;
    const n = count(recent[0]?.n);
    const ago = recent[0]?.ago;
    const limited = rateLimitError(n, n === 0 || ago == null ? null : count(ago) * 1000);
    if (limited) return failed(limited);
    const previous = await ready.sql<{ question: string }>`
      select question from discussion_poll
      where author_id = ${ready.actor.id}
        and deleted_at is null
        and created_at > now() - interval '1 day'
      order by created_at desc
      limit 20
    `;
    const dup = duplicateError(checked.question, null, previous.map((row) => ({ title: null, body: row.question })));
    if (dup) return failed(dup);
    const id = crypto.randomUUID();
    await ready.sql`
      insert into discussion_poll (id, question, status, featured, hidden_at, hidden_reason, author_id)
      values (
        ${id},
        ${checked.question},
        'suggested',
        false,
        ${new Date().toISOString()},
        ${checked.hold ? "language" : "approval"},
        ${ready.actor.id}
      )
    `;
    for (let index = 0; index < checked.options.length; index += 1) {
      await ready.sql`
        insert into discussion_poll_option (id, poll_id, label, position)
        values (${crypto.randomUUID()}, ${id}, ${checked.options[index] ?? ""}, ${index})
      `;
    }
    return { ok: true, id, held: true };
  });

async function requireAdmin(userId: string): Promise<{ sql: Sql; actor: Actor } | Fail> {
  const ready = await requireActor(userId);
  if ("ok" in ready) return ready;
  if (!ready.actor.isAdmin) return failed("Only the site owner can do that.");
  return ready;
}

export const createPoll = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { question?: unknown; options?: unknown }) => ({
    question: input?.question,
    options: input?.options,
  }))
  .handler(async ({ context, data }): Promise<{ ok: true; id: string } | Fail> => {
    const checked = validatePoll(data.question, data.options);
    if (!checked.ok) return checked;
    if (checked.hold) return failed("Rephrase that before it goes on the board.");
    const ready = await requireAdmin(context.userId);
    if ("ok" in ready) return ready;
    await closeFeatured(ready.sql);
    const id = crypto.randomUUID();
    await ready.sql`
      insert into discussion_poll (id, week_key, question, status, featured, author_id)
      values (${id}, ${chicagoWeekKey()}, ${checked.question}, 'open', true, ${ready.actor.id})
    `;
    for (let index = 0; index < checked.options.length; index += 1) {
      await ready.sql`
        insert into discussion_poll_option (id, poll_id, label, position)
        values (${crypto.randomUUID()}, ${id}, ${checked.options[index] ?? ""}, ${index})
      `;
    }
    return { ok: true, id };
  });

export const editPoll = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { pollId?: unknown; question?: unknown; options?: unknown }) => ({
    pollId: String(input?.pollId ?? "").trim(),
    question: input?.question,
    options: input?.options,
  }))
  .handler(async ({ context, data }): Promise<{ ok: true } | Fail> => {
    const checked = validatePoll(data.question, data.options);
    if (!checked.ok) return checked;
    if (checked.hold) return failed("Rephrase that before it goes on the board.");
    const ready = await requireAdmin(context.userId);
    if ("ok" in ready) return ready;
    const polls = await ready.sql<{ status: string }>`
      select status from discussion_poll where id = ${data.pollId} and deleted_at is null limit 1
    `;
    if (!polls[0] || polls[0].status === "closed") return failed("That poll is not open.");
    const votes = await ready.sql<{ n: number }>`
      select count(*)::int as n from discussion_poll_vote where poll_id = ${data.pollId}
    `;
    const voted = count(votes[0]?.n) > 0;
    const current = await ready.sql<{ id: string; position: number }>`
      select id, position from discussion_poll_option where poll_id = ${data.pollId} order by position
    `;
    if (voted && current.length !== checked.options.length) {
      return failed("People have already voted. You can rename choices, not add or drop them.");
    }
    await ready.sql`update discussion_poll set question = ${checked.question} where id = ${data.pollId}`;
    if (voted) {
      for (let index = 0; index < current.length; index += 1) {
        const option = current[index];
        if (!option) continue;
        await ready.sql`update discussion_poll_option set label = ${checked.options[index] ?? option.id} where id = ${option.id}`;
      }
      return { ok: true };
    }
    await ready.sql`delete from discussion_poll_option where poll_id = ${data.pollId}`;
    for (let index = 0; index < checked.options.length; index += 1) {
      await ready.sql`
        insert into discussion_poll_option (id, poll_id, label, position)
        values (${crypto.randomUUID()}, ${data.pollId}, ${checked.options[index] ?? ""}, ${index})
      `;
    }
    return { ok: true };
  });

export const closePoll = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { pollId?: unknown }) => String(input?.pollId ?? "").trim())
  .handler(async ({ context, data }): Promise<{ ok: true } | Fail> => {
    if (!data) return failed("That poll is not here.");
    const ready = await requireAdmin(context.userId);
    if ("ok" in ready) return ready;
    const rows = await ready.sql<{ id: string }>`
      update discussion_poll
      set status = 'closed', featured = false, closed_at = coalesce(closed_at, now())
      where id = ${data} and deleted_at is null and status = 'open'
      returning id
    `;
    if (!rows[0]) return failed("That poll is not open.");
    return { ok: true };
  });

export const approveSuggestion = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { pollId?: unknown }) => String(input?.pollId ?? "").trim())
  .handler(async ({ context, data }): Promise<{ ok: true } | Fail> => {
    if (!isUuid(data)) return failed("That suggestion is not here.");
    const ready = await requireAdmin(context.userId);
    if ("ok" in ready) return ready;
    const rows = await ready.sql<{ id: string }>`
      select id from discussion_poll
      where id = ${data} and status = 'suggested' and deleted_at is null
      limit 1
    `;
    if (!rows[0]) return failed("That suggestion is not here.");
    await closeFeatured(ready.sql);
    await ready.sql`
      update discussion_poll
      set status = 'open', featured = true, week_key = ${chicagoWeekKey()}, hidden_at = null, hidden_reason = ''
      where id = ${data}
    `;
    return { ok: true };
  });

export const removeSuggestion = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { pollId?: unknown }) => String(input?.pollId ?? "").trim())
  .handler(async ({ context, data }): Promise<{ ok: true } | Fail> => {
    if (!isUuid(data)) return failed("That suggestion is not here.");
    const ready = await requireAdmin(context.userId);
    if ("ok" in ready) return ready;
    const rows = await ready.sql<{ id: string }>`
      update discussion_poll set deleted_at = now()
      where id = ${data} and status = 'suggested' and deleted_at is null
      returning id
    `;
    if (!rows[0]) return failed("That suggestion is not here.");
    return { ok: true };
  });
