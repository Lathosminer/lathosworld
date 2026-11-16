import { useEffect, useRef, useState } from "react";
import { AUDIO_EVENT, claimAudio, type AudioSource } from "@/lib/audio-bus";
import {
  FOOTSTEPS_VIDEO_ID,
  homeShowcase,
  parseReelManifest,
  REEL_MANIFEST_URL,
  type HomeReelEntry,
  type ReelClip,
} from "@/lib/reel";
import { attachYouTubePlayer } from "@/lib/youtube-iframe";

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

const FOOTSTEPS_SRC = `https://www.youtube-nocookie.com/embed/${FOOTSTEPS_VIDEO_ID}?autoplay=1&mute=1&playsinline=1&rel=0&enablejsapi=1`;

/**
 * Home-page reel. A missing or broken manifest still shows the Footsteps lyric
 * video. The other clips stay in their showcase order after it.
 */
export function VideoReel() {
  const [items, setItems] = useState<HomeReelEntry[] | null>(null);
  const [index, setIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const frontRef = useRef<HTMLVideoElement>(null);
  const backRef = useRef<HTMLVideoElement>(null);
  const ytRef = useRef<HTMLIFrameElement>(null);
  const fails = useRef(0);
  const mutedRef = useRef(true);
  const advanceRef = useRef<() => void>(() => {});
  mutedRef.current = muted;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      let parsed: ReelClip[] = [];
      try {
        const response = await fetch(REEL_MANIFEST_URL, { cache: "no-store" });
        if (!response.ok) throw new Error(String(response.status));
        parsed = parseReelManifest(await response.json());
      } catch {
        parsed = [];
      }
      if (cancelled) return;
      setItems(homeShowcase(parsed));
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

  const item = items?.[index] ?? null;
  const clip = item?.kind === "clip" ? item.clip : null;
  const nextEntry =
    items && items.length > 1
      ? (items.slice(index + 1).find((entry) => entry.kind === "clip") ??
        items.find((entry) => entry.kind === "clip"))
      : undefined;
  const nextClip = nextEntry?.kind === "clip" ? nextEntry.clip : null;

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

  const advance = () => {
    if (!items || items.length === 0) return;
    fails.current = 0;
    setIndex((current) => (current + 1) % items.length);
  };
  advanceRef.current = advance;

  useEffect(() => {
    if (item?.kind !== "youtube") return;
    let moved = false;
    const go = () => {
      if (moved) return;
      moved = true;
      advanceRef.current();
    };
    const timer = window.setTimeout(go, 240_000);
    const frame = ytRef.current;
    if (frame) {
      void attachYouTubePlayer(frame, { onEnded: go });
    }
    return () => {
      moved = true;
      window.clearTimeout(timer);
    };
  }, [item]);

  if (!items || !item) return null;

  const onError = () => {
    fails.current += 1;
    const clipCount = items.filter((entry) => entry.kind === "clip").length;
    if (clipCount > 0 && fails.current >= clipCount) {
      setItems(items.filter((entry) => entry.kind === "youtube"));
      setIndex(0);
      return;
    }
    advance();
  };

  if (item.kind === "youtube") {
    return (
      <section className="reel-section" aria-label="Video reel">
        <p className="kicker">Reel</p>
        <div className="reel-stage is-landscape">
          <iframe
            ref={ytRef}
            className="youtube-frame reel-front"
            src={FOOTSTEPS_SRC}
            title={item.title}
            loading="lazy"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
          />
          <p className="reel-caption">
            <span>{item.title}</span>
          </p>
        </div>
      </section>
    );
  }

  const toggleMute = () => {
    setMuted((current) => {
      if (current) claimAudio("reel");
      return !current;
    });
  };

  return (
    <section className="reel-section" aria-label="Video reel">
      <p className="kicker">Reel</p>
      <div className={`reel-stage is-${clip?.orientation ?? "landscape"}`}>
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
          loop={items.length === 1}
          onEnded={advance}
          onError={onError}
        />
        <button type="button" className="reel-sound" aria-pressed={!muted} onClick={toggleMute}>
          {muted ? "Unmute" : "Mute"}
        </button>
        <p className="reel-caption">
          <span>{clip?.category === "lexi" ? "Lexi Storm" : clip?.title}</span>
          <span className="reel-cat">{clip ? categoryLabel(clip.category) : ""}</span>
        </p>
        {nextClip ? (
          <video
            className="reel-preload"
            src={nextClip.src}
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
