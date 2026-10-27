import { createServerFn } from "@tanstack/react-start";
import { VIDEO_ID_RE, isExcludedVideo, type YtVideo } from "./youtube-feed.ts";

/** Title and description for one video, from the cached YouTube feed when present. */
export const getFeedVideo = createServerFn({ method: "GET" })
  .validator((id: unknown) => String(id ?? ""))
  .handler(async ({ data }): Promise<YtVideo | null> => {
    if (!VIDEO_ID_RE.test(data) || isExcludedVideo(data)) return null;
    const { getYoutubeVideos } = await import("./youtube-feed.server.ts");
    const videos = await getYoutubeVideos();
    return videos.find((video) => video.id === data) ?? null;
  });
