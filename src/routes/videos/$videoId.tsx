import { getFeedVideo } from "@/lib/youtube-feed.functions";
import { VIDEO_ID_RE, snippet, videoPageModel, type VideoPageModel } from "@/lib/youtube-feed";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";

export const Route = createFileRoute("/videos/$videoId")({
  loader: async ({ params }): Promise<VideoPageModel> => {
    if (!VIDEO_ID_RE.test(params.videoId)) throw notFound();
    const video = await getFeedVideo({ data: params.videoId });
    return videoPageModel(params.videoId, video);
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "LathosWorld" }] };
    const description = snippet(loaderData.description);
    return {
      meta: [
        { title: `${loaderData.title} · LathosWorld` },
        { name: "description", content: description },
        { property: "og:type", content: "video.other" },
        { property: "og:site_name", content: "LathosWorld" },
        { property: "og:title", content: loaderData.title },
        { property: "og:description", content: description },
        { property: "og:url", content: loaderData.url },
        { property: "og:image", content: loaderData.image },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: loaderData.title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: loaderData.image },
      ],
      links: [{ rel: "canonical", href: loaderData.url }],
    };
  },
  component: VideoPage,
});

function VideoPage() {
  const video = Route.useLoaderData();
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
            <Link to="/clips">Clips</Link>
          </p>
          <p className="kicker">Video</p>
          <h1>{video.title}</h1>
          <div className="youtube">
            <iframe
              className="youtube-frame"
              src={`https://www.youtube-nocookie.com/embed/${video.id}?rel=0`}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
          <p className="video-copy">{video.description}</p>
          <p className="page-link">
            <Link to="/">Back to LathosWorld</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
