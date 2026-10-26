/**
 * Lexi Storm, special guest.
 *
 * The welcome film is swapped here and only here. Home and /lexi both read
 * `LEXI_WELCOME`. Point `src` at the finished file when it exists, and swap
 * `poster` if the opening frame should change with it.
 * `placeholder` stays true while the Once Human cosplay clip is standing in.
 */
export const LEXI_WELCOME = {
  src: "/lexi/welcome-placeholder.mp4",
  poster: "/lexi/welcome-poster.webp",
  width: 720,
  height: 1280,
  placeholder: true,
  label: "Placeholder welcome from Lexi Storm. Once Human survivor cosplay. The finished welcome video is still coming.",
  note: "Placeholder welcome. This loop is Lexi's Once Human survivor cosplay while the finished welcome is still coming.",
} as const;

export const LEXI_X = {
  href: "https://x.com/LexiStormXOXO",
  handle: "@LexiStormXOXO",
} as const;

export type LexiTrack = {
  title: string;
  credit?: string;
  /** Real listening URL, when the site already has one. */
  href?: string;
};

/** Released singles. No listening links live in the repo yet, so href stays unset. */
export const LEXI_TRACKS: readonly LexiTrack[] = [
  { title: "The Light" },
  { title: "Why" },
  { title: "Deeper Than the Ocean" },
  { title: "No One Can Help Me Except" },
  { title: "Lost Treasure", credit: "feat. Lexi Storm" },
];

export const LEXI_ALBUMS = [
  {
    mark: "Album A",
    title: "LathosWorld feat. Lexi Storm",
    line: "With LathosWorld",
    status: "Coming soon",
  },
  {
    mark: "Album B",
    title: "Lexi Storm",
    line: "Her solo album",
    status: "Coming soon",
  },
] as const;

export type LexiStill = {
  src: string;
  srcSet: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
};

function still(file: string, alt: string, caption: string): LexiStill {
  return {
    src: `/lexi/${file}-1080.webp`,
    srcSet: `/lexi/${file}-640.webp 640w, /lexi/${file}-1080.webp 1080w`,
    width: 1080,
    height: 1920,
    alt,
    caption,
  };
}

export const LEXI_STILLS: readonly LexiStill[] = [
  still(
    "neon-ruins",
    "Lexi Storm in Once Human survivor cosplay, white ponytail and black jacket, standing in neon ruins at dusk with a purple prop rifle.",
    "Neon ruins at dusk",
  ),
  still(
    "mask-portrait",
    "Lexi Storm in a white respirator and black jacket, holding a purple prop rifle under red and blue light.",
    "Mask on",
  ),
  still(
    "hero-kneel",
    "Lexi Storm kneeling in Once Human survivor cosplay on a blue set, prop rifle across her lap and a respirator at her collar.",
    "Hero kneel",
  ),
];

export const LEXI_COPY = {
  kicker: "Special guest",
  name: "Lexi Storm",
  welcome: "Lexi welcomes everybody to LathosWorld.",
  home: "Lexi Storm is an adult AI singer and character. She is a PS5 fangirl and a cosplayer. She features on LathosWorld's music.",
  page: "Lexi Storm is an adult AI singer and character. She is a PS5 fangirl and a cosplayer, and a special guest on LathosWorld. She features on the music here. Album A is with LathosWorld. Album B is hers alone. Both are on the way.",
} as const;
