import { serveMusic } from "@/lib/music";
import { getMusicBucket } from "@/lib/music-bucket.server";
import { createFileRoute } from "@tanstack/react-router";

// Full WAVs are larger than the Workers static-asset limit, so /music/<file>.wav
// streams the object from the MUSIC R2 binding. ?download=1 is the only
// attachment response. Anything not in the catalog is a 404.
export const Route = createFileRoute("/music/$")({
  server: {
    handlers: {
      GET: async ({ request, params }) => serveMusic(request, params._splat ?? "", await getMusicBucket()),
      HEAD: async ({ request, params }) => serveMusic(request, params._splat ?? "", await getMusicBucket()),
    },
  },
});
