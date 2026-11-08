import { SOCIALS } from "./socials.ts";

/**
 * Released recordings, newest verified date first. A platform field is set
 * only after a public page confirmed the title and artist. A missing field
 * means that platform was not confirmed, not that it was searched and found
 * empty.
 *
 * Play is a 30-second 96 kbps MP3 in public/previews, and only for tracks
 * marked hasPreview. The page does not stream or link a full master.
 *
 * Hope on this list is Lexi Storm's Volume Two recording (3:17, 28 Oct 2026).
 * It is not labeled as a separate OG Hope single. Slow Motion (2:46) is not
 * Love Me in Slow Motion. Ghosted is not Ghost in the Mix.
 */
export const ARTIST = "LathosWorld";
export const LEXI_ARTIST = "Lexi Storm";
export const PREVIEW_SECONDS = 30;
export const YOUTUBE_MUSIC_PLAYLIST = "https://music.youtube.com/playlist?list=PLALrux7JVT28";

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
  /** mm:ss, when a store length was checked. */
  duration?: string;
  /** Stable id. Also the preview filename when hasPreview is set. */
  id: string;
  /** YYYY-MM-DD from a store page. */
  released?: string;
  album?: string;
  /** Plain status. Never a link. */
  note?: string;
  hasPreview?: boolean;
  spotify?: string;
  youtubeMusic?: string;
  youtube?: string;
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

export type Track = Omit<ReleaseTrack, "hasPreview"> & {
  artist: string;
  /** 30-second preview. Absent when this site has no preview file. */
  preview?: string;
};

type Links = Pick<ReleaseTrack, "spotify" | "youtubeMusic" | "youtube" | "appleMusic">;

const track = (
  artist: string,
  title: string,
  id: string,
  extra: Omit<ReleaseTrack, "title" | "id"> & { duration?: string },
  links: Links,
): SingleRelease => ({
  artist,
  title,
  id,
  ...extra,
  ...links,
});

const lw = (title: string, id: string, extra: Omit<ReleaseTrack, "title" | "id">, links: Links) =>
  track(ARTIST, title, id, extra, links);

const lexi = (title: string, id: string, extra: Omit<ReleaseTrack, "title" | "id">, links: Links) =>
  track(LEXI_ARTIST, title, id, extra, links);

/** Newest verified release first. */
export const SINGLES: readonly SingleRelease[] = [
  lw(
    "Silk in the Static",
    "silk-in-the-static",
    { duration: "3:08", released: "2026-11-07" },
    {
      appleMusic: "https://music.apple.com/us/album/silk-in-the-static/6832024154?i=6832024155",
    },
  ),
  lw(
    "Ghost in the Mix",
    "ghost-in-the-mix",
    { duration: "3:09", released: "2026-11-07" },
    {
      appleMusic: "https://music.apple.com/us/album/ghost-in-the-mix/6832085789?i=6832085790",
    },
  ),
  lw(
    "Shape of Us",
    "shape-of-us",
    {
      duration: "2:07",
      released: "2026-11-07",
      album: "Shape of Us",
      note: "Same single as The Test of Time.",
    },
    { appleMusic: "https://music.apple.com/us/album/shape-of-us/6831960552?i=6831960556" },
  ),
  lw(
    "The Test of Time",
    "the-test-of-time",
    {
      duration: "3:08",
      released: "2026-11-07",
      album: "Shape of Us",
      note: "Same single as Shape of Us.",
    },
    {
      appleMusic: "https://music.apple.com/us/album/the-test-of-time/6831960552?i=6831960553",
    },
  ),
  lexi(
    "Love Me in Slow Motion",
    "love-me-in-slow-motion",
    { note: "Spotify and Apple Music were not confirmed for this recording." },
    { youtube: "https://www.youtube.com/watch?v=wMiu9W3uK04" },
  ),
  lexi(
    "Ghosted",
    "ghosted",
    {
      note: "No verified Spotify, YouTube, or Apple Music page yet.",
    },
    {},
  ),
  lw(
    "After Me",
    "after-me",
    { duration: "2:31", released: "2026-10-30" },
    {
      spotify: "https://open.spotify.com/track/7cVE9GAVIYSYwMDtcH8qG4",
      appleMusic: "https://music.apple.com/us/album/after-me/6829110913?i=6829110914",
    },
  ),
  lw(
    "After Me (Alternate Version)",
    "after-me-alternate",
    { duration: "2:11", released: "2026-10-30", album: "After Me" },
    {
      appleMusic:
        "https://music.apple.com/us/album/after-me-alternate-version/6829110913?i=6829110915",
    },
  ),
  lw(
    "Hope, Life and Light (Heavy Metal)",
    "hope-life-and-light",
    { duration: "3:27", released: "2026-10-30", hasPreview: true },
    {
      spotify: "https://open.spotify.com/track/148gZ0UUihqCvaxkpNpUhI",
      youtubeMusic: "https://music.youtube.com/watch?v=wmIn31RVsVs",
      appleMusic:
        "https://music.apple.com/us/album/hope-life-and-light-heavy-metal/6828752065?i=6828752066",
    },
  ),
  lw(
    "Hope, Life and Light (Heavy Metal, Short Version)",
    "hope-life-and-light-short",
    { duration: "3:04", released: "2026-10-30", hasPreview: true },
    {
      spotify: "https://open.spotify.com/track/2bA8jtr6ZsJ39GzxJ2BLSE",
      youtubeMusic: "https://music.youtube.com/watch?v=LM04vMyc5bo",
      appleMusic:
        "https://music.apple.com/us/album/hope-life-and-light-heavy-metal-short-version/6828752065?i=6828752067",
    },
  ),
  lw(
    "Life (feat. Lexi Storm)",
    "life",
    { duration: "3:46", released: "2026-10-29", hasPreview: true },
    {
      spotify: "https://open.spotify.com/track/4CA3ZnfDTRD9kfvvf2WYVH",
      youtubeMusic: "https://music.youtube.com/watch?v=d1xAoQkvW1w",
      appleMusic: "https://music.apple.com/us/album/life-feat-lexi-storm/6828751394?i=6828751395",
    },
  ),
  lw(
    "Life (Heavy Metal)",
    "life-heavy-metal",
    { duration: "3:47", released: "2026-10-29", hasPreview: true },
    {
      spotify: "https://open.spotify.com/track/6JBZzBFQhBMtwNpAotLl27",
      youtubeMusic: "https://music.youtube.com/watch?v=8Khjx7fuOZs",
      appleMusic: "https://music.apple.com/us/album/life-heavy-metal/6828751691?i=6828751692",
    },
  ),
  lw(
    "Lost Treasure (Remastered)",
    "lost-treasure-remastered",
    { duration: "4:42", released: "2026-10-29", hasPreview: true },
    {
      spotify: "https://open.spotify.com/track/1ls2YWImVEGxApCA4sD32s",
      youtubeMusic: "https://music.youtube.com/watch?v=PH8s6r3CXmA",
      appleMusic:
        "https://music.apple.com/us/album/lost-treasure-remastered/6828730942?i=6828730943",
    },
  ),
  lexi(
    "Hope",
    "hope",
    { duration: "3:17", released: "2026-10-28", album: "Volume Two", hasPreview: true },
    {
      spotify: "https://open.spotify.com/track/4apD6uEFjtlvWCw2tFBXQk",
      youtubeMusic: "https://music.youtube.com/watch?v=YdU75FEjzb8",
      appleMusic: "https://music.apple.com/us/album/hope/6828049260?i=6828049261",
    },
  ),
  lexi(
    "Light It Up",
    "light-it-up",
    { duration: "3:04", released: "2026-10-28", album: "Volume Two" },
    { appleMusic: "https://music.apple.com/us/album/light-it-up/6828049260?i=6828049263" },
  ),
  lexi(
    "Slow Motion",
    "slow-motion",
    { duration: "2:46", released: "2026-10-28", album: "Volume Two", hasPreview: true },
    {
      youtubeMusic: "https://music.youtube.com/watch?v=T3zfGwkHVRQ",
      appleMusic: "https://music.apple.com/us/album/slow-motion/6828049260?i=6828049264",
    },
  ),
  lexi(
    "Love Me",
    "love-me",
    { duration: "2:34", released: "2026-10-28", album: "Volume Two" },
    {
      spotify: "https://open.spotify.com/track/2v8WyqD0l5jjf6PdyD9saj",
      appleMusic: "https://music.apple.com/us/album/love-me/6828049260?i=6828049265",
    },
  ),
  lexi(
    "What Happened to You and I",
    "what-happened-to-you-and-i",
    { duration: "3:07", released: "2026-10-28", album: "Volume Two" },
    {
      appleMusic:
        "https://music.apple.com/us/album/what-happened-to-you-and-i/6828049260?i=6828049266",
    },
  ),
  lexi(
    "Some Day",
    "some-day",
    { duration: "3:24", released: "2026-10-28", album: "Volume Two" },
    { appleMusic: "https://music.apple.com/us/album/some-day/6828049260?i=6828049267" },
  ),
  lexi(
    "Turns You Never Said",
    "turns-you-never-said",
    { duration: "3:04", released: "2026-10-28", album: "Volume Two" },
    {
      appleMusic: "https://music.apple.com/us/album/turns-you-never-said/6828049260?i=6828049269",
    },
  ),
  lexi(
    "A Place",
    "a-place",
    { duration: "3:29", released: "2026-10-28", album: "Volume Two" },
    { appleMusic: "https://music.apple.com/us/album/a-place/6828049260?i=6828049271" },
  ),
  lw(
    "I Carry You With Me (feat. Lexi Storm)",
    "i-carry-you-with-me",
    { duration: "2:04", released: "2026-10-28", hasPreview: true },
    {
      spotify: "https://open.spotify.com/track/4rh58G5faPCA9U4ZQlmhjI",
      youtubeMusic: "https://music.youtube.com/watch?v=RTK3rHUT1io",
      appleMusic:
        "https://music.apple.com/us/album/i-carry-you-with-me-feat-lexi-storm/6828063294?i=6828063295",
    },
  ),
  lw(
    "I Carry You With Me (Esme Version)",
    "i-carry-you-with-me-esme",
    { duration: "1:49", released: "2026-10-28", hasPreview: true },
    {
      youtubeMusic: "https://music.youtube.com/watch?v=PJkYS22r0gs",
      appleMusic:
        "https://music.apple.com/us/album/i-carry-you-with-me-esme-version/6827958045?i=6827958046",
    },
  ),
  lw(
    "Deeper Than the Ocean (feat. Lexi Storm)",
    "deeper-than-the-ocean",
    { duration: "3:04", released: "2026-10-25", hasPreview: true },
    {
      spotify: "https://open.spotify.com/track/3q2L3B1M5qFlyriDJPaJLC",
      youtubeMusic: "https://music.youtube.com/watch?v=PDzZ83GJisg",
      appleMusic:
        "https://music.apple.com/us/album/deeper-than-the-ocean-feat-lexi-storm/6826906332?i=6826906333",
    },
  ),
  lw(
    "No One Can Help Me Except (feat. Lexi Storm)",
    "no-one-can-help-me-except",
    { duration: "2:58", released: "2026-10-25", hasPreview: true },
    {
      spotify: "https://open.spotify.com/track/5Qg0LfJ3iQqBHI9VKrRyXy",
      youtubeMusic: "https://music.youtube.com/watch?v=k1u5OWdhyp8",
      appleMusic:
        "https://music.apple.com/us/album/no-one-can-help-me-except-feat-lexi-storm/6826919523?i=6826919524",
    },
  ),
  lw(
    "Lost Treasure (feat. Lexi Storm)",
    "lost-treasure",
    { duration: "4:38", released: "2026-10-25", hasPreview: true },
    {
      spotify: "https://open.spotify.com/track/3JlctyW268MNhJDql1EbMt",
      youtubeMusic: "https://music.youtube.com/watch?v=CntmN_O-LVE",
    },
  ),
  lw(
    "The Light",
    "the-light",
    { duration: "2:49", released: "2026-10-25", hasPreview: true },
    {
      spotify: "https://open.spotify.com/track/70P5jEYtsatx2yL6cF4gBI",
      youtubeMusic: "https://music.youtube.com/watch?v=_l65eq_LizE",
      appleMusic:
        "https://music.apple.com/us/album/the-light-feat-lexi-storm/6826906074?i=6826906075",
    },
  ),
  lw(
    "Why",
    "why",
    { duration: "3:22", released: "2026-10-25", hasPreview: true },
    {
      youtubeMusic: "https://music.youtube.com/watch?v=3pGvs78SB1I",
      appleMusic: "https://music.apple.com/us/album/why-feat-lexi-storm/6826906074?i=6826906406",
    },
  ),
  lexi(
    "Blame Me",
    "blame-me",
    { duration: "2:21", hasPreview: true },
    { youtubeMusic: "https://music.youtube.com/watch?v=Baf6z71AZhg" },
  ),
];

/**
 * Volume One stays off this list. Volume Two is not posted as a whole album;
 * the checked Volume Two songs are individual rows above.
 */
export const ALBUMS: readonly AlbumRelease[] = [];

function toTrack(artist: string, release: ReleaseTrack, album?: string): Track {
  const { hasPreview, ...rest } = release;
  return {
    ...rest,
    artist,
    ...(hasPreview ? { preview: `/previews/${release.id}.mp3` } : {}),
    ...(album ? { album } : {}),
  };
}

/** Catalog order is the order of SINGLES, then any album tracks. */
export const TRACKS: readonly Track[] = [
  ...SINGLES.map((single) => toTrack(single.artist, single)),
  ...ALBUMS.flatMap((album) =>
    album.tracks.map((item) => toTrack(album.artist, item, album.title)),
  ),
];

/** Lexi Storm's Volume Two Hope. Not the first row, and not an OG Hope single. */
export const LEAD_TRACK_ID = "hope";
