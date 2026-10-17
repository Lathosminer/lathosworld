import { useState } from "react";
import { CreatorShoutout } from "@/components/CreatorShoutout";
import { ClipComments } from "@/components/Talk";
import {
  PLAYABLE_CLIPS,
  chicagoDateKey,
  clipDiscussionId,
  clipThumb,
  clipsJsonLd,
  layoutDailyClips,
  youtubeVideosPage,
  type Clip,
  type DailyClipLayout,
} from "@/lib/clips";
import { YT_CHANNEL } from "@/lib/youtube-live.functions";

const YOUTUBE_VIDEOS = youtubeVideosPage(YT_CHANNEL);

const JSON_LD = clipsJsonLd();

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
}: {
  clip: Clip;
  active: boolean;
  onPlay: (id: string) => void;
  comments: boolean;
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
            <img src={clipThumb(clip)} alt={`${clip.title}: ${clip.game} on LathosWorld`} loading="lazy" decoding="async" width={640} height={360} />
            <span className="clip-play" aria-hidden="true">▶</span>
          </button>
        )}
      </div>
      <figcaption>
        <strong>{clip.title}</strong>
        <span>{clip.description}</span>
        <span className="clip-tags">{source} · {clip.tags.map((tag) => `#${tag.replace(/[^A-Za-z0-9]/g, "")}`).join(" ")}</span>
      </figcaption>
      {comments ? <ClipComments clipId={id} /> : null}
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
    />
  );
  const shoutout = <CreatorShoutout key="creator-shoutout" />;
  return (
    <div className={comments ? "clip-grid with-talk" : "clip-grid"}>
      {layout.lead.map(card)}
      {layout.shoutout === "under-demon-hunter" ? shoutout : null}
      {layout.rest.map(card)}
      {layout.shoutout === "under-featured" ? shoutout : null}
    </div>
  );
}

function YouTubeArchiveLink() {
  return (
    <div className="cta-row">
      <a className="btn btn-cyan" href={YOUTUBE_VIDEOS} target="_blank" rel="noopener noreferrer">
        See all clips & videos on YouTube
        <span className="visually-hidden"> (opens in a new tab)</span>
      </a>
    </div>
  );
}

export function ClipBrowser({ comments = false }: { comments?: boolean }) {
  const layout = layoutDailyClips(PLAYABLE_CLIPS, chicagoDateKey());
  const [playing, setPlaying] = useState<string | null>(null);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON_LD }} />
      <FeaturedGrid layout={layout} playing={playing} onPlay={setPlaying} comments={comments} />
      <YouTubeArchiveLink />
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
        <p className="serif-line">Today's clips from Twitch and YouTube. They change at midnight Central.</p>
        <ClipBrowser />
      </div>
    </section>
  );
}
