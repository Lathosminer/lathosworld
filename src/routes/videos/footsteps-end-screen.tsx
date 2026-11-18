import { SiteVideoPage } from "@/components/SiteVideos";
import { getSiteVideo, siteVideoHead } from "@/lib/visuals";
import { createFileRoute } from "@tanstack/react-router";

const video = getSiteVideo("footsteps-end-screen");

export const Route = createFileRoute("/videos/footsteps-end-screen")({
  head: () => siteVideoHead(video),
  component: FootstepsEndScreenPage,
});

function FootstepsEndScreenPage() {
  return <SiteVideoPage slug="footsteps-end-screen" />;
}
