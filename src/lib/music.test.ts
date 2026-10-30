import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SOCIALS } from "./socials.ts";
import {
  ALBUMS,
  ARTIST,
  FEATURED_ARTIST,
  LEAD_TRACK_ID,
  LEXI_ARTIST,
  SINGLES,
  TRACKS,
  contentDisposition,
  downloadUrl,
  musicAvailability,
  rangeBounds,
  serveMusic,
  streamUrl,
  trackByFile,
  type MusicBucket,
  type MusicObject,
  type Track,
} from "./music.ts";

const lead = TRACKS[0];

function object(partial: Partial<MusicObject> & { size: number }): MusicObject {
  return {
    httpEtag: '"etag"',
    body: new Blob(["wav"]).stream(),
    ...partial,
  };
}

function bucket(objects: Record<string, MusicObject | null>): MusicBucket {
  return {
    head(key) {
      return Promise.resolve(key in objects ? objects[key] : null);
    },
    get(key) {
      return Promise.resolve(key in objects ? objects[key] : null);
    },
  };
}

describe("catalog", () => {
  it("opens with Life and keeps albums empty", () => {
    assert.equal(lead?.title, "Life (feat. Lexi Storm)");
    assert.equal(lead?.artist, ARTIST);
    assert.equal(LEAD_TRACK_ID, lead?.id);
    assert.equal(ALBUMS.length, 0);
    assert.equal(TRACKS.length, SINGLES.length);
    assert.equal(TRACKS.length, 15);
  });

  it("credits Lexi Storm on her singles and LathosWorld on the rest", () => {
    const lexi = TRACKS.filter((track) => track.artist === LEXI_ARTIST).map((track) => track.title);
    assert.deepEqual(lexi, ["Blame Me (Rap Remix)", "Slow Motion", "Hope"]);
    assert.equal(TRACKS.filter((track) => track.artist === ARTIST).length, 12);
    assert.equal(FEATURED_ARTIST.role, "AI character");
    assert.equal(FEATURED_ARTIST.youtube, SOCIALS.find((item) => item.name === "YouTube")?.href);
  });

  it("is WAV only, with unique keys and no personal name", () => {
    const files = new Set<string>();
    const blob = JSON.stringify({ TRACKS, FEATURED_ARTIST });
    assert.equal(/jared/i.test(blob), false);
    for (const track of TRACKS) {
      assert.match(track.file, /\.wav$/);
      assert.match(track.downloadFilename, /\.wav$/);
      assert.equal(track.downloadFilename, `${track.artist} - ${track.title}.wav`);
      assert.equal(track.file.includes("mp3"), false);
      assert.equal(files.has(track.file), false);
      files.add(track.file);
      assert.equal(streamUrl(track), `/music/${track.file}`);
      assert.equal(downloadUrl(track), `/music/${track.file}?download=1`);
    }
  });
});

describe("serveMusic", () => {
  const life = TRACKS[0] as Track;

  it("rejects keys that are not in the catalog", async () => {
    const store = bucket({ [life.file]: object({ size: 8 }) });
    for (const key of ["../secret.wav", "nope.mp3", "missing.wav", "%2e%2e%2fsecret.wav"]) {
      const response = await serveMusic(new Request("https://lathosworld.com/music/x"), key, store);
      assert.equal(response.status, 404);
    }
  });

  it("streams a full WAV inline and attaches only for download=1", async () => {
    const store = bucket({ [life.file]: object({ size: 1200 }) });
    const play = await serveMusic(new Request(`https://lathosworld.com/music/${life.file}`), life.file, store);
    assert.equal(play.status, 200);
    assert.equal(play.headers.get("content-type"), "audio/wav");
    assert.equal(play.headers.get("accept-ranges"), "bytes");
    assert.equal(play.headers.get("content-length"), "1200");
    assert.match(play.headers.get("content-disposition") ?? "", /^inline;/);
    assert.match(play.headers.get("content-disposition") ?? "", /Life \(feat\. Lexi Storm\)\.wav/);

    const download = await serveMusic(
      new Request(`https://lathosworld.com/music/${life.file}?download=1`),
      life.file,
      store,
    );
    assert.match(download.headers.get("content-disposition") ?? "", /^attachment;/);
  });

  it("answers a byte range with 206", async () => {
    const store = bucket({
      [life.file]: object({ size: 5000, range: { offset: 100, length: 50 } }),
    });
    const response = await serveMusic(
      new Request(`https://lathosworld.com/music/${life.file}`, { headers: { range: "bytes=100-149" } }),
      life.file,
      store,
    );
    assert.equal(response.status, 206);
    assert.equal(response.headers.get("content-range"), "bytes 100-149/5000");
    assert.equal(response.headers.get("content-length"), "50");
  });

  it("returns 416 when the range starts past the end", () => {
    assert.equal(rangeBounds(100, { offset: 100, length: 10 }), null);
    assert.deepEqual(rangeBounds(1000, { suffix: 20 }), { start: 980, end: 999 });
  });

  it("uses the catalog filename even when it contains spaces", () => {
    const header = contentDisposition("Lexi Storm - Slow Motion.wav", true);
    assert.match(header, /^attachment;/);
    assert.match(header, /filename="Lexi Storm - Slow Motion\.wav"/);
  });

  it("reports a missing object as unavailable without throwing", async () => {
    const failing: MusicBucket = {
      head() {
        return Promise.reject(new Error("down"));
      },
      get() {
        return Promise.reject(new Error("down"));
      },
    };
    const none = await musicAvailability(null);
    assert.equal(Object.values(none).every((ready) => ready === false), true);
    const response = await serveMusic(new Request("https://lathosworld.com/music/why.wav"), "why.wav", failing);
    assert.equal(response.status, 404);
    const present = await musicAvailability(bucket({ "why.wav": object({ size: 4, body: null }) }));
    assert.equal(present.why, true);
    assert.equal(present["life-feat-lexi-storm"], false);
    assert.equal(trackByFile("why.wav")?.title, "Why");
  });
});
