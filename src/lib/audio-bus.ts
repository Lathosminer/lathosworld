/** One audible source at a time: radio, a song preview, the hero bed, or the reel. */
export const AUDIO_EVENT = "lathosworld-audio";

export type AudioSource = "radio" | "music" | "hero" | "reel";

export function claimAudio(source: AudioSource) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<AudioSource>(AUDIO_EVENT, { detail: source }));
}
