import { createFileRoute } from "@tanstack/react-router";
import { hasCommunity } from "@/lib/community";

const CACHED = "public, max-age=300, s-maxage=480, stale-while-revalidate=60";

export const Route = createFileRoute("/api/community")({
  server: {
    handlers: {
      GET: async () => {
        const { getCommunityStats } = await import("@/lib/community.server");
        const body = await getCommunityStats();
        return Response.json(body, {
          headers: { "cache-control": hasCommunity(body) ? CACHED : "no-store" },
        });
      },
    },
  },
});
