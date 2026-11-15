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
