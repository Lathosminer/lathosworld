import { useEffect, useRef } from "react";
import { useRadioNowPlaying } from "@/components/RadioPlayer";
import { FOOTSTEPS_CAPTION, FOOTSTEPS_VIDEO_ID } from "@/lib/reel";
import { attachYouTubePlayer, pauseVideo, playMuted, type YouTubeHandle } from "@/lib/youtube-iframe";

const SRC = `https://www.youtube-nocookie.com/embed/${FOOTSTEPS_VIDEO_ID}?rel=0&playsinline=1&enablejsapi=1`;

/** Muted lyric video above the radio. The station's audio is the soundtrack. */
export function FootstepsLyric() {
  const { title } = useRadioNowPlaying();
  const frameRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<YouTubeHandle | null>(null);
  const attaching = useRef<Promise<YouTubeHandle | null> | null>(null);
  const wantPlay = useRef(false);
  const footsteps = title.toLowerCase().includes("footsteps");
  wantPlay.current = footsteps;

  useEffect(() => {
    let cancelled = false;
    const sync = async () => {
      if (!wantPlay.current) {
        if (playerRef.current) pauseVideo(playerRef.current);
        return;
      }
      if (!playerRef.current) {
        const frame = frameRef.current;
        if (!frame) return;
        attaching.current ??= attachYouTubePlayer(frame);
        const player = await attaching.current;
        if (cancelled || !player) return;
        playerRef.current = player;
      }
      if (wantPlay.current && playerRef.current) playMuted(playerRef.current);
    };
    void sync();
    return () => {
      cancelled = true;
    };
  }, [footsteps]);

  return (
    <div>
      <iframe
        ref={frameRef}
        className="youtube-frame"
        src={SRC}
        title={FOOTSTEPS_CAPTION}
        loading="lazy"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        referrerPolicy="strict-origin-when-cross-origin"
      />
      <p className="note">{FOOTSTEPS_CAPTION}</p>
    </div>
  );
}
