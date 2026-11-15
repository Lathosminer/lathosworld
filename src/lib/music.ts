/** Station and artist links shown on the homepage. No tracking query on these URLs. */
export const ARTIST = "LathosWorld";

/** Released songs on YouTube Music. No tracking query. */
export const YOUTUBE_MUSIC_PLAYLIST = "https://music.youtube.com/playlist?list=PLALrux7JVT28";

/** LathosWorld's YouTube channel. The music row uses this; other YouTube links stay as they are. */
export const YOUTUBE_CHANNEL = "https://www.youtube.com/@Lathos563";

/** LathosWorld's Spotify artist page. No tracking query. */
export const SPOTIFY_ARTIST = "https://open.spotify.com/artist/5z5hD7mC4N7n4aOrx8uFiH";

/** Released songs on Spotify. No tracking query. */
export const SPOTIFY_PLAYLIST = "https://open.spotify.com/playlist/2JSGvRvhmosCrxIau864I5";

/** Lexi Storm's artist page. Not a playlist, and not used on her card. */
export const LEXI_SPOTIFY_ARTIST = "https://open.spotify.com/artist/0f3pG12MkS1wmPSGQ1Z4R0";

/** Lexi Storm's channel. The Lexi card does not use this. */
export const LEXI_YOUTUBE_CHANNEL = "https://www.youtube.com/@lexistormai";

/** Built From The Ruins on Suno. The music row and the Suno social use this. */
export const SUNO_RUINS = "https://suno.com/playlist/d18b030f-c745-409a-a52e-00c16208c4cd";

export const FEATURED_ARTIST = {
  name: "Lexi Storm",
  role: "AI singer",
  intro: "Lexi Storm is LathosWorld's AI singer. Her songs are the way in.",
  images: [
    {
      src: "/pins/lexi_leather_city_pin.jpg",
      width: 1000,
      height: 1500,
      alt: "Lexi Storm, the LathosWorld AI singer, in the city",
    },
    {
      src: "/pins/lexi_autumn_park_pin.jpg",
      width: 1000,
      height: 1500,
      alt: "Lexi Storm, the LathosWorld AI singer, in the autumn park",
    },
  ],
} as const;
