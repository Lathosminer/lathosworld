import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CLIPS,
  CLIP_DISCUSSION_IDS,
  FEATURED_COUNT,
  PLAYABLE_CLIPS,
  chicagoDateKey,
  clipDiscussionId,
  demonHunterIsListed,
  isPlayableClip,
  layoutDailyClips,
  pickFeatured,
  youtubeVideosPage,
  type Clip,
} from "./clips.ts";
import { YT_CHANNEL } from "./youtube-live.functions.ts";

const blue: Clip = {
  kind: "yt",
  id: "blue-screen-placeholder",
  title: "PS5 blue card",
  description: "Can't stream this screen.",
  game: "Menu",
  tags: ["ps5"],
  uploadDate: "2026-10-01T00:00:00Z",
  blocked: "ps5-blue",
};

function yt(id: string, game = "Once Human"): Clip {
  return {
    kind: "yt",
    id,
    title: id,
    description: id,
    game,
    tags: [game],
    uploadDate: "2026-10-01T00:00:00Z",
  };
}

function hunter(slug: string): Clip {
  return {
    kind: "twitch",
    slug,
    channel: "the_demon_hunter3",
    title: slug,
    description: slug,
    game: "ARC Raiders",
    tags: ["ARC Raiders"],
    poster: "/clips/example.webp",
    duration: "PT30S",
    uploadDate: "2026-10-09T05:32:05Z",
  };
}

describe("youtube archive", () => {
  it("points at the videos tab for the channel the site already uses", () => {
    assert.equal(YT_CHANNEL, "UCcV1q2gBovKyWlU8SnCI3ww");
    assert.equal(youtubeVideosPage(YT_CHANNEL), "https://www.youtube.com/channel/UCcV1q2gBovKyWlU8SnCI3ww/videos");
  });
});

describe("chicago date key", () => {
  it("rolls the featured day at midnight Central", () => {
    assert.equal(chicagoDateKey(new Date("2026-10-17T04:59:00Z")), "2026-10-16");
    assert.equal(chicagoDateKey(new Date("2026-10-17T05:00:00Z")), "2026-10-17");
    assert.equal(chicagoDateKey(new Date("2026-01-15T05:59:00Z")), "2026-01-14");
    assert.equal(chicagoDateKey(new Date("2026-01-15T06:00:00Z")), "2026-01-15");
  });
});

describe("daily clip rotation", () => {
  it("keeps the catalog free of PS5 blue placeholders and gives each clip one discussion id", () => {
    assert.equal(demonHunterIsListed(), true);
    assert.equal(CLIPS.every(isPlayableClip), true);
    assert.equal(new Set(CLIP_DISCUSSION_IDS).size, CLIP_DISCUSSION_IDS.length);
    assert.deepEqual(CLIP_DISCUSSION_IDS, PLAYABLE_CLIPS.map(clipDiscussionId));
  });

  it("picks the same six for a date, and a different set on another day when the list is longer", () => {
    const pool = Array.from({ length: 12 }, (_, index) => yt(`clip-${index}`));
    const first = pickFeatured(pool, "2026-10-17").map(clipDiscussionId);
    const again = pickFeatured(pool, "2026-10-17").map(clipDiscussionId);
    assert.deepEqual(again, first);
    assert.equal(first.length, FEATURED_COUNT);
    const sets = new Set<string>();
    for (let day = 1; day <= 28; day++) {
      const key = `2026-10-${String(day).padStart(2, "0")}`;
      sets.add(pickFeatured(pool, key).map(clipDiscussionId).join("|"));
    }
    assert.ok(sets.size > 1);
  });

  it("locks the 2026-10-17 featured order for the live catalog", () => {
    const layout = layoutDailyClips(CLIPS, "2026-10-17");
    assert.deepEqual(
      [...layout.lead, ...layout.rest].map(clipDiscussionId),
      [
        "twitch:CrepuscularDifferentHawkTBTacoRight-SJ_rYvnelqtp_0N8",
        "twitch:DignifiedUgliestArmadilloTwitchRPG-n9yOfV6fiIcWsBMM",
        "yt:uVXvTdaZFpo",
        "mp4:/clips/once-human-moving-base-v1.mp4",
      ],
    );
  });

  it("drops blue placeholders and splits the rest into featured plus archive", () => {
    const pool = [blue, ...Array.from({ length: 8 }, (_, index) => yt(`keep-${index}`))];
    const layout = layoutDailyClips(pool, "2026-06-01");
    const shown = [...layout.lead, ...layout.rest, ...layout.archive];
    assert.equal(shown.some((clip) => clip.blocked === "ps5-blue"), false);
    assert.equal(layout.lead.length + layout.rest.length, FEATURED_COUNT);
    assert.equal(shown.length, 8);
    const ids = shown.map(clipDiscussionId);
    assert.equal(new Set(ids).size, ids.length);
  });

  it("puts the shoutout under Demon Hunter clips only when one of them is featured", () => {
    const pool = [yt("solo-a"), yt("solo-b"), hunter("hunter-night"), yt("solo-c")];
    let underHunter = 0;
    let underGrid = 0;
    for (let day = 1; day <= 24; day++) {
      const layout = layoutDailyClips(pool, `2026-03-${String(day).padStart(2, "0")}`, 2);
      if (layout.lead.length > 0) {
        underHunter += 1;
        assert.equal(layout.shoutout, "under-demon-hunter");
        assert.equal(layout.lead.every((clip) => clip.kind === "twitch" && clip.channel === "the_demon_hunter3"), true);
      } else {
        underGrid += 1;
        assert.equal(layout.shoutout, "under-featured");
      }
      assert.equal(layout.archive.some((clip) => clip.blocked === "ps5-blue"), false);
    }
    assert.ok(underHunter > 0);
    assert.ok(underGrid > 0);
  });
});
