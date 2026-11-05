import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { SOCIALS } from "./socials.ts";
import {
  ALBUMS,
  ARTIST,
  FEATURED_ARTIST,
  LEAD_TRACK_ID,
  LEXI_ARTIST,
  PREVIEW_SECONDS,
  SINGLES,
  TRACKS,
} from "./music.ts";

const lead = TRACKS[0];
const root = path.resolve(import.meta.dirname, "../..");

const LINKS: Record<string, { spotify?: string; youtubeMusic?: string; appleMusic?: string }> = {
  hope: {
    youtubeMusic: "https://music.youtube.com/watch?v=YdU75FEjzb8",
    appleMusic: "https://music.apple.com/us/album/hope/6828049260?i=6828049261",
  },
  "slow-motion": {
    youtubeMusic: "https://music.youtube.com/watch?v=T3zfGwkHVRQ",
    appleMusic: "https://music.apple.com/us/album/slow-motion/6828049260?i=6828049264",
  },
  life: {
    youtubeMusic: "https://music.youtube.com/watch?v=d1xAoQkvW1w",
    appleMusic: "https://music.apple.com/us/album/life-feat-lexi-storm/6828751394?i=6828751395",
  },
  "no-one-can-help-me-except": {
    spotify: "https://open.spotify.com/track/5Qg0LfJ3iQqBHI9VKrRyXy",
    youtubeMusic: "https://music.youtube.com/watch?v=k1u5OWdhyp8",
    appleMusic:
      "https://music.apple.com/us/album/no-one-can-help-me-except-feat-lexi-storm/6826919523?i=6826919524",
  },
  "blame-me": {
    youtubeMusic: "https://music.youtube.com/watch?v=Baf6z71AZhg",
  },
  "deeper-than-the-ocean": {
    spotify: "https://open.spotify.com/track/3q2L3B1M5qFlyriDJPaJLC",
    youtubeMusic: "https://music.youtube.com/watch?v=PDzZ83GJisg",
    appleMusic:
      "https://music.apple.com/us/album/deeper-than-the-ocean-feat-lexi-storm/6826906332?i=6826906333",
  },
  "i-carry-you-with-me": {
    spotify: "https://open.spotify.com/track/4rh58G5faPCA9U4ZQlmhjI",
    youtubeMusic: "https://music.youtube.com/watch?v=RTK3rHUT1io",
    appleMusic:
      "https://music.apple.com/us/album/i-carry-you-with-me-feat-lexi-storm/6828063294?i=6828063295",
  },
  "i-carry-you-with-me-esme": {
    youtubeMusic: "https://music.youtube.com/watch?v=PJkYS22r0gs",
    appleMusic:
      "https://music.apple.com/us/album/i-carry-you-with-me-esme-version/6827958045?i=6827958046",
  },
  "lost-treasure": {
    spotify: "https://open.spotify.com/track/3JlctyW268MNhJDql1EbMt",
    youtubeMusic: "https://music.youtube.com/watch?v=CntmN_O-LVE",
  },
  "lost-treasure-remastered": {
    spotify: "https://open.spotify.com/track/1ls2YWImVEGxApCA4sD32s",
    youtubeMusic: "https://music.youtube.com/watch?v=PH8s6r3CXmA",
    appleMusic: "https://music.apple.com/us/album/lost-treasure-remastered/6828730942?i=6828730943",
  },
  "the-light": {
    spotify: "https://open.spotify.com/track/70P5jEYtsatx2yL6cF4gBI",
    youtubeMusic: "https://music.youtube.com/watch?v=_l65eq_LizE",
    appleMusic:
      "https://music.apple.com/us/album/the-light-feat-lexi-storm/6826906074?i=6826906075",
  },
  why: {
    youtubeMusic: "https://music.youtube.com/watch?v=3pGvs78SB1I",
    appleMusic: "https://music.apple.com/us/album/why-feat-lexi-storm/6826906074?i=6826906406",
  },
  "life-heavy-metal": {
    spotify: "https://open.spotify.com/track/6JBZzBFQhBMtwNpAotLl27",
    youtubeMusic: "https://music.youtube.com/watch?v=8Khjx7fuOZs",
    appleMusic: "https://music.apple.com/us/album/life-heavy-metal/6828751691?i=6828751692",
  },
  "hope-life-and-light": {
    spotify: "https://open.spotify.com/track/148gZ0UUihqCvaxkpNpUhI",
    youtubeMusic: "https://music.youtube.com/watch?v=wmIn31RVsVs",
    appleMusic:
      "https://music.apple.com/us/album/hope-life-and-light-heavy-metal/6828752065?i=6828752066",
  },
  "hope-life-and-light-short": {
    spotify: "https://open.spotify.com/track/2bA8jtr6ZsJ39GzxJ2BLSE",
    youtubeMusic: "https://music.youtube.com/watch?v=LM04vMyc5bo",
    appleMusic:
      "https://music.apple.com/us/album/hope-life-and-light-heavy-metal-short-version/6828752065?i=6828752067",
  },
};

describe("catalog", () => {
  it("opens with Hope and keeps albums empty", () => {
    assert.deepEqual(
      TRACKS.map((track) => track.title),
      [
        "Hope",
        "Slow Motion",
        "Life (feat. Lexi Storm)",
        "No One Can Help Me Except (feat. Lexi Storm)",
        "Blame Me",
        "Deeper Than the Ocean (feat. Lexi Storm)",
        "I Carry You With Me (feat. Lexi Storm)",
        "I Carry You With Me (Esme Version)",
        "Lost Treasure (feat. Lexi Storm)",
        "Lost Treasure (Remastered)",
        "The Light",
        "Why",
        "Life (Heavy Metal)",
        "Hope, Life and Light (Heavy Metal)",
        "Hope, Life and Light (Heavy Metal, Short Version)",
      ],
    );
    assert.equal(lead?.artist, LEXI_ARTIST);
    assert.equal(LEAD_TRACK_ID, lead?.id);
    assert.equal(ALBUMS.length, 0);
    assert.equal(TRACKS.length, SINGLES.length);
    assert.equal(TRACKS.length, 15);
    assert.equal(PREVIEW_SECONDS, 30);
  });

  it("credits Lexi Storm on her singles and LathosWorld on the rest", () => {
    const lexi = TRACKS.filter((track) => track.artist === LEXI_ARTIST).map((track) => track.title);
    assert.deepEqual(lexi, ["Hope", "Slow Motion", "Blame Me"]);
    assert.equal(TRACKS.filter((track) => track.artist === ARTIST).length, 12);
    assert.equal(FEATURED_ARTIST.role, "AI character");
    assert.equal(FEATURED_ARTIST.youtube, "https://www.youtube.com/@lexistormai");
    assert.equal(FEATURED_ARTIST.youtubeLabel, "Watch Lexi Storm on YouTube");
    assert.notEqual(FEATURED_ARTIST.youtube, SOCIALS.find((item) => item.name === "YouTube")?.href);
    assert.equal(FEATURED_ARTIST.youtube.includes("@lathos563"), false);
    assert.equal(FEATURED_ARTIST.youtube.includes("UCcV1q2gBovKyWlU8SnCI3ww"), false);
  });

  it("uses checked streaming links and a short preview, with no master URL", () => {
    const blob = JSON.stringify({ TRACKS, FEATURED_ARTIST, SINGLES });
    assert.equal(/\.wav/i.test(blob), false);
    assert.equal(blob.includes("download=1"), false);
    assert.equal(blob.includes("/music/"), false);
    assert.equal(/jared/i.test(blob), false);
    const ids = new Set<string>();
    for (const track of TRACKS) {
      assert.equal(ids.has(track.id), false);
      ids.add(track.id);
      assert.equal(track.preview, `/previews/${track.id}.mp3`);
      const expected = LINKS[track.id];
      assert.ok(expected, track.id);
      assert.equal(track.spotify, expected.spotify);
      assert.equal(track.youtubeMusic, expected.youtubeMusic);
      assert.equal(track.appleMusic, expected.appleMusic);
      assert.ok(track.youtubeMusic);
      const file = path.join(root, "public", "previews", `${track.id}.mp3`);
      const stat = fs.statSync(file);
      const header = fs.readFileSync(file).subarray(0, 2);
      assert.equal(header[0], 0xff);
      assert.ok(stat.size > 50_000 && stat.size < 500_000, `${track.id} is not a short preview`);
    }
    assert.equal(
      TRACKS.filter((track) => !track.spotify)
        .map((track) => track.title)
        .join("|"),
      [
        "Hope",
        "Slow Motion",
        "Life (feat. Lexi Storm)",
        "Blame Me",
        "I Carry You With Me (Esme Version)",
        "Why",
      ].join("|"),
    );
    assert.equal(
      TRACKS.filter((track) => !track.appleMusic)
        .map((track) => track.title)
        .join("|"),
      ["Blame Me", "Lost Treasure (feat. Lexi Storm)"].join("|"),
    );
  });
});
