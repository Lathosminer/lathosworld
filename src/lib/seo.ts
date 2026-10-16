const SITE = "https://lathosworld.com";
export const OG_IMAGE_V9 = `${SITE}/og-v9.jpg`;

/** Per-page title, description, canonical, Open Graph and Twitter card tags. */
export function pageHead(opts: { path: string; title: string; description: string }) {
  const url = `${SITE}${opts.path}`;
  return {
    meta: [
      { title: opts.title },
      { name: "description", content: opts.description },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "LathosWorld" },
      { property: "og:title", content: opts.title },
      { property: "og:description", content: opts.description },
      { property: "og:url", content: url },
      { property: "og:image", content: OG_IMAGE_V9 },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "Lathos' World: a sword through the wordmark with a red eye" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@lathos563" },
      { name: "twitter:title", content: opts.title },
      { name: "twitter:description", content: opts.description },
      { name: "twitter:image", content: OG_IMAGE_V9 },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}
