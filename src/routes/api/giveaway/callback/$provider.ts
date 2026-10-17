import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/giveaway/callback/$provider")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { finishOAuth } = await import("@/lib/giveaway-oauth.server");
        return finishOAuth(request, params.provider);
      },
    },
  },
});
