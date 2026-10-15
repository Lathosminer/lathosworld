import { useState } from "react";

type Clip =
  | { kind: "mp4"; title: string; note: string; src: string; poster: string }
  | { kind: "yt"; title: string; note: string; id: string; start: number };

const CLIPS: Clip[] = [
  { kind: "mp4", title: "We're Back In!", note: "Twitch · Once Human", src: "/clips/once-human-back-in-v1.mp4", poster: "/clips/once-human-back-in-v1.jpg" },
  { kind: "mp4", title: "Moving My ENTIRE Base", note: "Twitch · Once Human", src: "/clips/once-human-moving-base-v1.mp4", poster: "/clips/once-human-moving-base-v1.jpg" },
  { kind: "mp4", title: "New Base, New Neighborhood", note: "Twitch · Once Human", src: "/clips/once-human-new-base-v1.mp4", poster: "/clips/once-human-new-base-v1.jpg" },
  { kind: "yt", title: "Talking to you! BOOMY!", note: "YouTube · Once Human", id: "uVXvTdaZFpo", start: 60 },
  { kind: "yt", title: "War in the North", note: "YouTube · LOTR: War in the North", id: "ap7OTBLAFYc", start: 60 },
  { kind: "yt", title: "Destiny 2", note: "YouTube · Destiny 2", id: "wagiK0c-Dn4", start: 60 },
];

function ClipCard({ clip }: { clip: Clip }) {
  const [on, setOn] = useState(false);
  const poster = clip.kind === "mp4" ? clip.poster : `https://i.ytimg.com/vi/${clip.id}/hqdefault.jpg`;
  return (
    <figure className="clip-card gif-lightning">
      <div className="clip-media">
        {!on ? (
          <button type="button" className="clip-facade" onClick={() => setOn(true)} aria-label={`Play ${clip.title}`}>
            <img src={poster} alt="" loading="lazy" decoding="async" width={640} height={360} />
            <span className="clip-play" aria-hidden="true">▶</span>
          </button>
        ) : clip.kind === "mp4" ? (
          <video src={clip.src} poster={clip.poster} controls autoPlay playsInline preload="metadata" />
        ) : (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${clip.id}?start=${clip.start}&autoplay=1&rel=0`}
            title={clip.title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        )}
      </div>
      <figcaption>
        <strong>{clip.title}</strong>
        <span>{clip.note}</span>
      </figcaption>
    </figure>
  );
}

export function Clips() {
  return (
    <section className="section" id="clips" aria-label="Clips">
      <div className="wrap">
        <div className="banner">
          <h2>Clips</h2>
        </div>
        <p className="serif-line">The best bits from Twitch and YouTube.</p>
        <div className="clip-grid">
          {CLIPS.map((clip) => (
            <ClipCard key={clip.title} clip={clip} />
          ))}
        </div>
      </div>
    </section>
  );
}
