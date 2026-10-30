import { useEffect, useRef, useState } from "react";
import {
  ARTIST,
  FEATURED_ARTIST,
  LEAD_TRACK_ID,
  TRACKS,
  downloadUrl,
  streamUrl,
  type Track,
} from "@/lib/music";

type Availability = Record<string, boolean>;

export function Music() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [availability, setAvailability] = useState<Availability | null>(null);
  const active = TRACKS.find((track) => track.id === activeId) ?? null;

  useEffect(() => {
    let alive = true;
    const unavailable = Object.fromEntries(TRACKS.map((track) => [track.id, false])) as Availability;
    fetch("/api/music")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("unavailable"))))
      .then((body: { tracks?: Availability }) => {
        if (!alive) return;
        setAvailability(body.tracks ?? unavailable);
      })
      .catch(() => {
        if (alive) setAvailability(unavailable);
      });
    return () => {
      alive = false;
    };
  }, []);

  const markMissing = (id: string) => {
    setAvailability((current) => ({ ...(current ?? {}), [id]: false }));
    setPlaying(false);
  };

  const play = async (track: Track) => {
    if (availability?.[track.id] === false) return;
    const audio = audioRef.current;
    if (!audio) return;
    if (activeId === track.id && !audio.paused && audio.src) {
      audio.pause();
      return;
    }
    if (audio.dataset.track !== track.id) {
      audio.src = streamUrl(track);
      audio.dataset.track = track.id;
    }
    setActiveId(track.id);
    try {
      await audio.play();
    } catch {
      /* The play button stays. A missing file is handled by onError. */
    }
  };

  return (
    <section className="section music-section" id="music" aria-labelledby="music-title">
      <div className="wrap">
        <img
          className="music-mark"
          src="/mark-1280.webp"
          width={1280}
          height={720}
          alt="LathosWorld"
          decoding="async"
        />
        <div className="banner">
          <p className="kicker">{ARTIST}</p>
          <h2 id="music-title">Music</h2>
        </div>

        <article className="music-feature" aria-labelledby="lexi-title">
          <img
            src={FEATURED_ARTIST.image}
            width={FEATURED_ARTIST.imageWidth}
            height={FEATURED_ARTIST.imageHeight}
            alt={FEATURED_ARTIST.imageAlt}
            decoding="async"
          />
          <div>
            <p className="kicker">Featured artist · {FEATURED_ARTIST.role}</p>
            <h3 id="lexi-title">{FEATURED_ARTIST.name}</h3>
            <p className="serif-line">{FEATURED_ARTIST.intro}</p>
            <p className="music-feature-link">
              <a href={FEATURED_ARTIST.youtube} target="_blank" rel="noopener noreferrer">
                {FEATURED_ARTIST.youtubeLabel}
                <span className="visually-hidden"> (opens in a new tab)</span>
              </a>
            </p>
          </div>
        </article>

        <div className="music-player">
          <p id="music-player-note" className="note">
            Play a track here. Download stays on the track row.
          </p>
          <audio
            ref={audioRef}
            controls
            controlsList="nodownload"
            preload="none"
            aria-label={active ? `${active.artist} player: ${active.title}` : `${ARTIST} player. Choose a track.`}
            aria-describedby="music-player-note"
            onContextMenu={(event) => event.preventDefault()}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onError={() => {
              const id = audioRef.current?.dataset.track;
              if (id) markMissing(id);
            }}
          />
          <p className="visually-hidden" aria-live="polite">
            {active ? `${playing ? "Playing" : "Paused"} ${active.title}` : "No track selected"}
          </p>
        </div>

        <ol className="music-list" aria-label="Tracks">
          {TRACKS.map((track) => {
            const known = availability?.[track.id];
            const ready = known === true;
            const missing = known === false;
            const isActive = activeId === track.id;
            const isLead = track.id === LEAD_TRACK_ID;
            const action = !availability ? "Checking" : isActive && playing ? "Pause" : "Play";
            return (
              <li
                key={track.id}
                className={`music-row${isLead ? " is-lead" : ""}${isActive ? " is-active" : ""}${missing ? " is-missing" : ""}`}
                aria-current={isActive ? "true" : undefined}
              >
                <button
                  type="button"
                  className="music-main"
                  aria-disabled={!ready}
                  aria-pressed={isActive}
                  aria-label={
                    missing
                      ? `${track.title} by ${track.artist}, unavailable`
                      : ready
                        ? `${action} ${track.title} by ${track.artist}, ${track.duration}`
                        : `Checking ${track.title} by ${track.artist}`
                  }
                  onClick={() => void play(track)}
                >
                  <span className="music-glyph" aria-hidden="true">
                    {isActive && playing ? "❚❚" : "▶"}
                  </span>
                  <span className="music-copy">
                    {isLead ? <span className="music-flag">Featured</span> : null}
                    <span className="music-name">{track.title}</span>
                    <span className="music-by">
                      {track.artist}
                      {track.album ? ` · ${track.album}` : ""}
                    </span>
                  </span>
                </button>
                <span className="music-time">{track.duration}</span>
                {ready ? (
                  <a
                    className="btn btn-ghost music-download"
                    href={downloadUrl(track)}
                    download={track.downloadFilename}
                    aria-label={`Download ${track.title} by ${track.artist}, WAV`}
                  >
                    Download
                  </a>
                ) : (
                  <span className="music-missing">{missing ? "Unavailable" : "Checking"}</span>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
