import { useEffect, useRef, useState } from "react";
import { AUDIO_EVENT, claimAudio, type AudioSource } from "@/lib/audio-bus";
import { parseReelManifest, REEL_MANIFEST_URL, shuffleReel, type ReelClip } from "@/lib/reel";

const CATEGORY_LABEL: Record<string, string> = {
  promo: "Promo",
  canvas: "Canvas",
  lava: "Lava",
  short: "Short",
  demo: "Demo",
  lexi: "Lexi",
  gameplay: "Gameplay",
};

function categoryLabel(category: string): string {
  return (
    CATEGORY_LABEL[category] ??
    category.replace(
      /(^|-)([a-z])/g,
      (_match, sep: string, letter: string) => sep + letter.toUpperCase(),
    )
  );
}

/**
 * Home-page reel. A missing or broken manifest renders nothing, so the rest
 * of the page stays up while videos.lathosworld.com is still being wired.
 */
export function VideoReel() {
  const [clips, setClips] = useState<ReelClip[] | null>(null);
  const [index, setIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const frontRef = useRef<HTMLVideoElement>(null);
  const backRef = useRef<HTMLVideoElement>(null);
  const fails = useRef(0);
  const mutedRef = useRef(true);
  mutedRef.current = muted;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(REEL_MANIFEST_URL, { cache: "no-store" });
        if (!response.ok) throw new Error(String(response.status));
        const parsed = shuffleReel(parseReelManifest(await response.json()));
        if (cancelled) return;
        setClips(parsed.length > 0 ? parsed : null);
      } catch {
        if (!cancelled) setClips(null);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onClaim = (event: Event) => {
      if ((event as CustomEvent<AudioSource>).detail === "reel") return;
      setMuted(true);
    };
    window.addEventListener(AUDIO_EVENT, onClaim);
    return () => window.removeEventListener(AUDIO_EVENT, onClaim);
  }, []);

  const clip = clips?.[index] ?? null;
  const next = clips && clips.length > 1 ? clips[(index + 1) % clips.length] : null;

  useEffect(() => {
    const front = frontRef.current;
    const back = backRef.current;
    if (!front || !clip) return;
    let cancelled = false;
    if (front.getAttribute("src") !== clip.src) {
      front.src = clip.src;
      if (back) back.src = clip.src;
    }
    front.muted = mutedRef.current;
    if (back) back.muted = true;
    const start = async () => {
      try {
        await front.play();
      } catch {
        if (cancelled || front.muted) return;
        front.muted = true;
        setMuted(true);
        try {
          await front.play();
        } catch {
          /* A bad file is handled by onError. */
        }
      }
      if (cancelled || !back) return;
      try {
        if (Number.isFinite(front.currentTime)) back.currentTime = front.currentTime;
      } catch {
        /* The backdrop can wait for metadata. */
      }
      try {
        await back.play();
      } catch {
        /* The sharp video is the one that matters. */
      }
    };
    void start();
    return () => {
      cancelled = true;
    };
  }, [clip]);

  useEffect(() => {
    const front = frontRef.current;
    if (!front) return;
    front.muted = muted;
  }, [muted, clip]);

  if (!clips || !clip) return null;

  const advance = () => {
    fails.current = 0;
    setIndex((current) => (current + 1) % clips.length);
  };

  const onError = () => {
    fails.current += 1;
    if (fails.current >= clips.length) {
      setClips(null);
      return;
    }
    setIndex((current) => (current + 1) % clips.length);
  };

  const toggleMute = () => {
    setMuted((current) => {
      if (current) claimAudio("reel");
      return !current;
    });
  };

  return (
    <section className="reel-section" aria-label="Video reel">
      <p className="kicker">Reel</p>
      <div className={`reel-stage is-${clip.orientation}`}>
        <video
          ref={backRef}
          className="reel-back"
          muted
          playsInline
          preload="metadata"
          aria-hidden="true"
        />
        <video
          ref={frontRef}
          className="reel-front"
          muted={muted}
          playsInline
          autoPlay
          preload="auto"
          loop={clips.length === 1}
          onEnded={advance}
          onError={onError}
        />
        <button type="button" className="reel-sound" aria-pressed={!muted} onClick={toggleMute}>
          {muted ? "Unmute" : "Mute"}
        </button>
        <p className="reel-caption">
          <span>{clip.title}</span>
          <span className="reel-cat">{categoryLabel(clip.category)}</span>
        </p>
        {next ? (
          <video
            className="reel-preload"
            src={next.src}
            preload="auto"
            muted
            playsInline
            aria-hidden="true"
            tabIndex={-1}
          />
        ) : null}
      </div>
    </section>
  );
}
