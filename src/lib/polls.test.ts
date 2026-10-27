import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  POLL_BANK,
  chicagoWeekKey,
  pollPercents,
  rotationChoice,
  validatePoll,
} from "./polls.ts";

/**
 * Stand-in for a blocked choice. Built from character codes so the source
 * stays a neutral token. The leet fold still treats it as a slur, so the
 * poll is held the same way.
 */
function blockedChoiceToken(): string {
  return String.fromCharCode(121, 111, 117, 32, 110, 49, 103, 103, 101, 114);
}

describe("community polls", () => {
  it("keeps a bank of thirty questions with real choices", () => {
    assert.equal(POLL_BANK.length, 30);
    const ids = new Set(POLL_BANK.map((poll) => poll.id));
    assert.equal(ids.size, 30);
    for (const poll of POLL_BANK) {
      assert.ok(poll.options.length >= 2 && poll.options.length <= 4, poll.id);
      const checked = validatePoll(poll.question, [...poll.options]);
      assert.equal(checked.ok, true, poll.id);
      if (checked.ok) assert.equal(checked.hold, false, poll.question);
    }
  });

  it("rotates on Monday only when an approved poll is waiting", () => {
    assert.equal(chicagoWeekKey("2026-10-12"), "2026-10-12");
    assert.equal(chicagoWeekKey("2026-10-17"), "2026-10-12");
    assert.equal(chicagoWeekKey("2026-10-18"), "2026-10-12");
    assert.equal(chicagoWeekKey("2026-10-11"), "2026-10-05");
    assert.equal(chicagoWeekKey("2026-10-19"), "2026-10-19");
    const live = { id: "live", weekKey: "2026-10-12" };
    assert.deepEqual(rotationChoice({ weekKey: "2026-10-19", current: live, nextApprovedId: null }), {
      action: "keep",
      pollId: "live",
    });
    assert.deepEqual(rotationChoice({ weekKey: "2026-10-19", current: live, nextApprovedId: "next" }), {
      action: "feature",
      pollId: "next",
      closeId: "live",
    });
    assert.deepEqual(rotationChoice({ weekKey: "2026-10-12", current: live, nextApprovedId: "next" }), {
      action: "keep",
      pollId: "live",
    });
    assert.deepEqual(rotationChoice({ weekKey: "2026-10-12", current: null, nextApprovedId: "next" }), {
      action: "feature",
      pollId: "next",
      closeId: null,
    });
    assert.deepEqual(rotationChoice({ weekKey: "2026-10-12", current: null, nextApprovedId: null }), {
      action: "none",
    });
  });

  it("publishes opinions and holds only a slur, threat, or spam", () => {
    const politics = validatePoll("Trump and Biden can both get fucked, who is worse?", ["Trump", "Biden", "The patch notes"]);
    assert.equal(politics.ok, true);
    if (politics.ok) assert.equal(politics.hold, false);
    const topic = validatePoll("Was that rape scene necessary?", ["No", "It served the story"]);
    assert.equal(topic.ok, true);
    if (topic.ok) assert.equal(topic.hold, false);
    const idiom = validatePoll("Is there a chink in his armor?", ["Yes", "No"]);
    assert.equal(idiom.ok, true);
    if (idiom.ok) assert.equal(idiom.hold, false);
    const slur = validatePoll("Best vault hunter?", ["Maya", blockedChoiceToken()]);
    assert.equal(slur.ok, true);
    if (slur.ok) assert.equal(slur.hold, true);
    const threat = validatePoll("What should we tell the raid lead?", ["gg", "kill yourself"]);
    assert.equal(threat.ok, true);
    if (threat.ok) assert.equal(threat.hold, true);
    assert.equal(validatePoll("Pick one", ["Only one"]).ok, false);
    assert.equal(validatePoll("Which link spam wins the poll today?", ["https://a.test", "https://b.test", "https://c.test"]).ok, false);
    assert.deepEqual(pollPercents([1, 1]), [50, 50]);
    assert.deepEqual(pollPercents([0, 0]), [0, 0]);
  });
});

describe("poll migration", () => {
  it("stores one vote per person", async () => {
    const { PGlite } = await import("@electric-sql/pglite");
    const pg = new PGlite();
    await pg.waitReady;
    await pg.exec(readFileSync(new URL("../../migrations/0009_polls.sql", import.meta.url), "utf8"));
    await pg.exec(readFileSync(new URL("../../migrations/0010_poll_approval.sql", import.meta.url), "utf8"));
    await pg.query(
      "insert into discussion_poll (id, week_key, question, status, featured) values ('poll-1', '2026-10-12', 'Swords or guns?', 'open', true)",
    );
    await pg.query(
      "insert into discussion_poll_option (id, poll_id, label, position) values ('opt-a', 'poll-1', 'Swords', 0), ('opt-b', 'poll-1', 'Guns', 1)",
    );
    await pg.query("insert into discussion_poll_vote (poll_id, user_id, option_id) values ('poll-1', 'fan', 'opt-a')");
    await assert.rejects(
      pg.query("insert into discussion_poll_vote (poll_id, user_id, option_id) values ('poll-1', 'fan', 'opt-b')"),
    );
    await pg.query(
      "insert into discussion_poll_vote (poll_id, user_id, option_id) values ('poll-1', 'fan', 'opt-a') on conflict (poll_id, user_id) do update set option_id = excluded.option_id",
    );
    const votes = await pg.query<{ n: number; option_id: string }>(
      "select count(*)::int as n, max(option_id) as option_id from discussion_poll_vote where poll_id = 'poll-1'",
    );
    assert.equal(Number(votes.rows[0]?.n), 1);
    await pg.query(
      "insert into discussion_poll (id, question, status, featured) values ('poll-pending', 'Best snack?', 'pending', false)",
    );
    await pg.query(
      "insert into discussion_poll (id, question, status, featured, approved_at) values ('poll-ok', 'Swords or guns tonight?', 'approved', false, now())",
    );
    await assert.rejects(
      pg.query("insert into discussion_poll (id, question, status) values ('poll-bad', 'Nope question', 'draft')"),
    );
    await pg.close();
  });
});
