import { SOCIALS } from "./socials.ts";

/**
 * Released singles. Edit SINGLES to add or remove a track, or push an album
 * onto ALBUMS (Volume One and Volume Two stay off the page until then).
 *
 * Play is a 30-second 96 kbps MP3 preview in public/previews. The page does
 * not stream or link a full master. Spotify, YouTube Music, and Apple Music
 * are only the links checked on 4 Nov 2026. A platform with no checked link
 * is left off the row.
 *
 * Each preview starts at the first chorus or hook, on a phrase boundary:
 * Hope 0:57.2, Slow Motion 0:36.9, Life (feat. Lexi Storm) 1:02.1,
 * No One Can Help Me Except 0:28.0, Blame Me 0:08.5,
 * Deeper Than the Ocean 0:46.6, I Carry You With Me 0:43.0,
 * I Carry You With Me (Esme Version) 0:39.8, Lost Treasure 2:09.0,
 * Lost Treasure (Remastered) 2:25.3, The Light 0:22.7, Why 0:18.7,
 * Life (Heavy Metal) 1:42.8, Hope, Life and Light (Heavy Metal) 1:32.0,
 * Hope, Life and Light (Heavy Metal, Short Version) 1:11.6.
 *
 * Durations are the released lengths, rounded to the nearest second.
 * "The Light" and "Why" keep the shorter titles; the store singles credit
 * Lexi Storm on both.
 */
export const ARTIST = "LathosWorld";
export const LEXI_ARTIST = "Lexi Storm";
export const PREVIEW_SECONDS = 30;

const youtube = SOCIALS.find((item) => item.name === "YouTube");
if (!youtube) throw new Error("LathosWorld YouTube link is missing from socials");

/** LathosWorld's channel. The Lexi Storm card does not use this. */
export const LEXI_YOUTUBE_URL = youtube.href;

export const FEATURED_ARTIST = {
  name: "Lexi Storm",
  role: "AI character",
  intro:
    "Lexi Storm is the LathosWorld AI character. She sings with LathosWorld, and her own singles are in the list.",
  image: "/pins/lexi_leather_city_pin.jpg",
  imageWidth: 1000,
  imageHeight: 1500,
  imageAlt: "Lexi Storm, the LathosWorld AI character",
  youtube: "https://www.youtube.com/@lexistormai",
  youtubeLabel: "Watch Lexi Storm on YouTube",
} as const;

export type ReleaseTrack = {
  title: string;
  /** mm:ss */
  duration: string;
  /** Stable id. Also the preview filename under /previews/. */
  id: string;
  spotify?: string;
  youtubeMusic?: string;
  appleMusic?: string;
};

export type SingleRelease = ReleaseTrack & {
  artist: string;
};

export type AlbumRelease = {
  artist: string;
  title: string;
  tracks: readonly ReleaseTrack[];
};

export type Track = ReleaseTrack & {
  artist: string;
  /** 30-second preview. Never a full master. */
  preview: string;
  /** Set when the track comes from ALBUMS. */
  album?: string;
};

type Links = {
  spotify?: string;
  youtubeMusic?: string;
  appleMusic?: string;
};

const track = (
  artist: string,
  title: string,
  duration: string,
  id: string,
  links: Links,
): SingleRelease => ({
  artist,
  title,
  duration,
  id,
  ...links,
});

const lw = (title: string, duration: string, id: string, links: Links) =>
  track(ARTIST, title, duration, id, links);

const lexi = (title: string, duration: string, id: string, links: Links) =>
  track(LEXI_ARTIST, title, duration, id, links);

/** Singles, in play order. */
export const SINGLES: readonly SingleRelease[] = [
  lexi("Hope", "3:17", "hope", {
    youtubeMusic: "https://music.youtube.com/watch?v=YdU75FEjzb8",
    appleMusic: "https://music.apple.com/us/album/hope/6828049260?i=6828049261",
  }),
  // Preview is the first chorus of the released 2:46 album cut.
  lexi("Slow Motion", "2:46", "slow-motion", {
    youtubeMusic: "https://music.youtube.com/watch?v=T3zfGwkHVRQ",
    appleMusic: "https://music.apple.com/us/album/slow-motion/6828049260?i=6828049264",
  }),
  lw("Life (feat. Lexi Storm)", "3:46", "life", {
    youtubeMusic: "https://music.youtube.com/watch?v=d1xAoQkvW1w",
    appleMusic: "https://music.apple.com/us/album/life-feat-lexi-storm/6828751394?i=6828751395",
  }),
  lw("No One Can Help Me Except (feat. Lexi Storm)", "2:58", "no-one-can-help-me-except", {
    spotify: "https://open.spotify.com/track/5Qg0LfJ3iQqBHI9VKrRyXy",
    youtubeMusic: "https://music.youtube.com/watch?v=k1u5OWdhyp8",
    appleMusic:
      "https://music.apple.com/us/album/no-one-can-help-me-except-feat-lexi-storm/6826919523?i=6826919524",
  }),
  // Preview is the first hook of the released 2:21 album cut, not the unreleased rap remix.
  lexi("Blame Me", "2:21", "blame-me", {
    youtubeMusic: "https://music.youtube.com/watch?v=Baf6z71AZhg",
  }),
  lw("Deeper Than the Ocean (feat. Lexi Storm)", "3:04", "deeper-than-the-ocean", {
    spotify: "https://open.spotify.com/track/3q2L3B1M5qFlyriDJPaJLC",
    youtubeMusic: "https://music.youtube.com/watch?v=PDzZ83GJisg",
    appleMusic:
      "https://music.apple.com/us/album/deeper-than-the-ocean-feat-lexi-storm/6826906332?i=6826906333",
  }),
  lw("I Carry You With Me (feat. Lexi Storm)", "2:04", "i-carry-you-with-me", {
    spotify: "https://open.spotify.com/track/4rh58G5faPCA9U4ZQlmhjI",
    youtubeMusic: "https://music.youtube.com/watch?v=RTK3rHUT1io",
    appleMusic:
      "https://music.apple.com/us/album/i-carry-you-with-me-feat-lexi-storm/6828063294?i=6828063295",
  }),
  lw("I Carry You With Me (Esme Version)", "1:49", "i-carry-you-with-me-esme", {
    youtubeMusic: "https://music.youtube.com/watch?v=PJkYS22r0gs",
    appleMusic:
      "https://music.apple.com/us/album/i-carry-you-with-me-esme-version/6827958045?i=6827958046",
  }),
  // Released length is 4:38 (Spotify 278.7s, 25 Oct 2026). The row keeps that.
  lw("Lost Treasure (feat. Lexi Storm)", "4:38", "lost-treasure", {
    spotify: "https://open.spotify.com/track/3JlctyW268MNhJDql1EbMt",
    youtubeMusic: "https://music.youtube.com/watch?v=CntmN_O-LVE",
  }),
  lw("Lost Treasure (Remastered)", "4:42", "lost-treasure-remastered", {
    spotify: "https://open.spotify.com/track/1ls2YWImVEGxApCA4sD32s",
    youtubeMusic: "https://music.youtube.com/watch?v=PH8s6r3CXmA",
    appleMusic: "https://music.apple.com/us/album/lost-treasure-remastered/6828730942?i=6828730943",
  }),
  lw("The Light", "2:49", "the-light", {
    spotify: "https://open.spotify.com/track/70P5jEYtsatx2yL6cF4gBI",
    youtubeMusic: "https://music.youtube.com/watch?v=_l65eq_LizE",
    appleMusic:
      "https://music.apple.com/us/album/the-light-feat-lexi-storm/6826906074?i=6826906075",
  }),
  lw("Why", "3:22", "why", {
    youtubeMusic: "https://music.youtube.com/watch?v=3pGvs78SB1I",
    appleMusic: "https://music.apple.com/us/album/why-feat-lexi-storm/6826906074?i=6826906406",
  }),
  lw("Life (Heavy Metal)", "3:47", "life-heavy-metal", {
    spotify: "https://open.spotify.com/track/6JBZzBFQhBMtwNpAotLl27",
    youtubeMusic: "https://music.youtube.com/watch?v=8Khjx7fuOZs",
    appleMusic: "https://music.apple.com/us/album/life-heavy-metal/6828751691?i=6828751692",
  }),
  lw("Hope, Life and Light (Heavy Metal)", "3:27", "hope-life-and-light", {
    spotify: "https://open.spotify.com/track/148gZ0UUihqCvaxkpNpUhI",
    youtubeMusic: "https://music.youtube.com/watch?v=wmIn31RVsVs",
    appleMusic:
      "https://music.apple.com/us/album/hope-life-and-light-heavy-metal/6828752065?i=6828752066",
  }),
  lw("Hope, Life and Light (Heavy Metal, Short Version)", "3:04", "hope-life-and-light-short", {
    spotify: "https://open.spotify.com/track/2bA8jtr6ZsJ39GzxJ2BLSE",
    youtubeMusic: "https://music.youtube.com/watch?v=LM04vMyc5bo",
    appleMusic:
      "https://music.apple.com/us/album/hope-life-and-light-heavy-metal-short-version/6828752065?i=6828752067",
  }),
];

/**
 * Volume One (LathosWorld, 14 tracks) and Volume Two (Lexi Storm, 13 tracks)
 * are out. Leave them off this list until they should play on the site.
 * Adding one appends its tracks after the singles.
 */
export const ALBUMS: readonly AlbumRelease[] = [];

function toTrack(artist: string, release: ReleaseTrack, album?: string): Track {
  return {
    ...release,
    artist,
    preview: `/previews/${release.id}.mp3`,
    ...(album ? { album } : {}),
  };
}

/** Singles first, then any album tracks, in catalog order. */
export const TRACKS: readonly Track[] = [
  ...SINGLES.map((single) => toTrack(single.artist, single)),
  ...ALBUMS.flatMap((album) =>
    album.tracks.map((item) => toTrack(album.artist, item, album.title)),
  ),
];

/** Lead single. Stays first and is marked in the tracklist. */
export const LEAD_TRACK_ID = TRACKS[0]?.id ?? "";
