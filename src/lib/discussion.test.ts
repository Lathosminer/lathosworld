import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { CLIP_DISCUSSION_IDS, clipScope } from "./clips.ts";
import {
  BODY_MAX,
  COMMUNITY_RULES,
  MAX_DEPTH,
  RATE_MAX_POSTS,
  RATE_MIN_GAP_MS,
  REPORT_HIDE_AT,
  depthError,
  duplicateError,
  formatWhen,
  ANON_VIEWER,
  hasProfanity,
  isAdminEmail,
  isAllowedClipId,
  isUuid,
  linkSpamError,
  noteIsLive,
  noteStatus,
  noteVisibleTo,
  postsByParent,
  proposedStrikeNote,
  previewText,
  rateLimitError,
  reportRateError,
  safeAvatarUrl,
  severeLanguage,
  shouldHideForReports,
  validateBody,
  validateNote,
  validateReason,
  validateTitle,
  type TalkPost,
} from "./discussion.ts";

const NOW = Date.parse("2026-10-17T12:00:00Z");

function post(id: string, parentId: string | null): TalkPost {
  return {
    id,
    parentId,
    title: parentId ? null : "Hello",
    body: "Body",
    createdAt: "2026-10-17T12:00:00.000Z",
    deleted: false,
    author: { id: "u", name: "Nova", image: null },
    replyCount: 0,
    reportCount: 0,
    reportedByMe: false,
    notes: [],
  };
}

describe("discussion safety", () => {
  it("accepts a normal sentence and a single link", () => {
    const text = "The rooftop clip is the one: https://lathosworld.com/clips";
    assert.equal(hasProfanity(text), false);
    assert.equal(linkSpamError(text), null);
    assert.equal(validateBody(text).ok, true);
  });

  it("lets swearing, caps, emoji, and gamer trash talk through", () => {
    for (const text of [
      "what the fuck",
      "f.u.c.k this boss",
      "sh1t happens",
      "this is shit",
      "I'll kill you next round",
      "PLEASE STOP YELLING IN THIS THREAD",
      `nice clip ${"🔥".repeat(12)}`,
    ]) {
      assert.equal(severeLanguage(text), false, text);
      const checked = validateBody(text);
      assert.equal(checked.ok, true, text);
      if (checked.ok) assert.equal(checked.hold, false, text);
    }
  });

  it("hides slurs, threats, and harassment instead of publishing them", () => {
    const held = validateBody("you n1gger");
    assert.equal(held.ok, true);
    if (held.ok) assert.equal(held.hold, true);
    const dotted = validateBody("f.a.g.g.o.t off");
    assert.equal(dotted.ok, true);
    if (dotted.ok) assert.equal(dotted.hold, true);
    assert.equal(severeLanguage("I'll kill you next round"), false);
    assert.equal(severeLanguage("kill yourself"), true);
    assert.equal(severeLanguage("I will rape you"), true);
    assert.equal(severeLanguage("k y s"), true);
    assert.equal(severeLanguage("n!gger"), true);
    assert.equal(hasProfanity("go kys"), true);
    const titled = validateTitle("go kys now");
    assert.equal(titled.ok, true);
    if (titled.ok) assert.equal(titled.hold, true);
    const clean = validateBody("The rooftop clip was great");
    assert.equal(clean.ok, true);
    if (clean.ok) assert.equal(clean.hold, false);
  });

  it("does not flag ordinary words that only look similar", () => {
    for (const text of [
      "classic bass line",
      "assassin",
      "cocktail",
      "Scunthorpe",
      "grape",
      "therapist",
      "assignment",
      "Pakistan",
      "raccoon",
      "spice",
      "flick the switch",
      "feedback",
    ]) {
      assert.equal(hasProfanity(text), false, text);
      assert.equal(severeLanguage(text), false, text);
    }
  });

  it("blocks duplicate posts and leaves short repeats alone", () => {
    const again = duplicateError("Who is on for the raid tonight?", null, [
      { title: null, body: "Who   is ON for the raid tonight?" },
    ]);
    assert.equal(again, "You already said that.");
    assert.equal(duplicateError("gg", null, [{ title: null, body: "gg" }]), null);
  });

  it("hides a post after three reports and only labels proposed strikes", () => {
    assert.equal(shouldHideForReports(REPORT_HIDE_AT - 1), false);
    assert.equal(shouldHideForReports(REPORT_HIDE_AT), true);
    assert.equal(proposedStrikeNote(0), null);
    assert.equal(proposedStrikeNote(1), "Proposed strike: 1");
    assert.equal(proposedStrikeNote(3), "Proposed strikes: 3");
    assert.equal(COMMUNITY_RULES.split("\n")[0], "Common courtesy. Be respectful.");
    assert.match(COMMUNITY_RULES, /Slurs, threats, harassment, and spam get removed/);
  });

  it("shows a community note only after enough helpful ratings", () => {
    assert.equal(noteIsLive(2, 0), false);
    assert.equal(noteIsLive(3, 0), true);
    assert.equal(noteIsLive(3, 3), false);
    assert.equal(noteIsLive(4, 3), true);
    assert.equal(noteStatus(true, 5, 0), "held");
    assert.equal(noteStatus(false, 1, 0), "pending");
    assert.equal(noteStatus(false, 3, 0), "live");
    assert.equal(noteVisibleTo("live", "fan", ANON_VIEWER), true);
    assert.equal(noteVisibleTo("pending", "fan", ANON_VIEWER), false);
    assert.equal(noteVisibleTo("pending", "fan", { signedIn: true, userId: "other", isAdmin: false }), true);
    assert.equal(noteVisibleTo("held", "fan", { signedIn: true, userId: "other", isAdmin: false }), false);
    assert.equal(noteVisibleTo("held", "fan", { signedIn: true, userId: "fan", isAdmin: false }), true);
    assert.equal(noteVisibleTo("held", "fan", { signedIn: true, userId: "owner", isAdmin: true }), true);
  });

  it("holds a slur in a note and lets trash talk through", () => {
    const trash = validateNote("this clip is bullshit, he whiffed the boss");
    assert.equal(trash.ok, true);
    if (trash.ok) assert.equal(trash.hold, false);
    const held = validateNote("context: you n1gger lied about the raid");
    assert.equal(held.ok, true);
    if (held.ok) assert.equal(held.hold, true);
    assert.equal(validateNote("too short").ok, false);
    const spam = validateNote("see https://a.test and https://b.test and https://c.test please");
    assert.equal(spam.ok, false);
  });

  it("caps links", () => {
    assert.equal(linkSpamError("https://a.test https://b.test https://c.test and more words here"), "Too many links. Two is the limit.");
    assert.ok(linkSpamError("https://discord.gg/spam"));
    const three = validateBody("see https://a.test and https://b.test and https://c.test please");
    assert.equal(three.ok, false);
  });

  it("enforces length", () => {
    assert.equal(validateTitle("Hi").ok, false);
    assert.equal(validateTitle("Raid night").ok, true);
    assert.equal(validateBody("A").ok, false);
    assert.equal(validateBody("x".repeat(BODY_MAX + 1)).ok, false);
    assert.equal(validateReason("y".repeat(301)).ok, false);
    assert.equal(validateReason("").ok, true);
  });

  it("rate limits posts and reports", () => {
    assert.equal(rateLimitError(1, RATE_MIN_GAP_MS - 1), "Slow down a moment, then post again.");
    assert.equal(rateLimitError(1, RATE_MIN_GAP_MS), null);
    assert.ok(rateLimitError(RATE_MAX_POSTS, 60_000));
    assert.equal(rateLimitError(0, null), null);
    assert.ok(reportRateError(8));
    assert.equal(reportRateError(7), null);
  });

  it("stops replies past six deep", () => {
    assert.equal(depthError(MAX_DEPTH - 1), null);
    assert.ok(depthError(MAX_DEPTH));
  });

  it("matches owner emails without caring about case or spacing", () => {
    const list = " Owner@LathosWorld.com, mod@example.com ";
    assert.equal(isAdminEmail("owner@lathosworld.com", list), true);
    assert.equal(isAdminEmail("fan@example.com", list), false);
    assert.equal(isAdminEmail("owner@lathosworld.com", ""), false);
    assert.equal(isAdminEmail(null, list), false);
  });

  it("only allows http(s) avatars", () => {
    assert.equal(safeAvatarUrl("https://cdn.example/a.png"), "https://cdn.example/a.png");
    assert.equal(safeAvatarUrl("javascript:alert(1)"), null);
    assert.equal(safeAvatarUrl("data:text/html,hi"), null);
    assert.equal(safeAvatarUrl(""), null);
  });

  it("formats timestamps and nests replies under their parent", () => {
    assert.equal(formatWhen("2026-10-17T11:59:40Z", NOW), "just now");
    assert.equal(formatWhen("2026-10-17T11:00:00Z", NOW), "1h ago");
    assert.equal(formatWhen("2026-09-01T00:00:00Z", NOW), "Sep 1, 2026");
    const posts = [post("a", null), post("b", "a"), post("c", null)];
    assert.deepEqual(postsByParent(posts, null).map((item) => item.id), ["a", "c"]);
    assert.deepEqual(postsByParent(posts, "a").map((item) => item.id), ["b"]);
    assert.equal(previewText("one two", 3), "on…");
  });

  it("knows clip ids and ignores anything else", () => {
    assert.equal(isUuid("not-a-uuid"), false);
    assert.equal(isUuid("11111111-1111-4111-8111-111111111111"), true);
    assert.equal(isAllowedClipId(CLIP_DISCUSSION_IDS[0]), true);
    assert.equal(isAllowedClipId("twitch:nope"), false);
    assert.equal(clipScope("yt:uVXvTdaZFpo"), "clip:yt:uVXvTdaZFpo");
  });
});

describe("clip discussion ids", () => {
  it("allows comments on every playable clip in the catalog", () => {
    assert.ok(CLIP_DISCUSSION_IDS.length > 0);
    for (const id of CLIP_DISCUSSION_IDS) {
      assert.equal(isAllowedClipId(id), true, id);
      assert.equal(clipScope(id), `clip:${id}`);
    }
    assert.equal(isAllowedClipId("file:/clips/once-human-moving-base-v1.mp4"), false);
    assert.equal(CLIP_DISCUSSION_IDS.some((id) => id.startsWith("mp4:")), true);
  });
});

describe("discussion migration", () => {
  it("adds posts, reports, and bans the same way as the other schema files", () => {
    const sql = readFileSync(new URL("../../migrations/0005_discussion.sql", import.meta.url), "utf8");
    assert.match(sql, /create table if not exists discussion_post/i);
    assert.match(sql, /create table if not exists discussion_report/i);
    assert.match(sql, /create table if not exists discussion_ban/i);
    assert.match(sql, /unique \(post_id, reporter_id\)/i);
    assert.match(sql, /references discussion_post \(id\) on delete cascade/i);
  });

  it("creates the tables and enforces a unique report", async () => {
    const { PGlite } = await import("@electric-sql/pglite");
    const pg = new PGlite();
    await pg.waitReady;
    await pg.exec(readFileSync(new URL("../../migrations/0005_discussion.sql", import.meta.url), "utf8"));
    const id = "11111111-1111-4111-8111-111111111111";
    const reply = "22222222-2222-4222-8222-222222222222";
    await pg.query(
      "insert into discussion_post (id, scope, parent_id, root_id, author_id, title, body) values ($1, 'board', null, $1, 'fan', 'Raid night', 'Who is on?')",
      [id],
    );
    await pg.query(
      "insert into discussion_post (id, scope, parent_id, root_id, author_id, body) values ($1, 'board', $2, $2, 'other', 'I am')",
      [reply, id],
    );
    const depth = await pg.query<{ depth: number }>(
      `with recursive chain as (
        select id, parent_id, 1 as depth from discussion_post where id = $1
        union all
        select p.id, p.parent_id, chain.depth + 1 from discussion_post p
        join chain on p.id = chain.parent_id where chain.depth < 12
      ) select max(depth)::int as depth from chain`,
      [reply],
    );
    assert.equal(Number(depth.rows[0]?.depth), 2);
    await pg.query("insert into discussion_report (id, post_id, reporter_id, reason) values ($1, $2, 'fan', '')", [
      "33333333-3333-4333-8333-333333333333",
      id,
    ]);
    await assert.rejects(
      pg.query("insert into discussion_report (id, post_id, reporter_id, reason) values ($1, $2, 'fan', 'again')", [
        "44444444-4444-4444-8444-444444444444",
        id,
      ]),
    );
    await pg.close();
  });

  it("hides posts, records one strike per post, and stores a mute", async () => {
    const { PGlite } = await import("@electric-sql/pglite");
    const pg = new PGlite();
    await pg.waitReady;
    await pg.exec(readFileSync(new URL("../../migrations/0005_discussion.sql", import.meta.url), "utf8"));
    await pg.exec(readFileSync(new URL("../../migrations/0006_moderation.sql", import.meta.url), "utf8"));
    const id = "55555555-5555-4555-8555-555555555555";
    await pg.query(
      "insert into discussion_post (id, scope, parent_id, root_id, author_id, title, body, hidden_at, hidden_reason) values ($1, 'board', null, $1, 'fan', 'Held', 'bad', now(), 'language')",
      [id],
    );
    await pg.query("insert into discussion_strike (id, user_id, post_id, reason) values ($1, 'fan', $2, 'language')", [
      "66666666-6666-4666-8666-666666666666",
      id,
    ]);
    await assert.rejects(
      pg.query("insert into discussion_strike (id, user_id, post_id, reason) values ($1, 'fan', $2, 'reports')", [
        "77777777-7777-4777-8777-777777777777",
        id,
      ]),
    );
    const visible = await pg.query<{ n: number }>(
      "select count(*)::int as n from discussion_post where hidden_at is null",
    );
    assert.equal(Number(visible.rows[0]?.n), 0);
    await pg.query("insert into discussion_mute (user_id, until) values ('fan', now() + interval '24 hours')");
    const muted = await pg.query<{ n: number }>(
      "select count(*)::int as n from discussion_mute where user_id = 'fan' and until > now()",
    );
    assert.equal(Number(muted.rows[0]?.n), 1);
    await pg.close();
  });

  it("allows one live note per person per post and one rating each", async () => {
    const { PGlite } = await import("@electric-sql/pglite");
    const pg = new PGlite();
    await pg.waitReady;
    await pg.exec(readFileSync(new URL("../../migrations/0005_discussion.sql", import.meta.url), "utf8"));
    await pg.exec(readFileSync(new URL("../../migrations/0006_moderation.sql", import.meta.url), "utf8"));
    await pg.exec(readFileSync(new URL("../../migrations/0007_community_notes.sql", import.meta.url), "utf8"));
    const postId = "88888888-8888-4888-8888-888888888888";
    const noteId = "99999999-9999-4999-8999-999999999999";
    await pg.query(
      "insert into discussion_post (id, scope, parent_id, root_id, author_id, title, body) values ($1, 'board', null, $1, 'author', 'Raid', 'Who is on tonight for the raid?')",
      [postId],
    );
    await pg.query(
      "insert into discussion_note (id, post_id, author_id, body) values ($1, $2, 'fan', 'This raid was last week, not tonight.')",
      [noteId, postId],
    );
    await assert.rejects(
      pg.query(
        "insert into discussion_note (id, post_id, author_id, body) values ($1, $2, 'fan', 'A second note should not stick.')",
        ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", postId],
      ),
    );
    await pg.query("update discussion_note set deleted_at = now() where id = $1", [noteId]);
    await pg.query(
      "insert into discussion_note (id, post_id, author_id, body) values ($1, $2, 'fan', 'Rewritten after the first note was removed.')",
      ["bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", postId],
    );
    await pg.query(
      "insert into discussion_note_rating (id, note_id, rater_id, helpful) values ($1, $2, 'reader', true)",
      ["cccccccc-cccc-4ccc-8ccc-cccccccccccc", noteId],
    );
    await assert.rejects(
      pg.query(
        "insert into discussion_note_rating (id, note_id, rater_id, helpful) values ($1, $2, 'reader', false)",
        ["dddddddd-dddd-4ddd-8ddd-dddddddddddd", noteId],
      ),
    );
    await pg.close();
  });
});
