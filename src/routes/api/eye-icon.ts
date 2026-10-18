import { createFileRoute } from "@tanstack/react-router";

let bytes: ArrayBuffer | null = null;

/** The animated Great Eye used in the header account badge. Cached for a year. */
export const Route = createFileRoute("/api/eye-icon")({
  server: {
    handlers: {
      GET: async () => {
        if (!bytes) {
          const { EYE_ICON_WEBP_BASE64 } = await import("@/lib/eye-icon-data.server");
          const binary = atob(EYE_ICON_WEBP_BASE64);
          bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0)).buffer;
        }
        return new Response(bytes, {
          headers: {
            "content-type": "image/webp",
            "cache-control": "public, max-age=31536000, immutable",
            "x-content-type-options": "nosniff",
          },
        });
      },
    },
  },
});
