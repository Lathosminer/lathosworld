import type { MusicBucket } from "./music.ts";

/**
 * R2 binding `MUSIC` (bucket `lathosworld-music`). Missing in local dev and
 * anywhere the binding is not attached, which the player treats as unavailable.
 */
export async function getMusicBucket(): Promise<MusicBucket | null> {
  try {
    const mod = await import(/* @vite-ignore */ "cloudflare:workers");
    return mod.env?.MUSIC ?? null;
  } catch {
    return null;
  }
}
