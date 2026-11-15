import { useEffect, useRef, useState } from "react";
import { AUDIO_EVENT, claimAudio, type AudioSource } from "@/lib/audio-bus";
import { LexiStorm } from "@/components/LexiStorm";
import { RadioDeck } from "@/components/RadioPlayer";
import { VideoReel } from "@/components/VideoReel";
import {
  ARTIST,
  LEAD_TRACK_ID,
  LEXI_ARTIST,
  LEXI_SPOTIFY_ARTIST,
  LEXI_YOUTUBE_CHANNEL,
  SPOTIFY_ARTIST,
  SPOTIFY_PLAYLIST,
  TRACKS,
  YOUTUBE_CHANNEL,
  YOUTUBE_MUSIC_PLAYLIST,
  type Track,
} from "@/lib/music";

type StreamLink = { name: string; href: string };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function releasedLabel(iso: string): string {
  const [year, month, day] = iso.split("-");
  const name = MONTHS[Number(month) - 1];
  return name && day && year ? `${name} ${Number(day)}, ${year}` : iso;
}

function streamLinks(track: Track): StreamLink[] {
  return [
    track.spotify ? { name: "Spotify", href: track.spotify } : null,
    track.youtubeMusic ? { name: "YouTube Music", href: track.youtubeMusic } : null,
    track.artist === LEXI_ARTIST || !track.youtube
      ? null
      : { name: "YouTube", href: track.youtube },
    track.appleMusic ? { name: "Apple Music", href: track.appleMusic } : null,
  ].filter((link): link is StreamLink => link !== null);
}

export function Music() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const active = TRACKS.find((track) => track.id === activeId) ?? null;

  useEffect(() => {
    const onClaim = (event: Event) => {
      if ((event as CustomEvent<AudioSource>).detail === "music") return;
      audioRef.current?.pause();
    };
    window.addEventListener(AUDIO_EVENT, onClaim);
    return () => window.removeEventListener(AUDIO_EVENT, onClaim);
  }, []);

  const markMissing = (id: string) => {
    setFailed((current) => ({ ...current, [id]: true }));
    setPlaying(false);
  };

  const play = async (track: Track) => {
    if (!track.preview || failed[track.id]) return;
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
    claimAudio("music");
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

        <LexiStorm />

        <div className="music-radio-row">
          <div className="music-catalog">
        <div className="music-player">
          <p id="music-player-note" className="note">
            Play a 30-second preview when this site has one. Full songs open from the store buttons.
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

        <div className="music-playlists">
          <a className="btn btn-ghost" href={SPOTIFY_ARTIST} target="_blank" rel="noopener noreferrer">
            LathosWorld on Spotify
            <span className="visually-hidden"> (opens in a new tab)</span>
          </a>
          <a className="btn btn-ghost" href={SPOTIFY_PLAYLIST} target="_blank" rel="noopener noreferrer">
            LathosWorld playlist on Spotify
            <span className="visually-hidden"> (opens in a new tab)</span>
          </a>
          <a className="btn btn-ghost" href={YOUTUBE_MUSIC_PLAYLIST} target="_blank" rel="noopener noreferrer">
            LathosWorld playlist on YouTube Music
            <span className="visually-hidden"> (opens in a new tab)</span>
          </a>
          <a className="btn btn-ghost" href={YOUTUBE_CHANNEL} target="_blank" rel="noopener noreferrer">
            LathosWorld on YouTube
            <span className="visually-hidden"> (opens in a new tab)</span>
          </a>
          <a className="btn btn-ghost" href={LEXI_SPOTIFY_ARTIST} target="_blank" rel="noopener noreferrer">
            Lexi Storm on Spotify
            <span className="visually-hidden"> (opens in a new tab)</span>
          </a>
          <a className="btn btn-ghost" href={LEXI_YOUTUBE_CHANNEL} target="_blank" rel="noopener noreferrer">
            Lexi Storm on YouTube
            <span className="visually-hidden"> (opens in a new tab)</span>
          </a>
        </div>

        <ol className="music-list" aria-label="Tracks, newest verified release first">
          {TRACKS.map((track) => {
            const missing = failed[track.id] === true;
            const isActive = activeId === track.id;
            const isLead = track.id === LEAD_TRACK_ID;
            const action = isActive && playing ? "Pause" : "Play";
            const links = streamLinks(track);
            const length = track.duration ? `, ${track.duration}` : "";
            const identity = (
              <span className="music-copy">
                {track.released ? (
                  <span className="music-date">{releasedLabel(track.released)}</span>
                ) : null}
                {isLead ? <span className="music-flag">Featured</span> : null}
                <span className="music-name">{track.title}</span>
                <span className="music-by">
                  {track.artist}
                  {track.album ? ` · ${track.album}` : ""}
                </span>
                {track.note ? <span className="music-note">{track.note}</span> : null}
              </span>
            );
            return (
              <li
                key={track.id}
                className={`music-row${isLead ? " is-lead" : ""}${isActive ? " is-active" : ""}${missing ? " is-missing" : ""}`}
                aria-current={isActive ? "true" : undefined}
              >
                {track.preview ? (
                  <button
                    type="button"
                    className="music-main"
                    aria-disabled={missing}
                    aria-pressed={isActive}
                    aria-label={
                      missing
                        ? `${track.title} by ${track.artist}, preview unavailable`
                        : `${action} ${track.title} by ${track.artist}${length}`
                    }
                    onClick={() => void play(track)}
                  >
                    <span className="music-glyph" aria-hidden="true">
                      {isActive && playing ? "❚❚" : "▶"}
                    </span>
                    {identity}
                  </button>
                ) : (
                  <div className="music-main">{identity}</div>
                )}
                <span className="music-time">{track.duration ?? ""}</span>
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
                  <span className="music-missing">Not verified yet</span>
                )}
              </li>
            );
          })}
        </ol>
          </div>
          <div className="radio-stack">
            <RadioDeck />
            <VideoReel />
          </div>
        </div>
      </div>
    </section>
  );
}
