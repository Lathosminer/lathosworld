import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth/server";

// Mounts Better Auth at /api/auth/* (sign up, sign in, sessions, change password).
// Without this route every auth call on the live site returned 404.
export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => auth.handler(request),
      POST: ({ request }) => auth.handler(request),
    },
  },
});
