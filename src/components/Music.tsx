import { useRef, useState } from "react";
import { ARTIST, FEATURED_ARTIST, LEAD_TRACK_ID, TRACKS, type Track } from "@/lib/music";

type StreamLink = { name: string; href: string };

function streamLinks(track: Track): StreamLink[] {
  return [
    track.spotify ? { name: "Spotify", href: track.spotify } : null,
    track.youtubeMusic ? { name: "YouTube Music", href: track.youtubeMusic } : null,
    track.appleMusic ? { name: "Apple Music", href: track.appleMusic } : null,
  ].filter((link): link is StreamLink => link !== null);
}

export function Music() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const active = TRACKS.find((track) => track.id === activeId) ?? null;

  const markMissing = (id: string) => {
    setFailed((current) => ({ ...current, [id]: true }));
    setPlaying(false);
  };

  const play = async (track: Track) => {
    if (failed[track.id]) return;
    const audio = audioRef.current;
    if (!audio) return;
    if (activeId === track.id && !audio.paused && audio.src) {
      audio.pause();
      return;
    }
    if (audio.dataset.track !== track.id) {
      audio.src = track.preview;
      audio.dataset.track = track.id;
    }
    setActiveId(track.id);
    try {
      await audio.play();
    } catch {
      /* The play button stays. A missing preview is handled by onError. */
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
            Play a 30-second preview. The full song streams from the buttons.
          </p>
          <audio
            ref={audioRef}
            controls
            controlsList="nodownload"
            preload="none"
            aria-label={
              active
                ? `${active.artist} player: ${active.title}`
                : `${ARTIST} player. Choose a track.`
            }
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
            const missing = failed[track.id] === true;
            const isActive = activeId === track.id;
            const isLead = track.id === LEAD_TRACK_ID;
            const action = isActive && playing ? "Pause" : "Play";
            const links = streamLinks(track);
            return (
              <li
                key={track.id}
                className={`music-row${isLead ? " is-lead" : ""}${isActive ? " is-active" : ""}${missing ? " is-missing" : ""}`}
                aria-current={isActive ? "true" : undefined}
              >
                <button
                  type="button"
                  className="music-main"
                  aria-disabled={missing}
                  aria-pressed={isActive}
                  aria-label={
                    missing
                      ? `${track.title} by ${track.artist}, preview unavailable`
                      : `${action} ${track.title} by ${track.artist}, ${track.duration}`
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
                {links.length > 0 ? (
                  <span className="music-links">
                    {links.map((link) => (
                      <a
                        key={link.name}
                        className="btn btn-ghost"
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {link.name}
                        <span className="visually-hidden">
                          : {track.title} by {track.artist} (opens in a new tab)
                        </span>
                      </a>
                    ))}
                  </span>
                ) : (
                  <span className="music-missing">No stream</span>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
