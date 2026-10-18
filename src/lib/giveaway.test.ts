import { test } from "node:test";
import assert from "node:assert/strict";
import {
  COMMENT_ENTRIES_PER_DAY,
  GIVEAWAY_ENDS_AT,
  NEVER_DM_LINE,
  breakdown,
  chicagoDay,
  commentEntriesByAuthor,
  commentEntriesFromDays,
  followEntries,
  giveawayState,
  normalizeTikTokHandle,
  normalizeXHandle,
  normalizeYouTubeHandle,
  pickWeighted,
  cryptoRandomInt,
  toCsv,
  CLAIM_DAYS,
  MAX_ENTRIES_PER_PERSON,
  PRIZE_TIERS,
  PRIZE_TOTAL,
  WINNER_COUNT,
  TICKER_SUFFIX,
  claimDeadline,
  effectiveClaim,
  exclusionKey,
  tickerName,
  xPostId,
  type EntryStatuses,
} from "./giveaway.ts";

const none: EntryStatuses = { twitch: "none", youtube: "none", x: "none", xRepost: "none", tiktok: "none" };

test("end date is 2027-07-09 23:59 Chicago (CDT)", () => {
  assert.equal(new Date(GIVEAWAY_ENDS_AT).toISOString(), "2027-07-10T04:59:00.000Z");
  assert.equal(chicagoDay(GIVEAWAY_ENDS_AT), "2027-07-09");
});

test("hidden unless GIVEAWAY_OPEN is exactly true", () => {
  const before = Date.parse("2026-11-01T00:00:00Z");
  assert.equal(giveawayState(undefined, before), "hidden");
  assert.equal(giveawayState("", before), "hidden");
  assert.equal(giveawayState("false", before), "hidden");
  assert.equal(giveawayState("1", before), "hidden");
  assert.equal(giveawayState("true", before), "open");
  assert.equal(giveawayState(" TRUE ", before), "open");
  assert.equal(giveawayState("true", Date.parse("2027-02-01T06:00:00Z")), "open");
  assert.equal(giveawayState("true", Date.parse("2027-07-10T04:58:59Z")), "open");
  assert.equal(giveawayState("true", Date.parse("2027-07-10T05:00:00Z")), "ended");
});

test("one entry per platform, pending and self-reported count", () => {
  assert.equal(followEntries(none), 0);
  const all: EntryStatuses = { twitch: "verified", youtube: "self_reported", x: "pending", xRepost: "pending", tiktok: "unverified" };
  assert.equal(followEntries(all), 5);
  assert.equal(followEntries(all, true), 1);
  assert.equal(followEntries({ ...none, twitch: "not_following", youtube: "not_subscribed", tiktok: "rejected" }), 0);
});

test("repost bonus needs an X entry", () => {
  assert.equal(followEntries({ ...none, xRepost: "pending" }), 0);
  assert.equal(followEntries({ ...none, x: "rejected", xRepost: "verified" }), 0);
  assert.equal(followEntries({ ...none, x: "not_following", xRepost: "verified" }), 1);
});

test("comment entries are capped per Chicago day", () => {
  assert.equal(COMMENT_ENTRIES_PER_DAY, 1);
  assert.equal(commentEntriesFromDays([3, 1, 0, 5]), 3);
  assert.equal(commentEntriesFromDays([3, 1, 5], 2), 5);
  // 11pm and 1am Chicago on the same UTC date are different Chicago days.
  assert.equal(chicagoDay("2026-11-02T04:30:00Z"), "2026-11-01");
  assert.equal(chicagoDay("2026-11-02T07:30:00Z"), "2026-11-02");
  const map = commentEntriesByAuthor([
    { authorId: "a", createdAt: "2026-11-02T04:30:00Z" },
    { authorId: "a", createdAt: "2026-11-02T04:40:00Z" },
    { authorId: "a", createdAt: "2026-11-02T07:30:00Z" },
    { authorId: "b", createdAt: "2026-11-02T07:30:00Z" },
    { authorId: "b", createdAt: "2027-07-11T00:00:00Z" },
  ]);
  assert.equal(map.get("a"), 2);
  assert.equal(map.get("b"), 1);
  assert.deepEqual(breakdown({ ...none, twitch: "verified" }, 2), { follows: 1, comments: 2, total: 3, capped: false });
});

test("handles normalize and reject junk", () => {
  assert.deepEqual(normalizeXHandle("@Lathos563"), { ok: true, handle: "Lathos563" });
  assert.deepEqual(normalizeXHandle("https://x.com/someone?s=20"), { ok: true, handle: "someone" });
  assert.equal(normalizeXHandle("way_too_long_handle_here").ok, false);
  assert.equal(normalizeXHandle("bad handle").ok, false);
  assert.deepEqual(normalizeTikTokHandle("https://www.tiktok.com/@lathos.world"), { ok: true, handle: "lathos.world" });
  assert.equal(normalizeTikTokHandle("<script>").ok, false);
  assert.deepEqual(normalizeYouTubeHandle("https://www.youtube.com/@lathos563"), { ok: true, handle: "@lathos563" });
});

test("x post id from links", () => {
  assert.equal(xPostId("https://x.com/lathos563/status/1234567890123?s=20"), "1234567890123");
  assert.equal(xPostId("1234567890123"), "1234567890123");
  assert.equal(xPostId("https://example.com"), null);
});

test("weighted draw follows the tickets", () => {
  const people = [
    { id: "a", weight: 1 },
    { id: "b", weight: 0 },
    { id: "c", weight: 3 },
  ];
  assert.equal(pickWeighted(people, () => 0)?.id, "a");
  assert.equal(pickWeighted(people, () => 1)?.id, "c");
  assert.equal(pickWeighted(people, () => 3)?.id, "c");
  assert.equal(pickWeighted([{ id: "z", weight: 0 }], () => 0), null);
  const counts = { a: 0, c: 0 } as Record<string, number>;
  for (let i = 0; i < 4000; i += 1) counts[pickWeighted(people, cryptoRandomInt)!.id]! += 1;
  assert.ok(counts.c! > counts.a! * 2, `c should win ~3x as often as a (${counts.c} vs ${counts.a})`);
  for (let i = 0; i < 200; i += 1) {
    const n = cryptoRandomInt(7);
    assert.ok(n >= 0 && n < 7);
  }
});

test("csv escapes quotes and formulas", () => {
  const csv = toCsv(["a", "b"], [["=1+1", 'say "hi", ok']]);
  assert.equal(csv, `a,b\r\n'=1+1,"say ""hi"", ok"\r\n`);
});

test("required safety line", () => {
  assert.equal(NEVER_DM_LINE, "I'll never DM you first. Official info only at lathosworld.com");
});

test("prize tiers add up to one million across 7 winners", () => {
  assert.equal(PRIZE_TOTAL, 1_000_000);
  assert.equal(WINNER_COUNT, 7);
  assert.deepEqual(PRIZE_TIERS.map((t) => t.amount), [500_000, 250_000, 50_000]);
});

test("entries are capped at 10 per person", () => {
  assert.equal(MAX_ENTRIES_PER_PERSON, 10);
  const all: EntryStatuses = { twitch: "verified", youtube: "verified", x: "verified", xRepost: "verified", tiktok: "verified" };
  assert.deepEqual(breakdown(all, 9), { follows: 5, comments: 9, total: 10, capped: true });
  assert.deepEqual(breakdown(all, 5), { follows: 5, comments: 5, total: 10, capped: false });
});

test("claim window is 7 days and expires on its own", () => {
  assert.equal(CLAIM_DAYS, 7);
  const drawn = "2027-02-05T02:00:00.000Z";
  assert.equal(new Date(claimDeadline(drawn)).toISOString(), "2027-02-12T02:00:00.000Z");
  assert.equal(effectiveClaim("waiting", drawn, Date.parse("2027-02-11T00:00:00Z")), "waiting");
  assert.equal(effectiveClaim("waiting", drawn, Date.parse("2027-02-13T00:00:00Z")), "expired");
  assert.equal(effectiveClaim("claimed", drawn, Date.parse("2027-03-01T00:00:00Z")), "claimed");
});

test("exclusion keys normalize", () => {
  assert.equal(exclusionKey(" @MomAccount "), "momaccount");
  assert.equal(exclusionKey("Mom@Example.com"), "mom@example.com");
  assert.equal(exclusionKey(""), null);
  assert.equal(exclusionKey("two words"), null);
});

test("ticker never shows an email", () => {
  assert.equal(TICKER_SUFFIX, "has entered the LathosWorld Million Token Giveaway!");
  assert.equal(tickerName("Dinkle Fan"), "Dinkle Fan");
  assert.equal(tickerName("someone@gmail.com", "@someone_x"), "@someone_x");
  assert.equal(tickerName("someone@gmail.com", "other@mail.com"), null);
  assert.equal(tickerName("  bad\u0007name  "), "badname");
});
