export const REEL_MANIFEST_URL = "https://videos.lathosworld.com/reel.json";

export const REEL_CATEGORIES = [
  "promo",
  "canvas",
  "lava",
  "short",
  "demo",
  "lexi",
  "gameplay",
] as const;

export type ReelCategory = (typeof REEL_CATEGORIES)[number];
export type ReelOrientation = "portrait" | "landscape";

export type ReelClip = {
  src: string;
  title: string;
  category: string;
  orientation: ReelOrientation;
  duration: number;
};

/** Listed categories, plus later ones such as gameplay, as long as the token is plain. */
function categoryOf(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const category = value.trim().toLowerCase();
  if (!/^[a-z][a-z0-9-]{0,24}$/.test(category)) return null;
  return category;
}

function httpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/** Keep only well-formed clips. A bad document, or an empty one, yields nothing. */
export function parseReelManifest(data: unknown): ReelClip[] {
  if (!Array.isArray(data)) return [];
  const clips: ReelClip[] = [];
  for (const item of data) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const src = typeof row.src === "string" ? row.src.trim() : "";
    const title = typeof row.title === "string" ? row.title.trim() : "";
    const category = categoryOf(row.category);
    const orientation = row.orientation;
    const duration = typeof row.duration === "number" ? row.duration : Number.NaN;
    if (!src || !httpUrl(src) || !title || !category) continue;
    if (orientation !== "portrait" && orientation !== "landscape") continue;
    if (!Number.isFinite(duration) || duration < 0) continue;
    clips.push({
      src,
      title,
      category,
      orientation,
      duration,
    });
  }
  return clips;
}

/** Fisher–Yates. The page shuffles once when the manifest loads. */
export function shuffleReel<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const next = items.slice();
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const swap = next[i] as T;
    next[i] = next[j] as T;
    next[j] = swap;
  }
  return next;
}

/** Hand-picked showcase: album covers first, a few Lexi pictures, a few of our MP4s. No prototypes. */
export const SHOWCASE_REEL = [
  "reel_005.mp4", // Built From the Ruins (cover)
  "reel_058.mp4", // Lexi and LW2 lounge duet
  "reel_001.mp4", // LathosWorld Trailer
  "reel_008.mp4", // Hope (cover)
  "reel_092.mp4", // Lexi solo lounge close-up
  "reel_041.mp4", // After Me (cover)
  "reel_108.mp4", // LathosWorld 4K Thunder Piano
  "reel_090.mp4", // Ghost in the Mix (cover)
  "reel_087.mp4", // Lexi and LW2 intense gaze
  "reel_165.mp4", // The Test of Time (cover)
  "reel_072.mp4", // Lathos and Lexi photo
  "reel_137.mp4", // Love Me in Slow Motion (cover)
] as const;

/** Lexi card loop: finished pictures of her only. */
export const LEXI_SHOWCASE = ["reel_058.mp4", "reel_092.mp4", "reel_087.mp4", "reel_070.mp4"] as const;

/** Keep only the listed files, in the listed order. */
export function pickShowcase(clips: ReelClip[], files: readonly string[]): ReelClip[] {
  const byFile = new Map(clips.map((clip) => [clip.src.split("/").pop() ?? "", clip]));
  return files.flatMap((file) => {
    const clip = byFile.get(file);
    return clip ? [clip] : [];
  });
}
