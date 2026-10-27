import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CHANNEL_DESCRIPTION,
  CHANNEL_TITLE,
  DEFAULT_DESCRIPTION,
  FEED_TTL_MS,
  SITE_ORIGIN,
  isExcludedVideo,
  loadYoutubeVideos,
  parseCacheEntry,
  parseYoutubeAtom,
  renderRss,
  snippet,
  videoPageModel,
  type FeedCacheEntry,
  type YtVideo,
} from "./youtube-feed.ts";

const PUB = "2026-10-26T05:47:03+00:00";

function idFor(n: number): string {
  return `vid${n.toString(36).padStart(8, "0")}`;
}

function entry(id: string, title: string, description: string, published: string): string {
  return `<entry>
    <id>yt:video:${id}</id>
    <yt:videoId>${id}</yt:videoId>
    <title>${title}</title>
    <published>${published}</published>
    <media:group>
      <media:description>${description}</media:description>
      <media:content url="https://www.youtube.com/v/${id}?version=3" type="application/x-shockwave-flash"/>
    </media:group>
  </entry>`;
}

describe("youtube atom to rss", () => {
  it("parses titles, descriptions, and the newest 15 ids", () => {
    const entries = [
      entry("short", "nope", "bad id", PUB),
      entry(idFor(1), "Older", "plain", "2026-10-01T00:00:00Z"),
      entry(
        idFor(2),
        "Tom &amp; Jerry &lt;live&gt;",
        "Line one&#10;Line two &amp; more. It&#39;s &quot;fun&quot;. See https://www.youtube.com/watch?v=aaaaaaaaaaa",
        "2026-10-20T00:00:00Z",
      ),
      entry(idFor(3), "<![CDATA[A & B]]>", "", "2026-10-25T00:00:00Z"),
    ];
    for (let n = 4; n <= 18; n += 1) {
      entries.push(
        entry(
          idFor(n),
          `Video ${n}`,
          `About ${n}`,
          `2026-10-${String(n).padStart(2, "0")}T00:00:00Z`,
        ),
      );
    }
    const videos = parseYoutubeAtom(`<feed>${entries.join("")}</feed>`);
    assert.equal(videos.length, 15);
    assert.equal(videos[0]?.id, idFor(3));
    assert.equal(videos.at(-1)?.id, idFor(6));
    assert.equal(videos.find((video) => video.id === idFor(2))?.title, "Tom & Jerry <live>");
    assert.match(
      videos.find((video) => video.id === idFor(2))?.description ?? "",
      /Line one\nLine two & more/,
    );
    assert.equal(videos.find((video) => video.id === idFor(3))?.title, "A & B");
    assert.equal(videos.find((video) => video.id === idFor(3))?.description, "");
  });

  it("renders RSS 2.0 with site links, media, and escaped text", () => {
    const videos: YtVideo[] = [
      {
        id: idFor(2),
        title: `Tom & Jerry <live>`,
        description: `It's "fun" & loud\nhttps://www.youtube.com/watch?v=aaaaaaaaaaa`,
        published: PUB,
      },
      {
        id: idFor(3),
        title: "Untitled day",
        description: "",
        published: "2026-10-25T00:00:00.000Z",
      },
    ];
    const xml = renderRss(videos, new Date("2026-10-26T16:00:00Z"));
    assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
    assert.match(
      xml,
      /<rss version="2.0" xmlns:media="http:\/\/search\.yahoo\.com\/mrss\/" xmlns:atom="http:\/\/www\.w3\.org\/2005\/Atom">/,
    );
    assert.match(xml, new RegExp(`<title>${CHANNEL_TITLE}</title>`));
    assert.match(xml, new RegExp(`<link>${SITE_ORIGIN}</link>`));
    assert.match(xml, new RegExp(`<description>${CHANNEL_DESCRIPTION}</description>`));
    assert.match(
      xml,
      /<atom:link href="https:\/\/lathosworld\.com\/feed\.xml" rel="self" type="application\/rss\+xml"\/>/,
    );
    assert.match(xml, /Tom &amp; Jerry &lt;live&gt;/);
    assert.match(xml, /It&apos;s &quot;fun&quot; &amp; loud/);
    assert.match(xml, new RegExp(`<description>${DEFAULT_DESCRIPTION}</description>`));
    assert.match(xml, /<pubDate>Mon, 26 Oct 2026 05:47:03 GMT<\/pubDate>/);
    const links = [...xml.matchAll(/<link>([^<]+)<\/link>/g)].map((match) => match[1]);
    assert.deepEqual(links, [
      SITE_ORIGIN,
      `${SITE_ORIGIN}/videos/${idFor(2)}`,
      `${SITE_ORIGIN}/videos/${idFor(3)}`,
    ]);
    for (const guid of xml.matchAll(/<guid isPermaLink="true">([^<]+)<\/guid>/g)) {
      assert.match(guid[1] ?? "", /^https:\/\/lathosworld\.com\/videos\/[A-Za-z0-9_-]{11}$/);
    }
    assert.doesNotMatch(xml, /<link>[^<]*youtube\.com/);
    assert.doesNotMatch(xml, /<guid[^>]*>[^<]*youtube\.com/);
    assert.match(
      xml,
      new RegExp(
        `<media:content url="https://i\\.ytimg\\.com/vi/${idFor(2)}/hqdefault\\.jpg" medium="image" type="image/jpeg"/>`,
      ),
    );
    assert.match(
      xml,
      new RegExp(
        `<enclosure url="https://i\\.ytimg\\.com/vi/${idFor(2)}/hqdefault\\.jpg" type="image/jpeg" length="0"/>`,
      ),
    );
    assert.equal(snippet("   "), DEFAULT_DESCRIPTION);
  });

  it("keeps the last good copy when YouTube fails", async () => {
    const cached: FeedCacheEntry = {
      at: 1_000,
      videos: [{ id: idFor(9), title: "Cached", description: "still here", published: PUB }],
    };
    let writes = 0;
    const failed = await loadYoutubeVideos({
      now: 1_000 + FEED_TTL_MS + 5,
      memory: cached,
      readEdge: async () => null,
      writeEdge: async () => {
        writes += 1;
      },
      fetchFeed: async () => {
        throw new Error("down");
      },
    });
    assert.equal(writes, 0);
    assert.equal(failed.videos[0]?.title, "Cached");
    assert.equal(failed.memory, cached);

    const empty = await loadYoutubeVideos({
      now: 50_000,
      memory: null,
      readEdge: async () => null,
      writeEdge: async () => {
        throw new Error("no cache");
      },
      fetchFeed: async () => "<feed></feed>",
    });
    assert.deepEqual(empty.videos, []);
    assert.equal(empty.memory, null);

    const stored: { entry: FeedCacheEntry | null } = { entry: null };
    const fresh = await loadYoutubeVideos({
      now: 80_000,
      memory: null,
      readEdge: async () => stored.entry,
      writeEdge: async (entry) => {
        stored.entry = entry;
      },
      fetchFeed: async () => `<feed>${entry(idFor(4), "New", "hello", PUB)}</feed>`,
    });
    assert.equal(fresh.videos[0]?.title, "New");
    assert.equal(stored.entry?.videos[0]?.id, idFor(4));

    const fromEdge = await loadYoutubeVideos({
      now: 80_000 + 10,
      memory: null,
      readEdge: async () => stored.entry,
      writeEdge: async () => {
        throw new Error("should not write");
      },
      fetchFeed: async () => {
        throw new Error("should not fetch");
      },
    });
    assert.equal(fromEdge.videos[0]?.id, idFor(4));
  });

  it("builds a page model for an id that is not in the latest feed", () => {
    const page = videoPageModel(idFor(7), null);
    assert.equal(page.title, "LathosWorld video");
    assert.equal(page.description, DEFAULT_DESCRIPTION);
    assert.equal(page.url, `${SITE_ORIGIN}/videos/${idFor(7)}`);
    assert.equal(page.image, `https://i.ytimg.com/vi/${idFor(7)}/hqdefault.jpg`);
  });
});

describe("excluded videos", () => {
  it("drops excluded ids from the feed and the cache", () => {
    const xml = `<feed>${[
      entry("px6StD-TCvg", "personal", "", "2026-10-26T04:48:41Z"),
      entry("3qVqLWcpQHQ", "test", "", "2026-10-26T05:43:05Z"),
      entry("j2-ElyTPSiE", "costume", "", "2026-10-26T04:47:03Z"),
      entry("vdWVjRsa1zM", "gameplay", "", "2026-10-23T16:09:52Z"),
    ].join("\n")}</feed>`;
    const ids = parseYoutubeAtom(xml).map((video) => video.id);
    assert.deepEqual(ids, ["vdWVjRsa1zM"]);
    assert.equal(isExcludedVideo("px6StD-TCvg"), true);
    assert.equal(isExcludedVideo("vdWVjRsa1zM"), false);
    const cached = parseCacheEntry({
      at: 1,
      videos: ["px6StD-TCvg", "vdWVjRsa1zM"].map((id) => ({ id, title: "t", description: "", published: PUB })),
    });
    assert.deepEqual(cached?.videos.map((video) => video.id), ["vdWVjRsa1zM"]);
  });
});
