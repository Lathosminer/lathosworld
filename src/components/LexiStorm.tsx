import { useEffect, useRef, useState } from "react";
import { RadioDeck } from "@/components/RadioPlayer";
import { FEATURED_ARTIST } from "@/lib/music";
import { LEXI_SHOWCASE, parseReelManifest, pickShowcase, REEL_MANIFEST_URL, type ReelClip } from "@/lib/reel";

function isLexiClip(clip: ReelClip): boolean {
  return clip.category === "lexi" && clip.title.includes("Lexi Storm (AI)");
}

/** Muted Lexi pictures from the reel. Images above this stay if the file is down. */
function LexiReel() {
  const [clips, setClips] = useState<ReelClip[] | null>(null);
  const [index, setIndex] = useState(0);
  const [motion, setMotion] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fails = useRef(0);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setMotion(!media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!motion) return;
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(REEL_MANIFEST_URL, { cache: "no-store" });
        if (!response.ok) throw new Error(String(response.status));
        const parsed = pickShowcase(parseReelManifest(await response.json()).filter(isLexiClip), LEXI_SHOWCASE);
        if (!cancelled) setClips(parsed.length > 0 ? parsed : null);
      } catch {
        if (!cancelled) setClips(null);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [motion]);

  const clip = clips?.[index] ?? null;
  const next = clips && clips.length > 1 ? clips[(index + 1) % clips.length] : null;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !clip) return;
    let cancelled = false;
    video.muted = true;
    if (video.getAttribute("src") !== clip.src) video.src = clip.src;
    const start = async () => {
      try {
        await video.play();
      } catch {
        if (!cancelled) setClips(null);
      }
    };
    void start();
    return () => {
      cancelled = true;
    };
  }, [clip]);

  if (!motion || !clips || !clip) return null;

  const advance = () => {
    fails.current = 0;
    setIndex((current) => (current + 1) % clips.length);
  };

  return (
    <div className={`lexi-reel is-${clip.orientation}`}>
      <video
        ref={videoRef}
        muted
        playsInline
        autoPlay
        preload="auto"
        loop={clips.length === 1}
        aria-label={clip.title}
        onEnded={advance}
        onError={() => {
          fails.current += 1;
          if (fails.current >= clips.length) {
            setClips(null);
            return;
          }
          setIndex((current) => (current + 1) % clips.length);
        }}
      />
      {next ? (
        <video className="reel-preload" src={next.src} preload="auto" muted playsInline aria-hidden="true" tabIndex={-1} />
      ) : null}
      <p className="lexi-reel-caption">{clip.title.replace(/ - Lexi Storm \(AI\)$/, "")}</p>
    </div>
  );
}

export function LexiStorm() {
  return (
    <article className="lexi" id="lexi" aria-labelledby="lexi-title">
      <div className="lexi-visuals">
        <div className="lexi-stills">
          {FEATURED_ARTIST.images.map((image) => (
            <img
              key={image.src}
              src={image.src}
              width={image.width}
              height={image.height}
              alt={image.alt}
              decoding="async"
            />
          ))}
        </div>
        <LexiReel />
      </div>
      <div className="lexi-copy">
        <p className="kicker">{FEATURED_ARTIST.role}</p>
        <h3 id="lexi-title">{FEATURED_ARTIST.name}</h3>
        <p className="serif-line">{FEATURED_ARTIST.intro}</p>
        <RadioDeck placement="lexi" />
        <a
          className="lexi-qr"
          href="https://www.instagram.com/lexistorm.xo/"
          target="_blank"
          rel="noopener"
        >
          <img
            src="/qr/lexi-instagram-qr.webp"
            width={400}
            height={583}
            alt="Scan to follow Lexi Storm on Instagram @lexistorm.xo"
            decoding="async"
          />
          <span>Follow Lexi on Instagram</span>
        </a>
      </div>
    </article>
  );
}
