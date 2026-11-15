import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseReelManifest, shuffleReel, type ReelClip } from "./reel.ts";

const clip: ReelClip = {
  src: "https://videos.lathosworld.com/reel/reel_01.mp4",
  title: "Open",
  category: "promo",
  orientation: "landscape",
  duration: 12,
};

describe("parseReelManifest", () => {
  it("keeps a well-formed clip", () => {
    assert.deepEqual(parseReelManifest([clip]), [clip]);
  });

  it("drops broken rows and ignores a non-array", () => {
    const parsed = parseReelManifest([
      clip,
      { ...clip, src: "javascript:alert(1)", title: "Bad" },
      { ...clip, category: "not a category" },
      { ...clip, orientation: "square" },
      { ...clip, title: "  " },
      { ...clip, duration: -1 },
      null,
    ]);
    assert.deepEqual(parsed, [clip]);
    assert.deepEqual(parseReelManifest({ clips: [clip] }), []);
    assert.deepEqual(parseReelManifest(null), []);
  });

  it("keeps a plain category that was not in the first list", () => {
    const parsed = parseReelManifest([{ ...clip, title: "Map", category: "gameplay" }]);
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0]?.category, "gameplay");
  });

  it("accepts every listed category and both orientations", () => {
    const rows = ["promo", "canvas", "lava", "short", "demo", "lexi"].map((category, index) => ({
      ...clip,
      title: category,
      category,
      orientation: index % 2 === 0 ? "portrait" : "landscape",
    }));
    const parsed = parseReelManifest(rows);
    assert.equal(parsed.length, 6);
    assert.equal(parsed[0]?.orientation, "portrait");
    assert.equal(parsed[1]?.orientation, "landscape");
  });
});

describe("shuffleReel", () => {
  it("reorders with the supplied random source and does not mutate the input", () => {
    const items = ["a", "b", "c", "d"];
    let n = 0;
    const rolls = [0, 0, 0];
    const shuffled = shuffleReel(items, () => rolls[n++] ?? 0);
    assert.deepEqual(items, ["a", "b", "c", "d"]);
    assert.equal(shuffled.length, 4);
    assert.deepEqual(new Set(shuffled), new Set(items));
  });

  it("can reorder a clip list", () => {
    const clips: ReelClip[] = [
      { ...clip, title: "One" },
      { ...clip, title: "Two", orientation: "portrait" },
    ];
    const shuffled = shuffleReel(clips, () => 0);
    assert.deepEqual(
      shuffled.map((item) => item.title),
      ["Two", "One"],
    );
  });
});
