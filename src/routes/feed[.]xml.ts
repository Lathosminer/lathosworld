import { createFileRoute } from "@tanstack/react-router";
import { renderRss } from "@/lib/youtube-feed";

export const Route = createFileRoute("/feed.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { getYoutubeVideos } = await import("@/lib/youtube-feed.server");
        const videos = await getYoutubeVideos(new URL(request.url).origin);
        const body = renderRss(videos);
        return new Response(body, {
          headers: {
            "content-type": "application/rss+xml; charset=utf-8",
            "cache-control":
              videos.length > 0
                ? "public, max-age=3600, stale-while-revalidate=86400"
                : "public, max-age=60",
          },
        });
      },
    },
  },
});
