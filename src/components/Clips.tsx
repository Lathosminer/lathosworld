import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { CreatorShoutout } from "@/components/CreatorShoutout";
import {
  PLAYABLE_CLIPS,
  clipDiscussionId,
  clipGames,
  clipThumb,
  clipsJsonLd,
  chicagoDateKey,
  layoutDailyClips,
  type Clip,
  type DailyClipLayout,
} from "@/lib/clips";

const JSON_LD = clipsJsonLd();

/** Mount point for per-clip discussion. Keyed by clipDiscussionId. Empty until comments render. */
export function ClipCommentHook({ clipId }: { clipId: string }) {
  return <div className="clip-comments" data-clip-id={clipId} />;
}

function ClipEmbed({ clip }: { clip: Clip }) {
  if (clip.kind === "twitch") {
    return (
      <iframe
        src={`https://clips.twitch.tv/embed?clip=${clip.slug}&parent=lathosworld.com&parent=www.lathosworld.com&autoplay=true`}
        title={clip.title}
        allow="autoplay; fullscreen"
        allowFullScreen
        loading="lazy"
      />
    );
  }
  if (clip.kind === "mp4") {
    return <video src={clip.src} poster={clip.poster} controls autoPlay playsInline preload="none" aria-label={clip.title} />;
  }
  return (
    <iframe
      src={`https://www.youtube-nocookie.com/embed/${clip.id}?autoplay=1&rel=0`}
      title={clip.title}
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
      allowFullScreen
      loading="lazy"
    />
  );
}

function ClipCard({
  clip,
  active,
  onPlay,
  comments,
  thumbSize,
}: {
  clip: Clip;
  active: boolean;
  onPlay: (id: string) => void;
  comments: boolean;
  thumbSize: "featured" | "archive";
}) {
  const id = clipDiscussionId(clip);
  const source = clip.kind === "yt" ? "YouTube" : "Twitch";
  return (
    <figure className="clip-card gif-lightning" data-clip-id={id} data-tags={clip.tags.join(",")}>
      <div className="clip-media">
        {active ? (
          <ClipEmbed clip={clip} />
        ) : (
          <button type="button" className="clip-facade" onClick={() => onPlay(id)} aria-label={`Play ${clip.title} (${source}, ${clip.game})`}>
            <img src={clipThumb(clip, thumbSize)} alt={`${clip.title}: ${clip.game} on LathosWorld`} loading="lazy" decoding="async" width={640} height={360} />
            <span className="clip-play" aria-hidden="true">▶</span>
          </button>
        )}
      </div>
      <figcaption>
        <strong>{clip.title}</strong>
        <span>{clip.description}</span>
        <span className="clip-tags">{source} · {clip.tags.map((tag) => `#${tag.replace(/[^A-Za-z0-9]/g, "")}`).join(" ")}</span>
      </figcaption>
      {comments ? <ClipCommentHook clipId={id} /> : null}
    </figure>
  );
}

function FeaturedGrid({
  layout,
  playing,
  onPlay,
  comments,
}: {
  layout: DailyClipLayout;
  playing: string | null;
  onPlay: (id: string) => void;
  comments: boolean;
}) {
  const card = (clip: Clip) => (
    <ClipCard
      key={clipDiscussionId(clip)}
      clip={clip}
      active={playing === clipDiscussionId(clip)}
      onPlay={onPlay}
      comments={comments}
      thumbSize="featured"
    />
  );
  const shoutout = <CreatorShoutout key="creator-shoutout" />;
  return (
    <div className="clip-grid">
      {layout.lead.map(card)}
      {layout.shoutout === "under-demon-hunter" ? shoutout : null}
      {layout.rest.map(card)}
      {layout.shoutout === "under-featured" ? shoutout : null}
    </div>
  );
}

function ClipArchive({
  layout,
  playing,
  onPlay,
  comments,
}: {
  layout: DailyClipLayout;
  playing: string | null;
  onPlay: (id: string) => void;
  comments: boolean;
}) {
  const games = ["All", ...clipGames(PLAYABLE_CLIPS)];
  const [game, setGame] = useState("All");
  const shown = game === "All" ? layout.archive : layout.archive.filter((clip) => clip.game === game);
  return (
    <section className="clip-archive" id="archive" aria-labelledby="archive-title">
      <div className="banner">
        <h2 id="archive-title">Archive</h2>
      </div>
      <p className="serif-line">The rest of the clips. A still frame until you press play.</p>
      <div className="clip-filters" role="toolbar" aria-label="Filter the archive by game">
        {games.map((name) => (
          <button key={name} type="button" className={name === game ? "btn btn-cyan" : "btn btn-ghost"} onClick={() => setGame(name)} aria-pressed={name === game}>
            {name}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <p className="serif-line">{layout.archive.length === 0 ? "Today's clips are the whole list." : "Nothing in the archive for this game."}</p>
      ) : (
        <div className="clip-grid">
          {shown.map((clip) => (
            <ClipCard
              key={clipDiscussionId(clip)}
              clip={clip}
              active={playing === clipDiscussionId(clip)}
              onPlay={onPlay}
              comments={comments}
              thumbSize="archive"
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function ClipBrowser({ filters = false, comments = false }: { filters?: boolean; comments?: boolean }) {
  const layout = layoutDailyClips(PLAYABLE_CLIPS, chicagoDateKey());
  const [playing, setPlaying] = useState<string | null>(null);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON_LD }} />
      <FeaturedGrid layout={layout} playing={playing} onPlay={setPlaying} comments={comments} />
      {filters ? <ClipArchive layout={layout} playing={playing} onPlay={setPlaying} comments={comments} /> : null}
    </>
  );
}

export function Clips() {
  return (
    <section className="section" id="clips" aria-labelledby="clips-title">
      <div className="wrap">
        <div className="banner">
          <h2 id="clips-title">Clips</h2>
        </div>
        <p className="serif-line">
          Today's clips from Twitch and YouTube. They change at midnight Central. <Link to="/clips" hash="archive">Archive</Link>
        </p>
        <ClipBrowser />
      </div>
    </section>
  );
}
