import { getRequest } from "@tanstack/react-start/server";
import {
  FEED_TTL_MS,
  YT_FEED_URL,
  loadYoutubeVideos,
  parseCacheEntry,
  type FeedCacheEntry,
  type YtVideo,
  withoutExcluded,
} from "./youtube-feed.ts";

/** How long the Cache API keeps the last good copy so a later failure can reuse it. */
const EDGE_RETENTION_S = 7 * 24 * 60 * 60;
const CACHE_PATH = "/__cache/youtube-video-feed";

type EdgeCache = {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
};

let memory: FeedCacheEntry | null = null;
let inflight: Promise<YtVideo[]> | null = null;

export function resetYoutubeFeedCacheForTests(): void {
  memory = null;
  inflight = null;
}

/** Newest videos from the YouTube Atom feed. Cached about an hour. */
export async function getYoutubeVideos(origin?: string): Promise<YtVideo[]> {
  const now = Date.now();
  if (memory && now - memory.at < FEED_TTL_MS && memory.videos.length > 0) return withoutExcluded(memory.videos);
  if (!inflight) {
    inflight = refresh(origin, now).finally(() => {
      inflight = null;
    });
  }
  return inflight;
}

async function refresh(origin: string | undefined, now: number): Promise<YtVideo[]> {
  const resolved = origin || requestOrigin();
  const result = await loadYoutubeVideos({
    now,
    memory,
    readEdge: () => readEdge(resolved),
    writeEdge: (entry) => writeEdge(resolved, entry),
    fetchFeed: fetchAtom,
    onError: (err) => {
      console.error("[feed] YouTube feed unavailable", err);
    },
  });
  memory = result.memory;
  return withoutExcluded(result.videos);
}

async function fetchAtom(): Promise<string> {
  const res = await fetch(YT_FEED_URL, {
    headers: {
      Accept: "application/atom+xml, application/xml, text/xml;q=0.9",
      "User-Agent": "LathosWorld/1.0 (+https://lathosworld.com/feed.xml)",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`YouTube feed HTTP ${res.status}`);
  return res.text();
}

function requestOrigin(): string | undefined {
  try {
    const request = getRequest();
    if (!request) return undefined;
    const origin = new URL(request.url).origin;
    return origin.startsWith("http://") || origin.startsWith("https://") ? origin : undefined;
  } catch {
    return undefined;
  }
}

function edgeCache(): EdgeCache | null {
  const cachesGlobal = (globalThis as { caches?: { default?: EdgeCache } }).caches;
  const cache = cachesGlobal?.default;
  if (!cache || typeof cache.match !== "function" || typeof cache.put !== "function") return null;
  return cache;
}

function cacheRequest(origin: string | undefined): Request | null {
  if (!origin) return null;
  try {
    const url = new URL(CACHE_PATH, origin);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return new Request(url, { method: "GET" });
  } catch {
    return null;
  }
}

async function readEdge(origin: string | undefined): Promise<FeedCacheEntry | null> {
  const cache = edgeCache();
  const request = cacheRequest(origin);
  if (!cache || !request) return null;
  const hit = await cache.match(request);
  if (!hit) return null;
  return parseCacheEntry(await hit.json());
}

async function writeEdge(origin: string | undefined, entry: FeedCacheEntry): Promise<void> {
  const cache = edgeCache();
  const request = cacheRequest(origin);
  if (!cache || !request) return;
  await cache.put(
    request,
    new Response(JSON.stringify(entry), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": `public, max-age=${EDGE_RETENTION_S}`,
      },
    }),
  );
}
