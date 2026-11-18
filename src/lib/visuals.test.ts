import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  SITE_VIDEOS,
  getSiteVideo,
  siteVideoHead,
  siteVideoPosterUrl,
  siteVideoUrl,
} from "./visuals.ts";

const publicDir = join(dirname(fileURLToPath(import.meta.url)), "../../public");

describe("site videos", () => {
  it("keeps the two hosted videos and their share pages", () => {
    assert.deepEqual(
      SITE_VIDEOS.map((video) => video.slug),
      ["lightning-logo", "footsteps-end-screen"],
    );
    assert.equal(
      siteVideoUrl(getSiteVideo("lightning-logo")),
      "https://lathosworld.com/videos/lightning-logo",
    );
    assert.equal(
      siteVideoUrl(getSiteVideo("footsteps-end-screen")),
      "https://lathosworld.com/videos/footsteps-end-screen",
    );
    assert.equal(
      getSiteVideo("lightning-logo").src,
      "https://media.lathosworld.com/videos/lathosworld-lightning-logo-footsteps.mp4",
    );
    assert.equal(
      getSiteVideo("footsteps-end-screen").src,
      "https://media.lathosworld.com/videos/footsteps-end-screen.mp4",
    );
    assert.equal(getSiteVideo("lightning-logo").durationLabel, "5:02");
    assert.equal(getSiteVideo("footsteps-end-screen").durationLabel, "0:30");
    for (const video of SITE_VIDEOS) {
      assert.equal(video.artist, "LathosWorld");
      assert.equal(video.src.endsWith(".mp4"), true);
      assert.equal(video.poster.endsWith(".jpg"), true);
    }
  });

  it("credits LathosWorld and leaves the person and AI out of the copy", () => {
    const copy = JSON.stringify(SITE_VIDEOS);
    assert.equal(/\bai\b|artificial intelligence|jared/i.test(copy), false);
    assert.equal(copy.includes("LathosWorld"), true);
  });

  it("points Open Graph and Twitter tags at the media file and the poster", () => {
    for (const video of SITE_VIDEOS) {
      const head = siteVideoHead(video);
      const meta = (property: string) => {
        const tag = head.meta.find((item) => "property" in item && item.property === property);
        assert.ok(tag && "content" in tag);
        return tag.content;
      };
      const named = (name: string) => {
        const tag = head.meta.find((item) => "name" in item && item.name === name);
        assert.ok(tag && "content" in tag);
        return tag.content;
      };
      assert.equal(meta("og:video"), video.src);
      assert.equal(meta("og:video:secure_url"), video.src);
      assert.equal(meta("og:video:type"), "video/mp4");
      assert.equal(meta("og:title"), video.title);
      assert.equal(meta("og:description"), video.description);
      assert.equal(meta("og:url"), siteVideoUrl(video));
      assert.equal(meta("og:image"), siteVideoPosterUrl(video));
      assert.equal(named("description"), video.description);
      assert.equal(named("twitter:title"), video.title);
      assert.equal(named("twitter:description"), video.description);
      assert.equal(named("twitter:image"), siteVideoPosterUrl(video));
      assert.equal(head.links[0]?.href, siteVideoUrl(video));
      const poster = readFileSync(join(publicDir, video.poster));
      assert.equal(poster.byteLength > 8000, true);
      assert.equal(poster.subarray(0, 3).toString("hex"), "ffd8ff");
    }
  });
});
