import { SOCIALS } from "./socials.ts";

/**
 * Released singles. Edit SINGLES to add or remove a track, or push an album
 * onto ALBUMS (Volume One and Volume Two stay off the page until then).
 * Audio is WAV only. Each `file` is an object key in the R2 bucket
 * `lathosworld-music`, served at `/music/<file>`. Keys must stay unique
 * across singles and albums.
 *
 * Durations are the released lengths, rounded to the nearest second.
 * "The Light" and "Why" keep the shorter titles; the store singles credit
 * Lexi Storm on both. "Blame Me (Rap Remix)" is the DistroKid single title.
 * Apple Music lists that Lexi Storm recording as "Blame Me (feat. LathosWorld)"
 * at 2:21.
 */
export const ARTIST = "LathosWorld";
export const LEXI_ARTIST = "Lexi Storm";

const youtube = SOCIALS.find((item) => item.name === "YouTube");
if (!youtube) throw new Error("LathosWorld YouTube link is missing from socials");

/** Same channel the homepage already uses for Lexi Storm's videos. */
export const LEXI_YOUTUBE_URL = youtube.href;

export const FEATURED_ARTIST = {
  name: "Lexi Storm",
  role: "AI character",
  intro: "Lexi Storm is the LathosWorld AI character. She sings with LathosWorld, and her own singles are in the list.",
  image: "/pins/lexi_leather_city_pin.jpg",
  imageWidth: 1000,
  imageHeight: 1500,
  imageAlt: "Lexi Storm, the LathosWorld AI character",
  youtube: LEXI_YOUTUBE_URL,
  youtubeLabel: "Watch Lexi Storm on YouTube",
} as const;

export const MUSIC_BUCKET = "lathosworld-music";
export const MUSIC_BINDING = "MUSIC";

/** One playable master. `file` is the R2 object key. */
export type ReleaseTrack = {
  title: string;
  /** mm:ss */
  duration: string;
  /** R2 object key under /music/. WAV only. */
  file: string;
};

export type SingleRelease = ReleaseTrack & {
  artist: string;
};

export type AlbumRelease = {
  artist: string;
  title: string;
  tracks: readonly ReleaseTrack[];
};

export type Track = ReleaseTrack & {
  id: string;
  artist: string;
  /** Suggested download filename. WAV only. */
  downloadFilename: string;
  /** Set when the track comes from ALBUMS. */
  album?: string;
};

const lw = (title: string, duration: string, file: string): SingleRelease => ({
  artist: ARTIST,
  title,
  duration,
  file,
});

const lexi = (title: string, duration: string, file: string): SingleRelease => ({
  artist: LEXI_ARTIST,
  title,
  duration,
  file,
});

/** Singles, in play order. Life (feat. Lexi Storm) stays first. */
export const SINGLES: readonly SingleRelease[] = [
  lw("Life (feat. Lexi Storm)", "3:46", "life-feat-lexi-storm.wav"),
  lw("Lost Treasure (Remastered)", "4:42", "lost-treasure-remastered.wav"),
  lw("Lost Treasure (feat. Lexi Storm)", "4:38", "lost-treasure-feat-lexi-storm.wav"),
  lw("Life (Heavy Metal)", "3:47", "life-heavy-metal.wav"),
  lw("Hope, Life and Light (Heavy Metal)", "3:27", "hope-life-and-light-heavy-metal.wav"),
  lw("Hope, Life and Light (Heavy Metal, Short Version)", "3:04", "hope-life-and-light-heavy-metal-short.wav"),
  lw("I Carry You With Me (Esme Version)", "1:49", "i-carry-you-with-me-esme-version.wav"),
  lw("I Carry You With Me (feat. Lexi Storm)", "2:04", "i-carry-you-with-me-feat-lexi-storm.wav"),
  lw("No One Can Help Me Except (feat. Lexi Storm)", "2:58", "no-one-can-help-me-except-feat-lexi-storm.wav"),
  lw("Deeper Than the Ocean (feat. Lexi Storm)", "3:04", "deeper-than-the-ocean-feat-lexi-storm.wav"),
  lw("The Light", "2:49", "the-light.wav"),
  lw("Why", "3:22", "why.wav"),
  lexi("Blame Me (Rap Remix)", "2:21", "lexi-storm-blame-me-rap-remix.wav"),
  lexi("Slow Motion", "2:46", "lexi-storm-slow-motion.wav"),
  lexi("Hope", "3:17", "lexi-storm-hope.wav"),
];

/**
 * Volume One (LathosWorld, 14 tracks) and Volume Two (Lexi Storm, 13 tracks)
 * are out. Leave them off this list until they should play on the site.
 * Adding one appends its tracks after the singles:
 *
 * { artist: "LathosWorld", title: "Volume One", tracks: [{ title, duration, file }] }
 * { artist: "Lexi Storm", title: "Volume Two", tracks: [{ title, duration, file }] }
 */
export const ALBUMS: readonly AlbumRelease[] = [];

function toTrack(artist: string, track: ReleaseTrack, album?: string): Track {
  return {
    id: track.file.replace(/\.wav$/i, ""),
    artist,
    title: track.title,
    duration: track.duration,
    file: track.file,
    downloadFilename: `${artist} - ${track.title}.wav`,
    ...(album ? { album } : {}),
  };
}

/** Singles first, then any album tracks, in catalog order. */
export const TRACKS: readonly Track[] = [
  ...SINGLES.map((single) => toTrack(single.artist, single)),
  ...ALBUMS.flatMap((album) => album.tracks.map((track) => toTrack(album.artist, track, album.title))),
];

/** Lead single. Stays first and is marked in the tracklist. */
export const LEAD_TRACK_ID = TRACKS[0]?.id ?? "";

export type MusicRange = {
  offset?: number;
  length?: number;
  suffix?: number;
};

/** Enough of an R2 object for streaming WAV responses. */
export type MusicObject = {
  size: number;
  httpEtag: string;
  range?: MusicRange;
  body?: ReadableStream<Uint8Array> | null;
  writeHttpMetadata?: (headers: Headers) => void;
};

export type MusicBucket = {
  head(key: string): Promise<MusicObject | null>;
  get(key: string, options?: { range?: Headers; onlyIf?: Headers }): Promise<MusicObject | null>;
};

export function streamUrl(track: Track): string {
  return `/music/${encodeURIComponent(track.file)}`;
}

export function downloadUrl(track: Track): string {
  return `${streamUrl(track)}?download=1`;
}

export function trackByFile(raw: string): Track | undefined {
  let file = raw.trim();
  if (!file || file.includes("\0") || file.includes("/") || file.includes("\\")) return undefined;
  try {
    file = decodeURIComponent(file);
  } catch {
    return undefined;
  }
  if (file.includes("/") || file.includes("\\") || file.includes("\0")) return undefined;
  if (!file.toLowerCase().endsWith(".wav")) return undefined;
  return TRACKS.find((track) => track.file === file);
}

export function contentDisposition(filename: string, download: boolean): string {
  const cleaned = filename.replace(/[\r\n"]/g, "");
  const encoded = encodeURIComponent(cleaned).replace(/[!'()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `${download ? "attachment" : "inline"}; filename="${cleaned}"; filename*=UTF-8''${encoded}`;
}

export function rangeBounds(size: number, range: MusicRange): { start: number; end: number } | null {
  if (size <= 0) return null;
  if (range.suffix !== undefined) {
    if (range.suffix <= 0) return null;
    const length = Math.min(range.suffix, size);
    return { start: size - length, end: size - 1 };
  }
  const start = range.offset ?? 0;
  if (!Number.isFinite(start) || start < 0 || start >= size) return null;
  const length = range.length ?? size - start;
  if (!Number.isFinite(length) || length <= 0) return null;
  const end = Math.min(size - 1, start + length - 1);
  if (end < start) return null;
  return { start, end };
}

function notFound(): Response {
  return new Response("Not found", {
    status: 404,
    headers: {
      "cache-control": "no-store",
      "content-type": "text/plain; charset=utf-8",
    },
  });
}

export function musicFileResponse(options: {
  request: Request;
  track: Track;
  object: MusicObject | null;
  download: boolean;
  method: "GET" | "HEAD";
}): Response {
  const { request, track, object, download, method } = options;
  if (!object) return notFound();

  const headers = new Headers();
  object.writeHttpMetadata?.(headers);
  headers.delete("content-length");
  headers.delete("content-disposition");
  headers.set("content-type", "audio/wav");
  headers.set("accept-ranges", "bytes");
  headers.set("etag", object.httpEtag);
  headers.set("x-content-type-options", "nosniff");
  headers.set("content-disposition", contentDisposition(track.downloadFilename, download));
  headers.set("cache-control", "public, max-age=3600");

  const hasBody = object.body != null;
  if (method === "GET" && !hasBody) {
    const revalidate = request.headers.has("if-none-match") || request.headers.has("if-modified-since");
    return new Response(null, { status: revalidate ? 304 : 412, headers });
  }

  if (request.headers.has("range") && object.range) {
    const bounds = rangeBounds(object.size, object.range);
    if (!bounds) {
      headers.set("content-range", `bytes */${object.size}`);
      return new Response(method === "HEAD" ? null : "Range not satisfiable", { status: 416, headers });
    }
    headers.set("content-range", `bytes ${bounds.start}-${bounds.end}/${object.size}`);
    headers.set("content-length", String(bounds.end - bounds.start + 1));
    return new Response(method === "HEAD" ? null : object.body, { status: 206, headers });
  }

  headers.set("content-length", String(object.size));
  return new Response(method === "HEAD" ? null : (object.body ?? null), { status: 200, headers });
}

export async function serveMusic(request: Request, rawFile: string, bucket: MusicBucket | null): Promise<Response> {
  const track = trackByFile(rawFile);
  if (!track) return notFound();
  const method = request.method.toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    return new Response("Method not allowed", { status: 405, headers: { allow: "GET, HEAD" } });
  }
  if (!bucket) return notFound();
  const download = new URL(request.url).searchParams.get("download") === "1";
  try {
    const object =
      method === "HEAD"
        ? await bucket.head(track.file)
        : await bucket.get(
            track.file,
            request.headers.has("range")
              ? { range: request.headers, onlyIf: request.headers }
              : { onlyIf: request.headers },
          );
    return musicFileResponse({ request, track, object, download, method });
  } catch {
    return notFound();
  }
}

export async function musicAvailability(bucket: MusicBucket | null): Promise<Record<string, boolean>> {
  const entries = await Promise.all(
    TRACKS.map(async (track) => {
      if (!bucket) return [track.id, false] as const;
      try {
        const object = await bucket.head(track.file);
        return [track.id, object !== null] as const;
      } catch {
        return [track.id, false] as const;
      }
    }),
  );
  return Object.fromEntries(entries);
}
