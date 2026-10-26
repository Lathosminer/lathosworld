import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { LEXI_ALBUMS, LEXI_COPY, LEXI_STILLS, LEXI_TRACKS, LEXI_WELCOME, LEXI_X } from "@/lib/lexi";

function StormField() {
  return (
    <svg className="lexi-sky" viewBox="0 0 1200 800" preserveAspectRatio="xMaxYMin slice" aria-hidden="true">
      <path
        className="lexi-sky-bolt"
        d="M860 20 700 280h120L690 620l250-330H820L980 20H860z"
        fill="none"
        stroke="#8B6CFF"
        strokeWidth="8"
        strokeLinejoin="miter"
      />
      <path d="M220 80 140 220h70L150 420l140-190H220L290 80H220z" fill="#D7DEEA" opacity="0.35" />
    </svg>
  );
}

function LexiWelcome() {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const start = () => {
      if (motion.matches) return;
      void video.play().catch(() => {});
    };
    if (!("IntersectionObserver" in window)) {
      start();
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          start();
          io.disconnect();
        }
      },
      { rootMargin: "240px 0px" },
    );
    io.observe(video);
    const onChange = () => {
      if (motion.matches) video.pause();
    };
    motion.addEventListener("change", onChange);
    return () => {
      io.disconnect();
      motion.removeEventListener("change", onChange);
    };
  }, []);

  return (
    <figure className="lexi-welcome" id="lexi-welcome">
      <div className="lexi-frame">
        {LEXI_WELCOME.placeholder ? <span className="lexi-flag">Placeholder</span> : null}
        <video
          ref={ref}
          className="lexi-welcome-video"
          muted
          loop
          playsInline
          controls
          preload="none"
          poster={LEXI_WELCOME.poster}
          width={LEXI_WELCOME.width}
          height={LEXI_WELCOME.height}
          aria-label={LEXI_WELCOME.label}
        >
          <source src={LEXI_WELCOME.src} type="video/mp4" />
        </video>
      </div>
      <figcaption>{LEXI_WELCOME.note}</figcaption>
    </figure>
  );
}

function LexiTracks() {
  return (
    <div className="lexi-block">
      <h3>Released singles</h3>
      <ol className="lexi-tracks">
        {LEXI_TRACKS.map((track) => {
          const body = (
            <>
              <span>
                <strong>{track.title}</strong>
                {track.credit ? <em>{track.credit}</em> : null}
              </span>
              <b>Out</b>
            </>
          );
          return (
            <li key={track.title}>
              {track.href ? (
                <a href={track.href} target="_blank" rel="noopener noreferrer">
                  {body}
                </a>
              ) : (
                body
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function LexiAlbums() {
  return (
    <div className="lexi-block">
      <h3>Albums coming soon</h3>
      <ul className="lexi-albums">
        {LEXI_ALBUMS.map((album) => (
          <li key={album.mark}>
            <b>{album.mark}</b>
            <strong>{album.title}</strong>
            <span>{album.line}</span>
            <em>{album.status}</em>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LexiStills() {
  return (
    <div className="lexi-gallery">
      <h3>Cosplay</h3>
      <p>Once Human survivor cosplay.</p>
      <ul className="lexi-stills">
        {LEXI_STILLS.map((shot) => (
          <li key={shot.src}>
            <figure>
              <img
                src={shot.src}
                srcSet={shot.srcSet}
                sizes="(min-width: 900px) 22rem, 72vw"
                width={shot.width}
                height={shot.height}
                alt={shot.alt}
                loading="lazy"
                decoding="async"
              />
              <figcaption>{shot.caption}</figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LexiActions({ variant }: { variant: "home" | "page" }) {
  return (
    <div className="cta-row">
      {variant === "home" ? (
        <Link className="btn btn-violet" to="/lexi">
          Lexi's page
        </Link>
      ) : (
        <Link className="btn btn-violet" to="/">
          LathosWorld
        </Link>
      )}
      <a className="btn btn-ghost" href={LEXI_X.href} target="_blank" rel="noopener noreferrer">
        {LEXI_X.handle}
      </a>
    </div>
  );
}

export function LexiGuest({ variant = "home" }: { variant?: "home" | "page" }) {
  const Heading = variant === "page" ? "h1" : "h2";
  return (
    <section className={`lexi-feature lexi-feature-${variant}`} id={variant === "home" ? "lexi" : undefined} aria-labelledby="lexi-title">
      <StormField />
      <div className="wrap lexi-split">
        <LexiWelcome />
        <div className="lexi-copy">
          <p className="kicker">{LEXI_COPY.kicker}</p>
          <p className="lexi-ai">
            <b>AI</b>
            Adult singer and character
          </p>
          <Heading id="lexi-title">{LEXI_COPY.name}</Heading>
          <p className="serif-line">{LEXI_COPY.welcome}</p>
          <p className="lexi-lead">{variant === "page" ? LEXI_COPY.page : LEXI_COPY.home}</p>
          <LexiTracks />
          <LexiAlbums />
          <LexiActions variant={variant} />
        </div>
      </div>
      <div className="wrap">
        <LexiStills />
      </div>
    </section>
  );
}
