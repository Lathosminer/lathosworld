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

describe("lexi slideshow", () => {
  it("lists all 126 photos in numeric order with Lexi Storm alt text", () => {
    assert.equal(LEXI_SLIDES.length, LEXI_SLIDE_COUNT);
    assert.equal(LEXI_SLIDE_COUNT, 126);
    assert.deepEqual(
      LEXI_SLIDES.map((slide) => slide.src),
      Array.from({ length: 126 }, (_, index) => `/lexi/${String(index + 1).padStart(3, "0")}.jpg`),
    );
    assert.equal(LEXI_SLIDES[0]?.src, "/lexi/001.jpg");
    assert.equal(LEXI_SLIDES[29]?.src, "/lexi/030.jpg");
    assert.equal(LEXI_SLIDES[30]?.src, "/lexi/031.jpg");
    assert.equal(LEXI_SLIDES[125]?.src, "/lexi/126.jpg");
    for (const slide of LEXI_SLIDES) assert.equal(slide.alt, LEXI_ALT);
    assert.equal(LEXI_ALT, "Lexi Storm");
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
    assert.deepEqual(
      names,
      LEXI_SLIDES.map((slide) => slide.src.slice("/lexi/".length)),
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
