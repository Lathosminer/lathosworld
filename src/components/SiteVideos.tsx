import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AUDIO_EVENT, claimVisual, claimedVisual, type AudioSource } from "@/lib/audio-bus";
import {
  SITE_VIDEOS,
  getSiteVideo,
  siteVideoUrl,
  type SiteVideo,
  type SiteVideoSlug,
} from "@/lib/visuals";

function SiteVideoPlayer({ video }: { video: SiteVideo }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const onClaim = (event: Event) => {
      const source = (event as CustomEvent<AudioSource>).detail;
      const node = ref.current;
      if (!node || node.paused) return;
      if (source === "visual" && claimedVisual() === video.slug) return;
      node.pause();
    };
    window.addEventListener(AUDIO_EVENT, onClaim);
    return () => window.removeEventListener(AUDIO_EVENT, onClaim);
  }, [video.slug]);

  return (
    <video
      ref={ref}
      className="site-video"
      controls
      playsInline
      preload="metadata"
      poster={video.poster}
      width={video.width}
      height={video.height}
      aria-label={video.title}
      onPlay={() => claimVisual(video.slug)}
    >
      <source src={video.src} type="video/mp4" />
    </video>
  );
}

function ShareLink({ video }: { video: SiteVideo }) {
  if (video.slug === "lightning-logo") {
    return <Link to="/videos/lightning-logo">Share this video</Link>;
  }
  return <Link to="/videos/footsteps-end-screen">Share this video</Link>;
}

function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const copy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const field = document.createElement("textarea");
        field.value = url;
        field.setAttribute("readonly", "");
        field.style.position = "fixed";
        field.style.opacity = "0";
        document.body.appendChild(field);
        field.select();
        document.execCommand("copy");
        field.remove();
      }
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* The address stays on the page to copy by hand. */
    }
  };
  return (
    <button className="btn btn-ghost" type="button" onClick={copy}>
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}

export function SiteVideos() {
  return (
    <section className="section visuals-section" id="videos" aria-labelledby="videos-title">
      <div className="wrap">
        <div className="banner">
          <p className="kicker">LathosWorld</p>
          <h2 id="videos-title">Videos</h2>
        </div>
        <p className="serif-line">Watch them here. Each one has its own page to share.</p>
        <div className="visuals-grid">
          {SITE_VIDEOS.map((video) => (
            <article key={video.slug} className="visual-card" aria-labelledby={`visual-${video.slug}`}>
              <SiteVideoPlayer video={video} />
              <p className="visual-meta">
                <span>{video.durationLabel}</span>
                <span>{video.artist}</span>
              </p>
              <h3 id={`visual-${video.slug}`}>{video.title}</h3>
              <p className="visual-blurb">{video.description}</p>
              <p className="visual-share">
                <ShareLink video={video} />
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SiteVideoPage({ slug }: { slug: SiteVideoSlug }) {
  const video = getSiteVideo(slug);
  const url = siteVideoUrl(video);
  return (
    <main className="gate gate-wide">
      <Link className="brand" to="/">
        <img src="/mark-sm.webp" width={40} height={40} alt="" decoding="async" />
        <span>lathosworld.com</span>
      </Link>
      <section className="section video-stage">
        <div className="wrap">
          <p className="page-jump">
            <Link to="/">Home</Link>
            <a href="/#videos">Videos</a>
            {slug === "lightning-logo" ? (
              <Link to="/videos/footsteps-end-screen">Glowing Eyes</Link>
            ) : (
              <Link to="/videos/lightning-logo">Lightning Logo</Link>
            )}
          </p>
          <p className="kicker">{video.artist}</p>
          <h1>{video.title}</h1>
          <SiteVideoPlayer video={video} />
          <p className="visual-meta">
            <span>{video.durationLabel}</span>
            <span>{video.artist}</span>
          </p>
          <p className="video-copy">{video.description}</p>
          <p className="visual-url">
            <a href={url}>{url}</a>
          </p>
          <div className="cta-row visual-copy-row">
            <CopyLink url={url} />
          </div>
          <p className="page-link">
            <Link to="/">Back to LathosWorld</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
