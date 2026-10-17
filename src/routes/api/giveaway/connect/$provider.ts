import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/giveaway/connect/$provider")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { startOAuth } = await import("@/lib/giveaway-oauth.server");
        return startOAuth(request, params.provider);
      },
    },
  },
});
