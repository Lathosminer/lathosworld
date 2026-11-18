import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";
import {
  LEXI_FADE_MS,
  LEXI_PRELOAD_AHEAD,
  LEXI_SLIDE_COUNT,
  LEXI_SLIDE_MS,
  LEXI_SLIDES,
} from "@/lib/lexi-slideshow";

const frameStyle = { "--lexi-fade": `${LEXI_FADE_MS}ms` } as CSSProperties;

function finePointer(): boolean {
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

/**
 * Lexi Storm photos beside the highlight reel. One photo is on screen.
 * The next two are fetched ahead; the other files stay unloaded.
 */
export function LexiSlideshow() {
  const [index, setIndex] = useState(0);
  const [outgoing, setOutgoing] = useState<number | null>(null);
  const [hovering, setHovering] = useState(false);
  const [paused, setPaused] = useState(false);
  const [near, setNear] = useState(false);
  const indexRef = useRef(0);
  const frameRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const hold = hovering || paused || !near;

  const go = useCallback((delta: number) => {
    const current = indexRef.current;
    const next = (current + delta + LEXI_SLIDE_COUNT) % LEXI_SLIDE_COUNT;
    if (next === current) return;
    indexRef.current = next;
    setOutgoing(current);
    setIndex(next);
  }, []);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setNear(Boolean(entry?.isIntersecting));
      },
      { rootMargin: "240px" },
    );
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (hold) return;
    const timer = window.setTimeout(() => go(1), LEXI_SLIDE_MS);
    return () => window.clearTimeout(timer);
  }, [go, hold, index]);

  useEffect(() => {
    if (outgoing === null) return;
    const timer = window.setTimeout(() => setOutgoing(null), LEXI_FADE_MS);
    return () => window.clearTimeout(timer);
  }, [index, outgoing]);

  useEffect(() => {
    if (!near) return;
    const preload = Array.from({ length: LEXI_PRELOAD_AHEAD }, (_, offset) => {
      const image = new Image();
      image.decoding = "async";
      image.src = LEXI_SLIDES[(index + offset + 1) % LEXI_SLIDE_COUNT]!.src;
      return image;
    });
    return () => {
      for (const image of preload) image.src = "";
    };
  }, [index, near]);

  const slide = LEXI_SLIDES[index]!;
  const leaving = outgoing !== null && outgoing !== index ? LEXI_SLIDES[outgoing] : null;

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse") return;
    touchStart.current = { x: event.clientX, y: event.clientY };
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse") return;
    const origin = touchStart.current;
    touchStart.current = null;
    if (!origin) return;
    if ((event.target as HTMLElement).closest("button")) return;
    if (Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > 12) return;
    setPaused((current) => !current);
  };

  return (
    <section className="lexi-slideshow" aria-labelledby="lexi-slideshow-title">
      <p className="kicker" id="lexi-slideshow-title">
        Lexi Storm
      </p>
      <div
        ref={frameRef}
        className="lexi-slideshow-frame"
        style={frameStyle}
        onMouseEnter={() => {
          if (finePointer()) setHovering(true);
        }}
        onMouseLeave={() => setHovering(false)}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        {leaving ? (
          <img
            className="lexi-slide is-out"
            src={leaving.src}
            alt=""
            aria-hidden="true"
            decoding="async"
          />
        ) : null}
        <img
          key={slide.src}
          className={leaving ? "lexi-slide is-current is-in" : "lexi-slide is-current"}
          src={slide.src}
          alt={slide.alt}
          decoding="async"
          loading="lazy"
          draggable={false}
        />
        <button
          type="button"
          className="lexi-slide-nav lexi-slide-prev"
          aria-label="Previous photo"
          onClick={() => go(-1)}
        >
          <span aria-hidden="true">‹</span>
        </button>
        <button
          type="button"
          className="lexi-slide-nav lexi-slide-next"
          aria-label="Next photo"
          onClick={() => go(1)}
        >
          <span aria-hidden="true">›</span>
        </button>
        {hold && near ? <p className="lexi-slide-paused">Paused</p> : null}
        <p className="lexi-slide-count">
          <span className="visually-hidden">Photo </span>
          {index + 1} / {LEXI_SLIDE_COUNT}
        </p>
      </div>
    </section>
  );
}
