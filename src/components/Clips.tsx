import { useState } from "react";

const SITE = "https://lathosworld.com";
const TWITCH_VOD = "https://www.twitch.tv/videos/2900991343";
const VOD_DATE = "2026-10-15T00:04:41Z"; // Twitch VOD 2900991343 broadcast start

type Base = { title: string; description: string; game: string; tags: string[]; uploadDate: string };
type Clip =
  | (Base & { kind: "mp4"; src: string; poster: string; duration: string })
  | (Base & { kind: "yt"; id: string })
  | (Base & { kind: "twitch"; slug: string; channel: string; poster: string; duration: string });

// Captions are checked against the footage: Twitch clips by frames + on-screen callouts (no speech in the VOD),
// YouTube by the video's own title. YouTube embeds start at 0 (no chapter or replay data to justify a jump).
const CLIPS: Clip[] = [
  {
    kind: "twitch", slug: "DignifiedUgliestArmadilloTwitchRPG-n9yOfV6fiIcWsBMM", channel: "the_demon_hunter3",
    title: "can you fly bobby?", game: "ARC Raiders",
    description: "Funny and friendly: \"I believe I can fly\" up on the rooftops, then the squad runs on through the rail yard. Clipped by Lathos on the_demon_hunter3's stream.",
    tags: ["ARC Raiders", "LathosWorld", "the_demon_hunter3", "Twitch clip", "funny"],
    poster: "/clips/arc-raiders-can-you-fly-bobby.webp", duration: "PT30S", uploadDate: "2026-10-09T05:32:05Z",
  },
  {
    kind: "twitch", slug: "CrepuscularDifferentHawkTBTacoRight-SJ_rYvnelqtp_0N8", channel: "the_demon_hunter3",
    title: "Hades 🐕 Check on your dawg", game: "LABYRINTHINE",
    description: "Funny and friendly: chilling on the LABYRINTHINE menu with Hades the dog while we wait. \"You okay, Hades? Come here. No, not over there.\" Clipped by Lathos on the_demon_hunter3's stream.",
    tags: ["LABYRINTHINE", "LathosWorld", "the_demon_hunter3", "Twitch clip", "dog"],
    poster: "/clips/labyrinthine-hades-check-on-your-dawg.webp", duration: "PT28S", uploadDate: "2026-10-04T07:23:14Z",
  },
  {
    kind: "mp4", title: "We're Back In! | Once Human Login to Base", game: "Once Human",
    description: "Server notice, a glitchy login, the Once Human title screen, then straight back home to the base.",
    tags: ["Once Human", "LathosWorld", "Twitch clip", "survival game", "login"],
    src: "/clips/once-human-back-in-v1.mp4", poster: "/clips/once-human-back-in-v1.jpg", duration: "PT35S", uploadDate: VOD_DATE,
  },
  {
    kind: "mp4", title: "Moving My ENTIRE Base in Once Human", game: "Once Human",
    description: "Picking up the whole territory and scouting the map for the perfect new spot.",
    tags: ["Once Human", "LathosWorld", "Twitch clip", "base building", "move territory"],
    src: "/clips/once-human-moving-base-v1.mp4", poster: "/clips/once-human-moving-base-v1.jpg", duration: "PT1M15S", uploadDate: VOD_DATE,
  },
  {
    kind: "mp4", title: "New Base, New Neighborhood | Once Human", game: "Once Human",
    description: "Territory move confirmed, then out to explore the cliffs around the new home.",
    tags: ["Once Human", "LathosWorld", "Twitch clip", "open world", "exploring"],
    src: "/clips/once-human-new-base-v1.mp4", poster: "/clips/once-human-new-base-v1.jpg", duration: "PT48S", uploadDate: VOD_DATE,
  },
  {
    kind: "yt", id: "uVXvTdaZFpo", title: "Once Human GamePlay (Talking to you!BOOMY!)", game: "Once Human",
    description: "Once Human gameplay on the LathosWorld YouTube channel.",
    tags: ["Once Human", "LathosWorld", "gameplay", "YouTube"], uploadDate: "2026-09-01T18:56:49-07:00",
  },
  {
    kind: "yt", id: "ap7OTBLAFYc", title: "Lord of the Rings: War in the North – Legacy Edition Gameplay | Live Stream (Aug 16, 2026)", game: "The Lord of the Rings: War in the North",
    description: "The Lord of the Rings: War in the North – Legacy Edition gameplay on the LathosWorld YouTube channel.",
    tags: ["Lord of the Rings", "War in the North", "LathosWorld", "gameplay", "YouTube"], uploadDate: "2026-09-11T17:03:51-07:00",
  },
  {
    kind: "yt", id: "wagiK0c-Dn4", title: "Destiny 2 Gameplay – Full Live Stream (Jun 25, 2026) | LathosWorld", game: "Destiny 2",
    description: "Destiny 2 gameplay on the LathosWorld YouTube channel.",
    tags: ["Destiny 2", "LathosWorld", "gameplay", "YouTube"], uploadDate: "2026-09-11T16:46:29-07:00",
  },
];

const thumb = (c: Clip) => (c.kind === "yt" ? `https://i.ytimg.com/vi/${c.id}/hqdefault.jpg` : c.poster);
const abs = (u: string) => (u.startsWith("http") ? u : SITE + u);

const JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": CLIPS.map((c) => ({
    "@type": "VideoObject",
    name: c.title,
    description: c.description,
    thumbnailUrl: abs(thumb(c)),
    uploadDate: c.uploadDate,
    keywords: c.tags.join(", "),
    genre: c.game,
    author: { "@type": "Person", name: "Lathos", url: SITE },
    ...(c.kind === "mp4"
      ? { contentUrl: abs(c.src), duration: c.duration, isBasedOn: TWITCH_VOD }
      : c.kind === "twitch"
        ? { embedUrl: `https://clips.twitch.tv/embed?clip=${c.slug}&parent=lathosworld.com`, url: `https://www.twitch.tv/${c.channel}/clip/${c.slug}`, duration: c.duration }
        : { embedUrl: `https://www.youtube-nocookie.com/embed/${c.id}`, url: `https://www.youtube.com/watch?v=${c.id}` }),
  })),
}).replace(/</g, "\\u003c");

function ClipCard({ clip }: { clip: Clip }) {
  const [on, setOn] = useState(false);
  const source = clip.kind === "yt" ? "YouTube" : "Twitch";
  return (
    <figure className="clip-card gif-lightning" data-tags={clip.tags.join(",")}>
      <div className="clip-media">
        {!on ? (
          <button type="button" className="clip-facade" onClick={() => setOn(true)} aria-label={`Play ${clip.title} (${source}, ${clip.game})`}>
            <img src={thumb(clip)} alt={`${clip.title}: ${clip.game} on LathosWorld`} loading="lazy" decoding="async" width={640} height={360} />
            <span className="clip-play" aria-hidden="true">▶</span>
          </button>
        ) : clip.kind === "twitch" ? (
          <iframe
            src={`https://clips.twitch.tv/embed?clip=${clip.slug}&parent=lathosworld.com&parent=www.lathosworld.com&autoplay=true`}
            title={clip.title}
            allow="autoplay; fullscreen"
            allowFullScreen
          />
        ) : clip.kind === "mp4" ? (
          <video src={clip.src} poster={clip.poster} controls autoPlay playsInline preload="metadata" aria-label={clip.title} />
        ) : (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${clip.id}?autoplay=1&rel=0`}
            title={clip.title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        )}
      </div>
      <figcaption>
        <strong>{clip.title}</strong>
        <span>{clip.description}</span>
        <span className="clip-tags">{source} · {clip.tags.map((t) => `#${t.replace(/[^A-Za-z0-9]/g, "")}`).join(" ")}</span>
      </figcaption>
    </figure>
  );
}

export function Clips() {
  return (
    <section className="section" id="clips" aria-labelledby="clips-title">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON_LD }} />
      <div className="wrap">
        <div className="banner">
          <h2 id="clips-title">Clips</h2>
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
