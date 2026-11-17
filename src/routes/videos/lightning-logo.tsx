import { SiteVideoPage } from "@/components/SiteVideos";
import { getSiteVideo, siteVideoHead } from "@/lib/visuals";
import { createFileRoute } from "@tanstack/react-router";

const video = getSiteVideo("lightning-logo");

export const Route = createFileRoute("/videos/lightning-logo")({
  head: () => siteVideoHead(video),
  component: LightningLogoPage,
});

function LightningLogoPage() {
  return <SiteVideoPage slug="lightning-logo" />;
}
