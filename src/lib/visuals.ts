const SITE_ORIGIN = "https://lathosworld.com";

export type SiteVideo = {
  slug: "lightning-logo" | "footsteps-end-screen";
  title: string;
  description: string;
  artist: "LathosWorld";
  src: string;
  poster: string;
  posterWidth: number;
  posterHeight: number;
  width: number;
  height: number;
  durationLabel: string;
  durationSeconds: number;
};

/** Hosted on the site's media domain. The files stay out of this repo. */
export const SITE_VIDEOS: readonly SiteVideo[] = [
  {
    slug: "lightning-logo",
    title: "LathosWorld Lightning Logo",
    description:
      "The LathosWorld lightning logo and sword. Footsteps Don't Leave Me Behind plays through.",
    artist: "LathosWorld",
    src: "https://media.lathosworld.com/videos/lathosworld-lightning-logo-footsteps.mp4",
    poster: "/videos/lightning-logo.jpg",
    posterWidth: 1280,
    posterHeight: 720,
    width: 1280,
    height: 720,
    durationLabel: "5:02",
    durationSeconds: 302,
  },
  {
    slug: "footsteps-end-screen",
    title: "Glowing Eyes",
    description:
      "Glowing Eyes, the Footsteps end screen. Jesus carries someone inside a pulsing gold ring and a gold cross, with purple lightning and embers.",
    artist: "LathosWorld",
    src: "https://media.lathosworld.com/videos/footsteps-end-screen.mp4",
    poster: "/videos/footsteps-end-screen.jpg",
    posterWidth: 1600,
    posterHeight: 900,
    width: 1920,
    height: 1080,
    durationLabel: "0:30",
    durationSeconds: 30,
  },
];

export type SiteVideoSlug = SiteVideo["slug"];

export function getSiteVideo(slug: SiteVideoSlug): SiteVideo {
  const video = SITE_VIDEOS.find((item) => item.slug === slug);
  if (!video) throw new Error(`Missing site video: ${slug}`);
  return video;
}

export function siteVideoPath(video: SiteVideo): `/videos/${SiteVideoSlug}` {
  return `/videos/${video.slug}`;
}

export function siteVideoUrl(video: SiteVideo): string {
  return `${SITE_ORIGIN}${siteVideoPath(video)}`;
}

export function siteVideoPosterUrl(video: SiteVideo): string {
  return `${SITE_ORIGIN}${video.poster}`;
}

type HeadMeta =
  | { title: string }
  | { name: string; content: string }
  | { property: string; content: string };

/** Title, description, poster, and og:video for a shareable video page. */
export function siteVideoHead(video: SiteVideo): {
  meta: HeadMeta[];
  links: { rel: string; href: string }[];
} {
  const url = siteVideoUrl(video);
  const image = siteVideoPosterUrl(video);
  const title = `${video.title} · LathosWorld`;
  return {
    meta: [
      { title },
      { name: "description", content: video.description },
      { property: "og:type", content: "video.other" },
      { property: "og:site_name", content: "LathosWorld" },
      { property: "og:title", content: video.title },
      { property: "og:description", content: video.description },
      { property: "og:url", content: url },
      { property: "og:image", content: image },
      { property: "og:image:width", content: String(video.posterWidth) },
      { property: "og:image:height", content: String(video.posterHeight) },
      { property: "og:image:alt", content: video.title },
      { property: "og:video", content: video.src },
      { property: "og:video:secure_url", content: video.src },
      { property: "og:video:type", content: "video/mp4" },
      { property: "og:video:width", content: String(video.width) },
      { property: "og:video:height", content: String(video.height) },
      { property: "og:video:duration", content: String(video.durationSeconds) },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@lathos563" },
      { name: "twitter:title", content: video.title },
      { name: "twitter:description", content: video.description },
      { name: "twitter:image", content: image },
      { name: "twitter:image:alt", content: video.title },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}
