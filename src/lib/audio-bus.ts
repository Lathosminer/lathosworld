/** One audible source at a time: radio, a song preview, the hero bed, the reel, or a site video. */
export const AUDIO_EVENT = "lathosworld-audio";

export type AudioSource = "radio" | "music" | "hero" | "reel" | "visual";

export function claimAudio(source: AudioSource) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<AudioSource>(AUDIO_EVENT, { detail: source }));
}

let visualToken = "";

/** The site video that last asked for the speakers. Other players pause themselves. */
export function claimVisual(token: string) {
  visualToken = token;
  claimAudio("visual");
}

export function claimedVisual(): string {
  return visualToken;
}
