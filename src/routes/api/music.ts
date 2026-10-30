import { ARTIST, musicAvailability } from "@/lib/music";
import { getMusicBucket } from "@/lib/music-bucket.server";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/music")({
  server: {
    handlers: {
      GET: async () => {
        const tracks = await musicAvailability(await getMusicBucket());
        return Response.json(
          { artist: ARTIST, tracks },
          { headers: { "cache-control": "no-store" } },
        );
      },
    },
  },
});
