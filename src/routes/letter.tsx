import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/letter")({
  beforeLoad: () => {
    throw redirect({ to: "/list" });
  },
});
