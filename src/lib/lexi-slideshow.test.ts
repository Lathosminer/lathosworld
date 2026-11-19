import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  LEXI_ALT,
  LEXI_FADE_MS,
  LEXI_PRELOAD_AHEAD,
  LEXI_SLIDE_COUNT,
  LEXI_SLIDE_MS,
  LEXI_SLIDES,
} from "./lexi-slideshow.ts";

const ALBUM_CAPTIONS = [
  "Volume Two",
  "Love Me in Slow Motion",
  "Made Woman",
  "Hope",
  "Heart Flutter",
  "Ghosted",
];

describe("lexi slideshow", () => {
  it("lists 6 album covers first, then 158 photos", () => {
    assert.equal(LEXI_SLIDES.length, 164);
    assert.equal(LEXI_SLIDE_COUNT, 164);
    const albums = LEXI_SLIDES.slice(0, 6);
    const photos = LEXI_SLIDES.slice(6);
    assert.deepEqual(
      albums.map((slide) => slide.caption),
      ALBUM_CAPTIONS,
    );
    for (const slide of albums) {
      assert.match(slide.src, /^\/lexi\/lexi_album_[a-z0-9_]+\.jpg$/);
      assert.equal(slide.alt, `${LEXI_ALT}, ${slide.caption}`);
    }
    assert.equal(photos.length, 158);
    assert.equal(photos[0]?.src, "/lexi/lexi_01_20_looks_01_vineyard_white_sundress.jpg");
    assert.equal(photos[157]?.src, "/lexi/lexi_158_trend_pink_jacket_alley.jpg");
    for (const [index, slide] of photos.entries()) {
      assert.equal(slide.alt, LEXI_ALT);
      assert.equal(slide.caption, undefined);
      assert.match(slide.src, new RegExp(`^/lexi/lexi_${String(index + 1).padStart(2, "0")}_`));
    }
    const srcs = LEXI_SLIDES.map((slide) => slide.src);
    assert.equal(new Set(srcs).size, srcs.length);
  });

  it("holds each photo for 4.5s, crossfades, and preloads only the next two", () => {
    assert.equal(LEXI_SLIDE_MS, 4500);
    assert.ok(LEXI_SLIDE_MS >= 4000 && LEXI_SLIDE_MS <= 5000);
    assert.equal(LEXI_FADE_MS, 800);
    assert.equal(LEXI_PRELOAD_AHEAD, 2);
  });

  it("has one jpeg on disk for every slide and no extras", () => {
    const dir = new URL("../../public/lexi/", import.meta.url);
    const names = readdirSync(dir)
      .filter((name) => name.endsWith(".jpg"))
      .sort();
    assert.deepEqual(names, LEXI_SLIDES.map((slide) => slide.src.slice("/lexi/".length)).sort());
    assert.equal(
      names.some((name) => /^\d{3}\.jpg$/.test(name)),
      false,
    );
    for (const name of names) {
      const bytes = readFileSync(new URL(name, dir));
      assert.ok(bytes.length > 1000, name);
      assert.equal(bytes[0], 0xff, name);
      assert.equal(bytes[1], 0xd8, name);
      assert.equal(bytes[bytes.length - 2], 0xff, name);
      assert.equal(bytes[bytes.length - 1], 0xd9, name);
    }
  });
});
