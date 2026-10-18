import { useCallback, useEffect, useRef, useState } from "react";

/*
 * Tribute to Anthony "Dangerous Dane" Hooker (Dec 10, 1949 – Aug 1, 2023), Lathos's father.
 * Real photos only. Posters are print treatments of family photos and of a real frame
 * from the Sporting Life video; no faces are altered and nothing is AI generated.
 * Dates from his obituary; his saying as Jared remembers it.
 */

type Slide = { src: string; alt: string; caption: string; w: number; h: number };

const SLIDES: Slide[] = [
  {
    src: "/dane/poster-4-its-all-going-to-work-out.webp",
    w: 1200,
    h: 1800,
    alt: "Poster quoting Dane: It's all going to work out",
    caption: "“It’s all going to work out.” What he liked to tell anyone caught in the middle of their drama.",
  },
  {
    src: "/dane/poster-3-sporting-life.webp",
    w: 1200,
    h: 1800,
    alt: "Poster: Sporting Life featuring Dangerous Dane Hooker, made from a still of the band on stage",
    caption: "Sporting Life featuring Dangerous Dane Hooker. Still from Tara Robin McKenzie's video.",
  },
  {
    src: "/dane/family-2001.webp",
    w: 1800,
    h: 1018,
    alt: "The Hooker family together in front of a red car, around 2001",
    caption: "David, Nydina, Drake, Miranda, Katelynn, Nathan, Jared, Halle, Janice & Dane — around 2001",
  },
];

const POSTERS = [
  { src: "/dane/poster-6-dangerous-dane.webp", alt: "Dangerous Dane poster" },
  { src: "/dane/poster-7-doc-kirby-and-co-band.webp", alt: "Doc Kirby & Co. poster" },
  { src: "/dane/poster-8-doc-kirby-and-co-woods.webp", alt: "Doc Kirby & Co. poster" },
];

const VIDEO_ID = "PCADxCiq760";
const ADVANCE_MS = 6000;

function Slideshow() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const touchX = useRef<number | null>(null);
  const count = SLIDES.length;

  const go = useCallback((step: number) => setIndex((i) => (i + step + count) % count), [count]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  useEffect(() => {
    if (paused || reduced) return;
    const t = window.setTimeout(() => go(1), ADVANCE_MS);
    return () => window.clearTimeout(t);
  }, [index, paused, reduced, go]);

  // Only the current slide and its neighbours load, so the page stays light.
  const near = (i: number) => i === index || i === (index + 1) % count || i === (index - 1 + count) % count;

  return (
    <div
      className="dane-show"
      role="region"
      aria-roledescription="carousel"
      aria-label="Dangerous Dane photos and posters"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") go(-1);
        if (e.key === "ArrowRight") go(1);
      }}
      onTouchStart={(e) => {
        touchX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const start = touchX.current;
        touchX.current = null;
        const end = e.changedTouches[0]?.clientX;
        if (start == null || end == null) return;
        const dx = end - start;
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
      }}
    >
      <div className="dane-stage">
        {SLIDES.map((s, i) => (
          <figure key={s.src} className={i === index ? "dane-slide is-on" : "dane-slide"} aria-hidden={i !== index} aria-roledescription="slide" aria-label={`${i + 1} of ${count}`}>
            {near(i) ? <img src={s.src} alt={s.alt} width={s.w} height={s.h} decoding="async" loading="lazy" /> : null}
          </figure>
        ))}
        <button type="button" className="dane-nav dane-prev" onClick={() => go(-1)} aria-label="Previous photo">
          <span aria-hidden="true">‹</span>
        </button>
        <button type="button" className="dane-nav dane-next" onClick={() => go(1)} aria-label="Next photo">
          <span aria-hidden="true">›</span>
        </button>
      </div>
      <p className="dane-caption" aria-live="polite">
        {SLIDES[index].caption}
      </p>
      <div className="dane-dots" role="group" aria-label="Choose a photo">
        {SLIDES.map((s, i) => (
          <button key={s.src} type="button" className={i === index ? "is-on" : undefined} aria-label={`Photo ${i + 1}`} aria-current={i === index} onClick={() => setIndex(i)} />
        ))}
      </div>
    </div>
  );
}

function SportingLifeVideo() {
  const [play, setPlay] = useState(false);
  return (
    <figure className="dane-video">
      <div className="dane-video-frame">
        {play ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${VIDEO_ID}?autoplay=1&rel=0&vq=hd1080`}
            title="Sporting Life featuring Dangerous Dane Hooker"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        ) : (
          <button type="button" className="dane-video-play" onClick={() => setPlay(true)} aria-label="Play Sporting Life featuring Dangerous Dane Hooker">
            <img src="/dane/sporting-life-still.webp" alt="" width={758} height={480} loading="lazy" decoding="async" />
            <span className="dane-video-btn" aria-hidden="true">▶</span>
          </button>
        )}
      </div>
      <figcaption>
        <strong>Sporting Life featuring Dangerous Dane Hooker</strong>
        <span>
          Video from{" "}
          <a href={`https://www.youtube.com/watch?v=${VIDEO_ID}`} target="_blank" rel="noopener">
            Tara Robin McKenzie&apos;s channel
          </a>
          . Plays in HD.
        </span>
      </figcaption>
    </figure>
  );
}

export function DaneTribute() {
  return (
    <section className="section dane" id="dane" aria-labelledby="dane-title">
      <div className="wrap">
        <div className="banner dane-banner">
          <p className="kicker">In loving memory of my daddy</p>
          <h2 id="dane-title">Anthony “Dangerous Dane” Hooker</h2>
          <p className="dane-dates">December 10, 1949 – August 1, 2023</p>
        </div>
        <p className="serif-line dane-lede">Guitar player, Memphis musician, and my dad.</p>
        <blockquote className="dane-quote">
          <p>“It’s all going to work out.”</p>
        </blockquote>
        <div className="dane-grid">
          <Slideshow />
          <div className="dane-side">
            <SportingLifeVideo />
            <ul className="dane-posters" aria-label="Posters">
              {POSTERS.map((p) => (
                <li key={p.src}>
                  <a href={p.src} target="_blank" rel="noopener">
                    <img src={p.src} alt={p.alt} width={1200} height={1800} loading="lazy" decoding="async" />
                  </a>
                </li>
              ))}
            </ul>
            {/* STORIES PLACEHOLDER: Jared will send his stories about his dad. Add them here. */}
            <div className="dane-stories" data-placeholder="stories">
              <p className="kicker">His stories</p>
              <p>Stories about my dad are coming soon.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
