import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FEATURED_ARTIST,
  LEXI_SPOTIFY_ARTIST,
  LEXI_YOUTUBE_CHANNEL,
  SPOTIFY_ARTIST,
  SPOTIFY_PLAYLIST,
  SUNO_RUINS,
  YOUTUBE_CHANNEL,
  YOUTUBE_MUSIC_PLAYLIST,
} from "./music.ts";

describe("homepage music links", () => {
  it("keeps the station and artist URLs without tracking params", () => {
    assert.equal(YOUTUBE_MUSIC_PLAYLIST, "https://music.youtube.com/playlist?list=PLALrux7JVT28");
    assert.equal(YOUTUBE_MUSIC_PLAYLIST.includes("si="), false);
    assert.equal(YOUTUBE_CHANNEL, "https://www.youtube.com/@Lathos563");
    assert.equal(SPOTIFY_ARTIST, "https://open.spotify.com/artist/5z5hD7mC4N7n4aOrx8uFiH");
    assert.equal(SPOTIFY_ARTIST.includes("si="), false);
    assert.equal(SPOTIFY_ARTIST.includes("utm_"), false);
    assert.equal(SPOTIFY_PLAYLIST, "https://open.spotify.com/playlist/2JSGvRvhmosCrxIau864I5");
    assert.equal(SPOTIFY_PLAYLIST.includes("si="), false);
    assert.equal(SPOTIFY_PLAYLIST.includes("pt="), false);
    assert.equal(LEXI_SPOTIFY_ARTIST, "https://open.spotify.com/artist/0f3pG12MkS1wmPSGQ1Z4R0");
    assert.equal(LEXI_SPOTIFY_ARTIST.includes("si="), false);
    assert.equal(LEXI_YOUTUBE_CHANNEL, "https://www.youtube.com/@lexistormai");
    assert.equal(SUNO_RUINS, "https://suno.com/playlist/d18b030f-c745-409a-a52e-00c16208c4cd");
  });

  it("keeps Lexi labeled as the AI singer and off YouTube on her card", () => {
    assert.equal(FEATURED_ARTIST.name, "Lexi Storm");
    assert.equal(FEATURED_ARTIST.role, "AI singer");
    assert.equal(/youtube|jared/i.test(JSON.stringify(FEATURED_ARTIST)), false);
    assert.equal(FEATURED_ARTIST.images.length, 2);
  });
});
