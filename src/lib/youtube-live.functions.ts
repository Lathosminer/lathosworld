import { createServerFn } from "@tanstack/react-start";

export const YT_CHANNEL = "UCcV1q2gBovKyWlU8SnCI3ww";

let cache: { at: number; id: string | null } | null = null;

/** Returns the current YouTube live video id for the channel, or null when offline. Cached 60s. */
export const youtubeLive = createServerFn({ method: "GET" }).handler(async () => {
  if (cache && Date.now() - cache.at < 60_000) return { id: cache.id };
  let id: string | null = null;
  try {
    const res = await fetch(`https://www.youtube.com/channel/${YT_CHANNEL}/live`, {
      headers: { "User-Agent": "Mozilla/5.0", "Accept-Language": "en" },
      signal: AbortSignal.timeout(6000),
    });
    const html = await res.text();
    const canon = html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})"/);
    if (canon && /"isLiveNow":true|"isLive":true/.test(html)) id = canon[1];
  } catch {
    id = null;
  }
  cache = { at: Date.now(), id };
  return { id };
});
