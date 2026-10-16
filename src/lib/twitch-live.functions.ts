import { createServerFn } from "@tanstack/react-start";

type TwitchLive = { live: boolean; title: string; preview: string | null };
let cache: { at: number; v: TwitchLive } | null = null;

/** Cheap server-side check (Twitch public GQL, 60s cache) so the page needs no player script to show LIVE. */
export const twitchLive = createServerFn({ method: "GET" }).handler(async (): Promise<TwitchLive> => {
  if (cache && Date.now() - cache.at < 60_000) return cache.v;
  let v: TwitchLive = { live: false, title: "", preview: null };
  try {
    const res = await fetch("https://gql.twitch.tv/gql", {
      method: "POST",
      headers: { "Client-Id": "kimne78kx3ncx6brgo4mv6wki5h1ko", "Content-Type": "application/json" },
      signal: AbortSignal.timeout(5000),
      body: JSON.stringify({
        query: '{ user(login:"lathosworld"){ stream{ type title previewImageURL(width:640,height:360) } } }',
      }),
    });
    const body = (await res.json()) as { data?: { user?: { stream?: { type?: string; title?: string; previewImageURL?: string } | null } } };
    const s = body.data?.user?.stream;
    if (s && s.type === "live") v = { live: true, title: s.title ?? "", preview: s.previewImageURL ?? null };
  } catch {
    // offline / unreachable -> show the plain cover
  }
  cache = { at: Date.now(), v };
  return v;
});
