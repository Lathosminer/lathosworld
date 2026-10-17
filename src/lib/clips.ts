import { CREATORS } from "./creators.ts";

const SITE = "https://lathosworld.com";
const TWITCH_VOD = "https://www.twitch.tv/videos/2900991343";
const VOD_DATE = "2026-10-15T00:04:41Z"; // Twitch VOD 2900991343 broadcast start

export const CHICAGO_TZ = "America/Chicago";
export const FEATURED_COUNT = 6;
export const DEMON_HUNTER_LOGIN = "the_demon_hunter3";

type Base = { title: string; description: string; game: string; tags: string[]; uploadDate: string };

/**
 * `blocked: "ps5-blue"` is the PS5 "can't stream this screen" card.
 * Those clips stay off the site.
 */
export type Clip = (
  | (Base & { kind: "mp4"; src: string; poster: string; duration: string })
  | (Base & { kind: "yt"; id: string })
  | (Base & { kind: "twitch"; slug: string; channel: string; poster: string; duration: string })
) & { blocked?: "ps5-blue" };

// Captions are checked against the footage: Twitch clips by frames + on-screen callouts (no speech in the VOD),
// YouTube by the video's own title. YouTube embeds start at 0 (no chapter or replay data to justify a jump).
// Never add clips that show the PS5 blue "can't stream this screen" placeholder.
// PS5 blocks capture on menus and other non-streamable screens, so that footage is a solid blue card, not gameplay.
// Thumbnails are real frames (a local still, or YouTube's own frame). Do not generate stand-in art.
export const CLIPS: Clip[] = [
  {
    kind: "twitch", slug: "DignifiedUgliestArmadilloTwitchRPG-n9yOfV6fiIcWsBMM", channel: "the_demon_hunter3",
    title: "can you fly bobby?", game: "ARC Raiders",
    description: "Funny and friendly: \"I believe I can fly\" up on the rooftops, then the squad runs on through the rail yard. Clipped by Lathos on the_demon_hunter3's stream.",
    tags: ["ARC Raiders", "LathosWorld", "the_demon_hunter3", "Twitch clip", "funny"],
    poster: "/clips/arc-raiders-can-you-fly-bobby.webp", duration: "PT30S", uploadDate: "2026-10-09T05:32:05Z",
  },
  {
    kind: "twitch", slug: "CrepuscularDifferentHawkTBTacoRight-SJ_rYvnelqtp_0N8", channel: "the_demon_hunter3",
    title: "Hades 🐕 Check on your dawg", game: "LABYRINTHINE",
    description: "Funny and friendly: chilling on the LABYRINTHINE menu with Hades the dog while we wait. \"You okay, Hades? Come here. No, not over there.\" Clipped by Lathos on the_demon_hunter3's stream.",
    tags: ["LABYRINTHINE", "LathosWorld", "the_demon_hunter3", "Twitch clip", "dog"],
    poster: "/clips/labyrinthine-hades-check-on-your-dawg.webp", duration: "PT28S", uploadDate: "2026-10-04T07:23:14Z",
  },
  {
    kind: "mp4", title: "Moving My ENTIRE Base in Once Human", game: "Once Human",
    description: "Picking up the whole territory and scouting the map for the perfect new spot.",
    tags: ["Once Human", "LathosWorld", "Twitch clip", "base building", "move territory"],
    src: "/clips/once-human-moving-base-v1.mp4", poster: "/clips/once-human-moving-base-v1.jpg", duration: "PT1M15S", uploadDate: VOD_DATE,
  },
  {
    kind: "yt", id: "uVXvTdaZFpo", title: "Once Human GamePlay (Talking to you!BOOMY!)", game: "Once Human",
    description: "Once Human gameplay on the LathosWorld YouTube channel.",
    tags: ["Once Human", "LathosWorld", "gameplay", "YouTube"], uploadDate: "2026-09-01T18:56:49-07:00",
  },
];

/** Stable discussion id. Threads are stored as `clip:<this>`. Do not rename slugs, YouTube ids, or mp4 paths. */
export function clipDiscussionId(clip: Clip): string {
  if (clip.kind === "twitch") return `twitch:${clip.slug}`;
  if (clip.kind === "yt") return `yt:${clip.id}`;
  return `mp4:${clip.src}`;
}

export function isPs5BluePlaceholder(clip: Clip): boolean {
  return clip.blocked === "ps5-blue";
}

export function isPlayableClip(clip: Clip): boolean {
  return !isPs5BluePlaceholder(clip);
}

export const PLAYABLE_CLIPS: Clip[] = CLIPS.filter(isPlayableClip);

/** Allowlist for clip comments. Order follows the catalog. */
export const CLIP_DISCUSSION_IDS: readonly string[] = PLAYABLE_CLIPS.map(clipDiscussionId);

export function isDemonHunterClip(clip: Clip): boolean {
  return clip.kind === "twitch" && clip.channel === DEMON_HUNTER_LOGIN;
}

export function demonHunterIsListed(): boolean {
  return CREATORS.some((creator) => creator.twitchLogin === DEMON_HUNTER_LOGIN);
}

/** Calendar day in America/Chicago, `YYYY-MM-DD`. Midnight Central starts the next set. */
export function chicagoDateKey(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CHICAGO_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function seedFromDateKey(dateKey: string): number {
  let hash = 2166136261;
  const seed = `lathosworld-clips:${dateKey}`;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Same date key always returns the same clips, in the same order, for every visitor. */
export function pickFeatured<T>(items: readonly T[], dateKey: string, count = FEATURED_COUNT): T[] {
  const copy = items.slice();
  const random = mulberry32(seedFromDateKey(dateKey));
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const swap = copy[i];
    copy[i] = copy[j]!;
    copy[j] = swap!;
  }
  return copy.slice(0, Math.max(0, count));
}

export type ShoutoutPlace = "under-demon-hunter" | "under-featured";

export type DailyClipLayout = {
  dateKey: string;
  lead: Clip[];
  rest: Clip[];
  archive: Clip[];
  shoutout: ShoutoutPlace;
};

/**
 * Six playable clips for the Chicago date. Demon Hunter clips in that set lead,
 * so the creator shoutout can sit directly under them. Otherwise it sits under
 * the whole featured grid. Clips past the six are not shown on the site.
 */
export function layoutDailyClips(clips: readonly Clip[], dateKey: string, count = FEATURED_COUNT): DailyClipLayout {
  const playable = clips.filter(isPlayableClip);
  const featured = pickFeatured(playable, dateKey, count);
  const featuredIds = new Set(featured.map(clipDiscussionId));
  const lead = featured.filter(isDemonHunterClip);
  const rest = featured.filter((clip) => !isDemonHunterClip(clip));
  const archive = playable.filter((clip) => !featuredIds.has(clipDiscussionId(clip)));
  return {
    dateKey,
    lead,
    rest,
    archive,
    shoutout: lead.length > 0 ? "under-demon-hunter" : "under-featured",
  };
}

/** Real frame: a local still, or YouTube's own hq frame. Not a generated stand-in. */
export function clipThumb(clip: Clip): string {
  if (clip.kind !== "yt") return clip.poster;
  return `https://i.ytimg.com/vi/${clip.id}/hqdefault.jpg`;
}

/** Videos tab on the LathosWorld YouTube channel. */
export function youtubeVideosPage(channelId: string): string {
  return `https://www.youtube.com/channel/${channelId}/videos`;
}

export function absoluteClipUrl(url: string): string {
  return url.startsWith("http") ? url : SITE + url;
}

export function clipsJsonLd(clips: readonly Clip[] = PLAYABLE_CLIPS): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@graph": clips.filter(isPlayableClip).map((clip) => ({
      "@type": "VideoObject",
      name: clip.title,
      description: clip.description,
      thumbnailUrl: absoluteClipUrl(clipThumb(clip)),
      uploadDate: clip.uploadDate,
      keywords: clip.tags.join(", "),
      genre: clip.game,
      author: { "@type": "Person", name: "Lathos", url: SITE },
      ...(clip.kind === "mp4"
        ? { contentUrl: absoluteClipUrl(clip.src), duration: clip.duration, isBasedOn: TWITCH_VOD }
        : clip.kind === "twitch"
          ? {
              embedUrl: `https://clips.twitch.tv/embed?clip=${clip.slug}&parent=lathosworld.com`,
              url: `https://www.twitch.tv/${clip.channel}/clip/${clip.slug}`,
              duration: clip.duration,
            }
          : { embedUrl: `https://www.youtube-nocookie.com/embed/${clip.id}`, url: `https://www.youtube.com/watch?v=${clip.id}` }),
    })),
  }).replace(/</g, "\\u003c");
}
