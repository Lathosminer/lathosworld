import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LEXI_ALBUMS, LEXI_STILLS, LEXI_TRACKS, LEXI_WELCOME, LEXI_X } from "./lexi.ts";

describe("Lexi Storm guest", () => {
  it("keeps the welcome clip swappable from one object", () => {
    assert.equal(LEXI_WELCOME.placeholder, true);
    assert.match(LEXI_WELCOME.src, /^\/lexi\/.+\.mp4$/);
    assert.match(LEXI_WELCOME.poster, /^\/lexi\/.+\.webp$/);
  });

  it("lists the released singles and both coming-soon albums", () => {
    assert.deepEqual(
      LEXI_TRACKS.map((track) => track.title),
      ["The Light", "Why", "Deeper Than the Ocean", "No One Can Help Me Except", "Lost Treasure"],
    );
    assert.equal(LEXI_TRACKS.find((track) => track.title === "Lost Treasure")?.credit, "feat. Lexi Storm");
    assert.equal(LEXI_TRACKS.every((track) => track.href == null), true);
    assert.deepEqual(
      LEXI_ALBUMS.map((album) => album.title),
      ["LathosWorld feat. Lexi Storm", "Lexi Storm"],
    );
    assert.equal(LEXI_ALBUMS.every((album) => album.status === "Coming soon"), true);
  });

  it("uses webp cosplay stills and her X account", () => {
    assert.equal(LEXI_STILLS.length, 3);
    assert.equal(
      LEXI_STILLS.every((shot) => shot.src.endsWith(".webp") && shot.srcSet.includes(".webp")),
      true,
    );
    assert.equal(LEXI_X.href, "https://x.com/LexiStormXOXO");
  });
});
