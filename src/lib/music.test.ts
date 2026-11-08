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
  YOUTUBE_MUSIC_PLAYLIST,
} from "./music.ts";

const root = path.resolve(import.meta.dirname, "../..");

type Expectation = {
  title: string;
  artist: string;
  duration?: string;
  released?: string;
  album?: string;
  preview?: boolean;
  spotify?: string;
  youtubeMusic?: string;
  youtube?: string;
  appleMusic?: string;
};

const EXPECTED: Expectation[] = [
  {
    title: "Silk in the Static",
    artist: ARTIST,
    duration: "3:08",
    released: "2026-11-07",
    spotify: "https://open.spotify.com/track/2aNjroKhgsX4o5Itiq3sCM",
    appleMusic: "https://music.apple.com/us/album/silk-in-the-static/6832024154?i=6832024155",
  },
  {
    title: "Ghost in the Mix",
    artist: ARTIST,
    duration: "3:09",
    released: "2026-11-07",
    spotify: "https://open.spotify.com/track/1OQXBNqCcYk71MRboRcafJ",
    appleMusic: "https://music.apple.com/us/album/ghost-in-the-mix/6832085789?i=6832085790",
  },
  {
    title: "Shape of Us",
    artist: ARTIST,
    duration: "2:07",
    released: "2026-11-07",
    album: "Shape of Us",
    spotify: "https://open.spotify.com/track/2nA9nHNO47dP5QnyU7Cz0C",
    appleMusic: "https://music.apple.com/us/album/shape-of-us/6831960552?i=6831960556",
  },
  {
    title: "The Test of Time",
    artist: ARTIST,
    duration: "3:08",
    released: "2026-11-07",
    album: "Shape of Us",
    spotify: "https://open.spotify.com/track/5YS1VNtA0hrMntMQMRBQ4s",
    appleMusic: "https://music.apple.com/us/album/the-test-of-time/6831960552?i=6831960553",
  },
  {
    title: "Love Me in Slow Motion",
    artist: LEXI_ARTIST,
    youtube: "https://www.youtube.com/watch?v=wMiu9W3uK04",
  },
  { title: "Ghosted", artist: LEXI_ARTIST },
  {
    title: "After Me",
    artist: ARTIST,
    duration: "2:31",
    released: "2026-10-30",
    spotify: "https://open.spotify.com/track/7cVE9GAVIYSYwMDtcH8qG4",
    appleMusic: "https://music.apple.com/us/album/after-me/6829110913?i=6829110914",
  },
  {
    title: "After Me (Alternate Version)",
    artist: ARTIST,
    duration: "2:11",
    released: "2026-10-30",
    album: "After Me",
    appleMusic:
      "https://music.apple.com/us/album/after-me-alternate-version/6829110913?i=6829110915",
  },
  {
    title: "Hope, Life and Light (Heavy Metal)",
    artist: ARTIST,
    duration: "3:27",
    released: "2026-10-30",
    preview: true,
    spotify: "https://open.spotify.com/track/148gZ0UUihqCvaxkpNpUhI",
    youtubeMusic: "https://music.youtube.com/watch?v=wmIn31RVsVs",
    appleMusic:
      "https://music.apple.com/us/album/hope-life-and-light-heavy-metal/6828752065?i=6828752066",
  },
  {
    title: "Hope, Life and Light (Heavy Metal, Short Version)",
    artist: ARTIST,
    duration: "3:04",
    released: "2026-10-30",
    preview: true,
    spotify: "https://open.spotify.com/track/2bA8jtr6ZsJ39GzxJ2BLSE",
    youtubeMusic: "https://music.youtube.com/watch?v=LM04vMyc5bo",
    appleMusic:
      "https://music.apple.com/us/album/hope-life-and-light-heavy-metal-short-version/6828752065?i=6828752067",
  },
  {
    title: "Life (feat. Lexi Storm)",
    artist: ARTIST,
    duration: "3:46",
    released: "2026-10-29",
    preview: true,
    spotify: "https://open.spotify.com/track/4CA3ZnfDTRD9kfvvf2WYVH",
    youtubeMusic: "https://music.youtube.com/watch?v=d1xAoQkvW1w",
    appleMusic: "https://music.apple.com/us/album/life-feat-lexi-storm/6828751394?i=6828751395",
  },
  {
    title: "Life (Heavy Metal)",
    artist: ARTIST,
    duration: "3:47",
    released: "2026-10-29",
    preview: true,
    spotify: "https://open.spotify.com/track/6JBZzBFQhBMtwNpAotLl27",
    youtubeMusic: "https://music.youtube.com/watch?v=8Khjx7fuOZs",
    appleMusic: "https://music.apple.com/us/album/life-heavy-metal/6828751691?i=6828751692",
  },
  {
    title: "Lost Treasure (Remastered)",
    artist: ARTIST,
    duration: "4:42",
    released: "2026-10-29",
    preview: true,
    spotify: "https://open.spotify.com/track/1ls2YWImVEGxApCA4sD32s",
    youtubeMusic: "https://music.youtube.com/watch?v=PH8s6r3CXmA",
    appleMusic: "https://music.apple.com/us/album/lost-treasure-remastered/6828730942?i=6828730943",
  },
  {
    title: "Hope",
    artist: LEXI_ARTIST,
    duration: "3:17",
    released: "2026-10-28",
    album: "Volume Two",
    preview: true,
    spotify: "https://open.spotify.com/track/4apD6uEFjtlvWCw2tFBXQk",
    youtubeMusic: "https://music.youtube.com/watch?v=YdU75FEjzb8",
    appleMusic: "https://music.apple.com/us/album/hope/6828049260?i=6828049261",
  },
  {
    title: "Light It Up",
    artist: LEXI_ARTIST,
    duration: "3:04",
    released: "2026-10-28",
    album: "Volume Two",
    appleMusic: "https://music.apple.com/us/album/light-it-up/6828049260?i=6828049263",
  },
  {
    title: "Slow Motion",
    artist: LEXI_ARTIST,
    duration: "2:46",
    released: "2026-10-28",
    album: "Volume Two",
    preview: true,
    youtubeMusic: "https://music.youtube.com/watch?v=T3zfGwkHVRQ",
    appleMusic: "https://music.apple.com/us/album/slow-motion/6828049260?i=6828049264",
  },
  {
    title: "Love Me",
    artist: LEXI_ARTIST,
    duration: "2:34",
    released: "2026-10-28",
    album: "Volume Two",
    spotify: "https://open.spotify.com/track/2v8WyqD0l5jjf6PdyD9saj",
    appleMusic: "https://music.apple.com/us/album/love-me/6828049260?i=6828049265",
  },
  {
    title: "What Happened to You and I",
    artist: LEXI_ARTIST,
    duration: "3:07",
    released: "2026-10-28",
    album: "Volume Two",
    appleMusic:
      "https://music.apple.com/us/album/what-happened-to-you-and-i/6828049260?i=6828049266",
  },
  {
    title: "Some Day",
    artist: LEXI_ARTIST,
    duration: "3:24",
    released: "2026-10-28",
    album: "Volume Two",
    appleMusic: "https://music.apple.com/us/album/some-day/6828049260?i=6828049267",
  },
  {
    title: "Turns You Never Said",
    artist: LEXI_ARTIST,
    duration: "3:04",
    released: "2026-10-28",
    album: "Volume Two",
    appleMusic: "https://music.apple.com/us/album/turns-you-never-said/6828049260?i=6828049269",
  },
  {
    title: "A Place",
    artist: LEXI_ARTIST,
    duration: "3:29",
    released: "2026-10-28",
    album: "Volume Two",
    appleMusic: "https://music.apple.com/us/album/a-place/6828049260?i=6828049271",
  },
  {
    title: "I Carry You With Me (feat. Lexi Storm)",
    artist: ARTIST,
    duration: "2:04",
    released: "2026-10-28",
    preview: true,
    spotify: "https://open.spotify.com/track/4rh58G5faPCA9U4ZQlmhjI",
    youtubeMusic: "https://music.youtube.com/watch?v=RTK3rHUT1io",
    appleMusic:
      "https://music.apple.com/us/album/i-carry-you-with-me-feat-lexi-storm/6828063294?i=6828063295",
  },
  {
    title: "I Carry You With Me (Esme Version)",
    artist: ARTIST,
    duration: "1:49",
    released: "2026-10-28",
    preview: true,
    youtubeMusic: "https://music.youtube.com/watch?v=PJkYS22r0gs",
    appleMusic:
      "https://music.apple.com/us/album/i-carry-you-with-me-esme-version/6827958045?i=6827958046",
  },
  {
    title: "Deeper Than the Ocean (feat. Lexi Storm)",
    artist: ARTIST,
    duration: "3:04",
    released: "2026-10-25",
    preview: true,
    spotify: "https://open.spotify.com/track/3q2L3B1M5qFlyriDJPaJLC",
    youtubeMusic: "https://music.youtube.com/watch?v=PDzZ83GJisg",
    appleMusic:
      "https://music.apple.com/us/album/deeper-than-the-ocean-feat-lexi-storm/6826906332?i=6826906333",
  },
  {
    title: "No One Can Help Me Except (feat. Lexi Storm)",
    artist: ARTIST,
    duration: "2:58",
    released: "2026-10-25",
    preview: true,
    spotify: "https://open.spotify.com/track/5Qg0LfJ3iQqBHI9VKrRyXy",
    youtubeMusic: "https://music.youtube.com/watch?v=k1u5OWdhyp8",
    appleMusic:
      "https://music.apple.com/us/album/no-one-can-help-me-except-feat-lexi-storm/6826919523?i=6826919524",
  },
  {
    title: "Lost Treasure (feat. Lexi Storm)",
    artist: ARTIST,
    duration: "4:38",
    released: "2026-10-25",
    preview: true,
    spotify: "https://open.spotify.com/track/3JlctyW268MNhJDql1EbMt",
    youtubeMusic: "https://music.youtube.com/watch?v=CntmN_O-LVE",
  },
  {
    title: "The Light",
    artist: ARTIST,
    duration: "2:49",
    released: "2026-10-25",
    preview: true,
    spotify: "https://open.spotify.com/track/70P5jEYtsatx2yL6cF4gBI",
    youtubeMusic: "https://music.youtube.com/watch?v=_l65eq_LizE",
    appleMusic:
      "https://music.apple.com/us/album/the-light-feat-lexi-storm/6826906074?i=6826906075",
  },
  {
    title: "Why",
    artist: ARTIST,
    duration: "3:22",
    released: "2026-10-25",
    preview: true,
    youtubeMusic: "https://music.youtube.com/watch?v=3pGvs78SB1I",
    appleMusic: "https://music.apple.com/us/album/why-feat-lexi-storm/6826906074?i=6826906406",
  },
  {
    title: "Blame Me",
    artist: LEXI_ARTIST,
    duration: "2:21",
    preview: true,
    youtubeMusic: "https://music.youtube.com/watch?v=Baf6z71AZhg",
  },
];

describe("catalog", () => {
  it("lists newest verified releases first and keeps albums empty", () => {
    assert.deepEqual(
      TRACKS.map((track) => track.title),
      EXPECTED.map((track) => track.title),
    );
    assert.equal(TRACKS.length, SINGLES.length);
    assert.equal(TRACKS.length, 29);
    assert.equal(ALBUMS.length, 0);
    assert.equal(PREVIEW_SECONDS, 30);
    assert.equal(LEAD_TRACK_ID, "hope");
    assert.notEqual(TRACKS[0]?.id, LEAD_TRACK_ID);
    assert.equal(YOUTUBE_MUSIC_PLAYLIST, "https://music.youtube.com/playlist?list=PLALrux7JVT28");
  });

  it("keeps Lexi Storm's channel off LathosWorld's YouTube", () => {
    const lexi = TRACKS.filter((track) => track.artist === LEXI_ARTIST).map((track) => track.title);
    assert.deepEqual(lexi, [
      "Love Me in Slow Motion",
      "Ghosted",
      "Hope",
      "Light It Up",
      "Slow Motion",
      "Love Me",
      "What Happened to You and I",
      "Some Day",
      "Turns You Never Said",
      "A Place",
      "Blame Me",
    ]);
    assert.equal(FEATURED_ARTIST.youtube, "https://www.youtube.com/@lexistormai");
    assert.equal(FEATURED_ARTIST.youtubeLabel, "Watch Lexi Storm on YouTube");
    assert.notEqual(FEATURED_ARTIST.youtube, SOCIALS.find((item) => item.name === "YouTube")?.href);
    assert.equal(FEATURED_ARTIST.youtube.includes("@lathos563"), false);
    assert.equal(FEATURED_ARTIST.youtube.includes("UCcV1q2gBovKyWlU8SnCI3ww"), false);
    assert.equal(
      TRACKS.some((track) => /og hope/i.test(track.title)),
      false,
    );
  });

  it("uses only the checked links and previews, with no master URL", () => {
    const blob = JSON.stringify({ TRACKS, FEATURED_ARTIST, SINGLES, YOUTUBE_MUSIC_PLAYLIST });
    assert.equal(/\.wav/i.test(blob), false);
    assert.equal(blob.includes("download=1"), false);
    assert.equal(blob.includes("/music/"), false);
    assert.equal(blob.includes("hyperfollow"), false);
    assert.equal(/jared/i.test(blob), false);
    assert.equal(TRACKS.length, EXPECTED.length);
    for (const [index, track] of TRACKS.entries()) {
      const expected = EXPECTED[index];
      assert.ok(expected);
      assert.equal(track.title, expected.title);
      assert.equal(track.artist, expected.artist);
      assert.equal(track.duration, expected.duration);
      assert.equal(track.released, expected.released);
      assert.equal(track.album, expected.album);
      assert.equal(track.spotify, expected.spotify);
      assert.equal(track.youtubeMusic, expected.youtubeMusic);
      assert.equal(track.youtube, expected.youtube);
      assert.equal(track.appleMusic, expected.appleMusic);
      if (expected.preview) {
        assert.equal(track.preview, `/previews/${track.id}.mp3`);
        const file = path.join(root, "public", "previews", `${track.id}.mp3`);
        const stat = fs.statSync(file);
        const header = fs.readFileSync(file).subarray(0, 2);
        assert.equal(header[0], 0xff);
        assert.ok(stat.size > 50_000 && stat.size < 500_000, `${track.id} is not a short preview`);
      } else {
        assert.equal(track.preview, undefined);
      }
    }
    const slow = TRACKS.find((track) => track.title === "Slow Motion");
    const loveSlow = TRACKS.find((track) => track.title === "Love Me in Slow Motion");
    assert.equal(slow?.duration, "2:46");
    assert.equal(slow?.youtube, undefined);
    assert.equal(loveSlow?.youtubeMusic, undefined);
    assert.equal(loveSlow?.spotify, undefined);
    assert.equal(loveSlow?.appleMusic, undefined);
    const ghosted = TRACKS.find((track) => track.title === "Ghosted");
    assert.equal(ghosted?.spotify, undefined);
    assert.equal(ghosted?.youtube, undefined);
    assert.equal(ghosted?.youtubeMusic, undefined);
    assert.equal(ghosted?.appleMusic, undefined);
    assert.match(ghosted?.note ?? "", /no verified/i);
  });
});
