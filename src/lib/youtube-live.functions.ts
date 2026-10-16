import { createServerFn } from "@tanstack/react-start";

export const YT_CHANNEL = "UCcV1q2gBovKyWlU8SnCI3ww";

let cache: { at: number; id: string | null } | null = null;

/** Returns the current YouTube live video id for the channel, or null when offline. Cached 60s. */
export const youtubeLive = createServerFn({ method: "GET" }).handler(async () => {
  if (cache && Date.now() - cache.at < (cache.id ? 60_000 : 20_000)) return { id: cache.id };
  let id: string | null = null;
  try {
    const res = await fetch(`https://www.youtube.com/channel/${YT_CHANNEL}/live`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        // Skip the EU consent interstitial some datacenter IPs get.
        Cookie: "CONSENT=YES+cb; SOCS=CAI",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(6000),
    });
    const html = await res.text();
    // /live only canonicalizes to a watch URL when a stream is live or scheduled.
    const canon = html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})"/);
    const upcoming = /"isUpcoming":true/.test(html) && !/"isLive":true/.test(html);
    if (canon && !upcoming) id = canon[1];
  } catch {
    id = null;
  }
  cache = { at: Date.now(), id };
  return { id };
});
