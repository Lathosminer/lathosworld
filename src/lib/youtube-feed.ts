import { YT_CHANNEL } from "./youtube-live.functions.ts";

export const SITE_ORIGIN = "https://lathosworld.com";
export const YT_FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${YT_CHANNEL}`;
export const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;
/** Fresh window for a successful YouTube read. */
export const FEED_TTL_MS = 60 * 60 * 1000;
export const FEED_ITEM_LIMIT = 15;
/**
 * YouTube videos that stay on the channel but never show on lathosworld.com
 * (feed.xml and /videos/<id>). Personal, family, and test uploads.
 */
export const EXCLUDED_VIDEO_IDS: readonly string[] = [
  "px6StD-TCvg", // Oct 25 2026, 40s: ice, owl costume, family clip
  "3qVqLWcpQHQ", // Oct 26 2026, 12s: test upload
  "j2-ElyTPSiE", // Oct 25 2026, 14s: "Serving Royal Drama with High Energy Tea", costume clip
];

export function isExcludedVideo(id: string): boolean {
  return EXCLUDED_VIDEO_IDS.includes(id);
}

export function withoutExcluded(videos: readonly YtVideo[]): YtVideo[] {
  return videos.filter((video) => !isExcludedVideo(video.id));
}
export const DEFAULT_DESCRIPTION = "A new video from LathosWorld.";
export const CHANNEL_TITLE = "LathosWorld";
export const CHANNEL_DESCRIPTION = "Latest videos from LathosWorld.";

/** Drop characters XML 1.0 cannot encode. Tabs, newlines, and carriage returns stay. */
function stripInvalidXml(value: string): string {
  let out = "";
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if (code === 0xfffe || code === 0xffff) continue;
    if (code < 32 && code !== 9 && code !== 10 && code !== 13) continue;
    out += char;
  }
  return out;
}

export type YtVideo = {
  id: string;
  title: string;
  description: string;
  published: string;
};

export type FeedCacheEntry = {
  at: number;
  videos: YtVideo[];
};

export type VideoPageModel = {
  id: string;
  title: string;
  description: string;
  image: string;
  url: string;
};

export function videoUrl(id: string): string {
  return `${SITE_ORIGIN}/videos/${id}`;
}

export function thumbnailUrl(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

export function escapeXml(value: string): string {
  return stripInvalidXml(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function decodeXml(value: string): string {
  const text = value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  return text
    .replace(/&#(\d+);/g, (_, digits: string) => fromCodePoint(Number(digits)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => fromCodePoint(parseInt(hex, 16)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function fromCodePoint(code: number): string {
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return "";
  try {
    return String.fromCodePoint(code);
  } catch {
    return "";
  }
}

/** Plain-text snippet for RSS and social tags. Empty source becomes the default line. */
export function snippet(text: string, max = 280): string {
  const plain = stripInvalidXml(text).replace(/\s+/g, " ").trim();
  if (!plain) return DEFAULT_DESCRIPTION;
  if (plain.length <= max) return plain;
  const cut = plain.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  const base = (space > 40 ? cut.slice(0, space) : cut).trimEnd();
  return `${base}…`;
}

/** RFC 822 / RFC 1123 date, which RSS pubDate accepts. */
export function rfc822(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return new Date(0).toUTCString();
  return date.toUTCString();
}

export function parseYoutubeAtom(xml: string): YtVideo[] {
  const blocks = xml.match(/<entry\b[^>]*>[\s\S]*?<\/entry>/g) ?? [];
  const videos: YtVideo[] = [];
  for (const block of blocks) {
    const rawId = decodeXml(
      textTag(block, "yt:videoId") || textTag(block, "id").replace(/^yt:video:/, ""),
    );
    const id = rawId.trim();
    if (!VIDEO_ID_RE.test(id)) continue;
    const publishedRaw = textTag(block, "published") || textTag(block, "updated");
    const publishedMs = Date.parse(publishedRaw);
    if (!Number.isFinite(publishedMs)) continue;
    const title = stripInvalidXml(
      decodeXml(textTag(block, "title") || textTag(block, "media:title")),
    ).trim();
    const description = stripInvalidXml(decodeXml(textTag(block, "media:description")))
      .trim()
      .slice(0, 5000);
    videos.push({
      id,
      title: title || "LathosWorld video",
      description,
      published: new Date(publishedMs).toISOString(),
    });
  }
  videos.sort((a, b) => Date.parse(b.published) - Date.parse(a.published));
  return withoutExcluded(videos).slice(0, FEED_ITEM_LIMIT);
}

function textTag(block: string, tag: string): string {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = block.match(new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)</${escaped}>`));
  return match?.[1] ?? "";
}

export function renderRss(videos: YtVideo[], now = new Date()): string {
  const items = videos.map(renderItem).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(CHANNEL_TITLE)}</title>
    <link>${SITE_ORIGIN}</link>
    <description>${escapeXml(CHANNEL_DESCRIPTION)}</description>
    <language>en-us</language>
    <lastBuildDate>${now.toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_ORIGIN}/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`;
}

function renderItem(video: YtVideo): string {
  const link = videoUrl(video.id);
  const image = thumbnailUrl(video.id);
  return `    <item>
      <title>${escapeXml(video.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${rfc822(video.published)}</pubDate>
      <description>${escapeXml(snippet(video.description))}</description>
      <media:content url="${escapeXml(image)}" medium="image" type="image/jpeg"/>
      <enclosure url="${escapeXml(image)}" type="image/jpeg" length="0"/>
    </item>`;
}

export function videoPageModel(id: string, video: YtVideo | null): VideoPageModel {
  const description = video?.description.trim() || DEFAULT_DESCRIPTION;
  return {
    id,
    title: video?.title.trim() || "LathosWorld video",
    description,
    image: thumbnailUrl(id),
    url: videoUrl(id),
  };
}

export function isFresh(entry: FeedCacheEntry | null, now: number, ttl = FEED_TTL_MS): boolean {
  return !!entry && Number.isFinite(entry.at) && now - entry.at < ttl && entry.videos.length > 0;
}

export function parseCacheEntry(value: unknown): FeedCacheEntry | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as { at?: unknown; videos?: unknown };
  if (typeof raw.at !== "number" || !Number.isFinite(raw.at) || !Array.isArray(raw.videos))
    return null;
  const videos: YtVideo[] = [];
  for (const item of raw.videos) {
    if (!item || typeof item !== "object") continue;
    const video = item as Partial<YtVideo>;
    if (typeof video.id !== "string" || !VIDEO_ID_RE.test(video.id)) continue;
    if (
      typeof video.title !== "string" ||
      typeof video.description !== "string" ||
      typeof video.published !== "string"
    )
      continue;
    videos.push({
      id: video.id,
      title: video.title,
      description: video.description,
      published: video.published,
    });
  }
  const kept = withoutExcluded(videos);
  if (!kept.length) return null;
  return { at: raw.at, videos: kept.slice(0, FEED_ITEM_LIMIT) };
}

/**
 * One-hour fresh cache, then the network. A failed read keeps the last good
 * copy (memory or edge) instead of wiping the feed.
 */
export async function loadYoutubeVideos(opts: {
  now: number;
  memory: FeedCacheEntry | null;
  readEdge: () => Promise<FeedCacheEntry | null>;
  writeEdge: (entry: FeedCacheEntry) => Promise<void>;
  fetchFeed: () => Promise<string>;
  onError?: (err: unknown) => void;
}): Promise<{ videos: YtVideo[]; memory: FeedCacheEntry | null }> {
  if (opts.memory && isFresh(opts.memory, opts.now)) {
    return { videos: opts.memory.videos, memory: opts.memory };
  }
  let edge: FeedCacheEntry | null = null;
  try {
    edge = await opts.readEdge();
  } catch {
    edge = null;
  }
  if (edge && isFresh(edge, opts.now)) return { videos: edge.videos, memory: edge };
  try {
    const xml = await opts.fetchFeed();
    const videos = parseYoutubeAtom(xml);
    if (!videos.length) throw new Error("empty youtube feed");
    const memory = { at: opts.now, videos };
    try {
      await opts.writeEdge(memory);
    } catch {
      // The edge cache is optional. Memory still holds this copy.
    }
    return { videos, memory };
  } catch (err) {
    opts.onError?.(err);
    const stale =
      opts.memory && opts.memory.videos.length
        ? opts.memory
        : edge && edge.videos.length
          ? edge
          : null;
    return { videos: stale?.videos ?? [], memory: stale };
  }
}
