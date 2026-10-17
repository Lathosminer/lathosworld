import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EMPTY_COMMUNITY,
  hasCommunity,
  parseTwitchFollowers,
  parseXFollowers,
  parseYouTubeSubscribers,
} from "./community.ts";

describe("community parsers", () => {
  it("hides an empty payload", () => {
    assert.equal(hasCommunity(EMPTY_COMMUNITY), false);
    assert.equal(hasCommunity(null), false);
  });

  it("keeps a twitch total and display names, not user ids", () => {
    const parsed = parseTwitchFollowers({
      total: 12,
      data: [
        { user_id: "999", user_login: "nova", user_name: "Nova", followed_at: "2026-10-01T00:00:00Z" },
        { user_id: "1", user_name: "", user_login: "quiet" },
      ],
    });
    assert.equal(parsed.total, 12);
    assert.deepEqual(parsed.recent, [
      { name: "Nova", followedAt: "2026-10-01T00:00:00Z" },
      { name: "quiet", followedAt: "" },
    ]);
    assert.equal(JSON.stringify(parsed).includes("999"), false);
  });

  it("drops a hidden YouTube subscriber count", () => {
    assert.equal(
      parseYouTubeSubscribers({ items: [{ statistics: { hiddenSubscriberCount: true, subscriberCount: "10" } }] }),
      null,
    );
    assert.equal(parseYouTubeSubscribers({ items: [{ statistics: { subscriberCount: "3481" } }] }), 3481);
  });

  it("reads an X follower count", () => {
    assert.equal(parseXFollowers({ data: { public_metrics: { followers_count: 80 } } }), 80);
    assert.equal(parseXFollowers({}), null);
  });
});
