import { LexiStorm } from "@/components/LexiStorm";
import { VideoReel } from "@/components/VideoReel";
import {
  ARTIST,
  LEXI_SPOTIFY_ARTIST,
  LEXI_YOUTUBE_CHANNEL,
  SPOTIFY_ARTIST,
  SPOTIFY_PLAYLIST,
  SUNO_RUINS,
  YOUTUBE_CHANNEL,
  YOUTUBE_MUSIC_PLAYLIST,
} from "@/lib/music";

const LINKS = [
  { name: "LathosWorld on Spotify", href: SPOTIFY_ARTIST },
  { name: "LathosWorld playlist on Spotify", href: SPOTIFY_PLAYLIST },
  { name: "LathosWorld playlist on YouTube Music", href: YOUTUBE_MUSIC_PLAYLIST },
  { name: "LathosWorld on YouTube", href: YOUTUBE_CHANNEL },
  { name: "Built From The Ruins on Suno", href: SUNO_RUINS },
  { name: "Lexi Storm on Spotify", href: LEXI_SPOTIFY_ARTIST },
  { name: "Lexi Storm on YouTube", href: LEXI_YOUTUBE_CHANNEL },
] as const;

export function Music() {
  return (
    <section className="section music-section" id="music" aria-labelledby="music-title">
      <div className="wrap">
        <div className="banner">
          <p className="kicker">{ARTIST}</p>
          <h2 id="music-title">Music</h2>
        </div>
        <div className="music-playlists">
          {LINKS.map((link) => (
            <a key={link.href} className="btn btn-ghost" href={link.href} target="_blank" rel="noopener noreferrer">
              {link.name}
              <span className="visually-hidden"> (opens in a new tab)</span>
            </a>
          ))}
        </div>
        <LexiStorm />
        <VideoReel />
      </div>
    </section>
  );
}
