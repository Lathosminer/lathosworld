import { createFileRoute } from "@tanstack/react-router";

const CACHED = "public, max-age=60, s-maxage=60, stale-while-revalidate=60";

/** Public, cached list of recent entrant display names. Empty unless the giveaway is open. */
export const Route = createFileRoute("/api/giveaway/ticker")({
  server: {
    handlers: {
      GET: async () => {
        const { currentState, loadTicker } = await import("@/lib/giveaway.server");
        if (currentState() !== "open") {
          return Response.json({ names: [] }, { headers: { "cache-control": CACHED } });
        }
        try {
          const { getSql } = await import("@/lib/db");
          const names = await loadTicker(await getSql());
          return Response.json({ names }, { headers: { "cache-control": CACHED } });
        } catch (err) {
          console.error("[giveaway] ticker", err instanceof Error ? err.message : "failed");
          return Response.json({ names: [] }, { headers: { "cache-control": "no-store" } });
        }
      },
    },
  },
});
