const SITE = "https://lathosworld.com";
export const OG_IMAGE_V9 = `${SITE}/og-v9.jpg`;
/** Alt for /og-v9.jpg: emblem, not the older LATHOS wordmark. */
export const OG_IMAGE_V9_ALT =
  "LathosWorld emblem on black: LATHOS above a silver sword, a red eye in the crossguard, cyan circuit lines, and WORLD below.";

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
      { property: "og:image:alt", content: OG_IMAGE_V9_ALT },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@lathos563" },
      { name: "twitter:title", content: opts.title },
      { name: "twitter:description", content: opts.description },
      { name: "twitter:image", content: OG_IMAGE_V9 },
      { name: "twitter:image:alt", content: OG_IMAGE_V9_ALT },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}
