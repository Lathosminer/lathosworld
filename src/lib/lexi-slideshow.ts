/** Lexi Storm stills beside the highlight reel. Looks 1–30, then 31–126. */
export const LEXI_ALT = "Lexi Storm";
export const LEXI_SLIDE_COUNT = 126;
/** How long each photo stays up, including the crossfade. */
export const LEXI_SLIDE_MS = 4500;
/** Crossfade length. Matches the slideshow frame's `--lexi-fade`. */
export const LEXI_FADE_MS = 800;
/** Images fetched ahead of the one on screen. The rest stay unloaded. */
export const LEXI_PRELOAD_AHEAD = 2;

export type LexiSlide = {
  src: string;
  alt: typeof LEXI_ALT;
};

export const LEXI_SLIDES: readonly LexiSlide[] = Array.from(
  { length: LEXI_SLIDE_COUNT },
  (_, index) => ({
    src: `/lexi/${String(index + 1).padStart(3, "0")}.jpg`,
    alt: LEXI_ALT,
  }),
);
