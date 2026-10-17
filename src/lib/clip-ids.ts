/** Stable ids for clip comment threads. Keep aligned with the clips in `Clips.tsx`. */
export const CLIP_DISCUSSION_IDS = [
  "twitch:DignifiedUgliestArmadilloTwitchRPG-n9yOfV6fiIcWsBMM",
  "twitch:CrepuscularDifferentHawkTBTacoRight-SJ_rYvnelqtp_0N8",
  "file:/clips/once-human-moving-base-v1.mp4",
  "yt:uVXvTdaZFpo",
] as const;

export type ClipDiscussionId = (typeof CLIP_DISCUSSION_IDS)[number];

type ClipIdentity =
  | { kind: "twitch"; slug: string }
  | { kind: "yt"; id: string }
  | { kind: "mp4"; src: string };

/** Id stored on `discussion_post.scope` as `clip:<id>`. */
export function clipDiscussionId(clip: ClipIdentity): string {
  if (clip.kind === "twitch") return `twitch:${clip.slug}`;
  if (clip.kind === "yt") return `yt:${clip.id}`;
  return `file:${clip.src}`;
}

export function isClipDiscussionId(value: string): value is ClipDiscussionId {
  return (CLIP_DISCUSSION_IDS as readonly string[]).includes(value);
}

export function clipScope(clipId: string): string {
  return `clip:${clipId}`;
}
