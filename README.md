# lathosworld.com

Site for LathosWorld. Streams, the story, $LWRLD, wallet connect, the list, and the help desk.

Not financial advice. Not a promise of price. Crypto is volatile.

## What is on the page

- Twitch player for [twitch.tv/lathosworld](https://www.twitch.tv/lathosworld), then the YouTube uploads playlist
- $LWRLD on BNB Smart Chain, contract `0x3899ebf76c768c156df3073031a4518c5f947777`
- Supply 1,000,000,000. Buy tax 4%. Sell tax 4%. Tax split 85% liquidity, 10% fund, 5% burn
- Buy on [Flap](https://flap.sh/bnb/0x3899ebf76c768c156df3073031a4518c5f947777). Contract on [BscScan](https://bscscan.com/token/0x3899ebf76c768c156df3073031a4518c5f947777)
- Whitepaper: [Lathosminer/LWRLD](https://github.com/Lathosminer/LWRLD)
- Wallet connect in the browser, or a code that opens this site inside the wallet app. The site never asks for a seed phrase
- List: saves an email and lists the socials. It does not send inbox mail
- Help desk **LathosWorld Help Desk** at [help@lathosworld.com](mailto:help@lathosworld.com?subject=LathosWorld%20Help%20Desk)

## Socials

- Twitch: [twitch.tv/lathosworld](https://www.twitch.tv/lathosworld)
- YouTube: [@lathos563](https://www.youtube.com/@lathos563)
- X: [@lathos563](https://x.com/lathos563)
- Discord: [discord.gg/749tHdsFU6](https://discord.gg/749tHdsFU6)
- Instagram: [@lathosworld](https://www.instagram.com/lathosworld)
- Telegram: [t.me/LathosWorldOfficial](https://t.me/LathosWorldOfficial)
- Pinterest: [pinterest.com/lathosworld](https://www.pinterest.com/lathosworld/)
- Linktree: [linktr.ee/LathosWorld](https://linktr.ee/LathosWorld)
- TikTok: [@lathos.world](https://www.tiktok.com/@lathos.world)

## Follower counts

The home page shows Twitch, YouTube, X, and TikTok in one row. `GET /api/community` fills it and caches the result on the worker (about 8 minutes in memory, plus `Cache-Control` on the response).

Twitch and YouTube stay on their existing secrets: `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`, `TWITCH_REFRESH_TOKEN` or `TWITCH_USER_TOKEN`, and `YOUTUBE_API_KEY`.

X and TikTok try a live count, then the numbers in `src/lib/community-counts.ts`. Each card links to the profile either way. Set these in the Cloudflare Workers project (do not commit them):

- `X_BEARER_TOKEN` — X API v2 app-only bearer. Enables `GET https://api.x.com/2/users/by/username/lathos563?user.fields=public_metrics`. Without it, the worker reads the public profile, then the static number.
- `TIKTOK_ACCESS_TOKEN` — TikTok Display API user access token for @lathos.world with the `user.info.stats` scope. Enables `GET https://open.tiktokapis.com/v2/user/info/?fields=follower_count`. The token expires (about a day). Without it, the worker reads the public profile, then the static number. TikTok has no app-only key for another account's follower count.

## Music

Singles play on the home page, under the hero and above Streams. The catalog is `src/lib/music.ts` (`SINGLES`, then `ALBUMS`). Volume One (LathosWorld, 14 tracks) and Volume Two (Lexi Storm, 13 tracks) stay out of `ALBUMS` until they should be on the page. Add an album there and its tracks show up after the singles. A missing object marks that row unavailable.

Audio is WAV only, for streaming and download. The files are about 40–60 MB, over the Workers static asset limit (25 MiB), so they are not in this repo. They live in the R2 bucket **`lathosworld-music`**, bound on the Worker as **`MUSIC`** (`wrangler.jsonc`). The site serves them on its own domain:

- Play: `https://lathosworld.com/music/<object-key>`
- Download: the same URL with `?download=1` (`Content-Disposition: attachment`)

Range requests are supported. The player does not offer a download. Only keys listed in the manifest are served.

The next production deploy applies the binding. Wrangler creates `lathosworld-music` during that deploy when the token can create R2 buckets. If the token cannot, create the bucket first, then redeploy:

```bash
npx wrangler r2 bucket create lathosworld-music
```

Upload one WAV per key. `--content-type audio/wav`. Do not upload MP3s.

```bash
npx wrangler r2 object put lathosworld-music/life-feat-lexi-storm.wav --file "./Life (feat. Lexi Storm).wav" --content-type audio/wav
npx wrangler r2 object put lathosworld-music/lost-treasure-remastered.wav --file "./Lost Treasure (Remastered).wav" --content-type audio/wav
npx wrangler r2 object put lathosworld-music/lost-treasure-feat-lexi-storm.wav --file "./Lost Treasure (feat. Lexi Storm).wav" --content-type audio/wav
npx wrangler r2 object put lathosworld-music/life-heavy-metal.wav --file "./Life (Heavy Metal).wav" --content-type audio/wav
npx wrangler r2 object put lathosworld-music/hope-life-and-light-heavy-metal.wav --file "./Hope, Life and Light (Heavy Metal).wav" --content-type audio/wav
npx wrangler r2 object put lathosworld-music/hope-life-and-light-heavy-metal-short.wav --file "./Hope, Life and Light (Heavy Metal, Short Version).wav" --content-type audio/wav
npx wrangler r2 object put lathosworld-music/i-carry-you-with-me-esme-version.wav --file "./I Carry You With Me (Esme Version).wav" --content-type audio/wav
npx wrangler r2 object put lathosworld-music/i-carry-you-with-me-feat-lexi-storm.wav --file "./I Carry You With Me (feat. Lexi Storm).wav" --content-type audio/wav
npx wrangler r2 object put lathosworld-music/no-one-can-help-me-except-feat-lexi-storm.wav --file "./No One Can Help Me Except (feat. Lexi Storm).wav" --content-type audio/wav
npx wrangler r2 object put lathosworld-music/deeper-than-the-ocean-feat-lexi-storm.wav --file "./Deeper Than the Ocean (feat. Lexi Storm).wav" --content-type audio/wav
npx wrangler r2 object put lathosworld-music/the-light.wav --file "./The Light.wav" --content-type audio/wav
npx wrangler r2 object put lathosworld-music/why.wav --file "./Why.wav" --content-type audio/wav
npx wrangler r2 object put lathosworld-music/lexi-storm-blame-me-rap-remix.wav --file "./Blame Me (Rap Remix).wav" --content-type audio/wav
npx wrangler r2 object put lathosworld-music/lexi-storm-slow-motion.wav --file "./Slow Motion.wav" --content-type audio/wav
npx wrangler r2 object put lathosworld-music/lexi-storm-hope.wav --file "./Hope.wav" --content-type audio/wav
```

Object keys, in list order:

| Artist | Title | Key |
| --- | --- | --- |
| LathosWorld | Life (feat. Lexi Storm) | `life-feat-lexi-storm.wav` |
| LathosWorld | Lost Treasure (Remastered) | `lost-treasure-remastered.wav` |
| LathosWorld | Lost Treasure (feat. Lexi Storm) | `lost-treasure-feat-lexi-storm.wav` |
| LathosWorld | Life (Heavy Metal) | `life-heavy-metal.wav` |
| LathosWorld | Hope, Life and Light (Heavy Metal) | `hope-life-and-light-heavy-metal.wav` |
| LathosWorld | Hope, Life and Light (Heavy Metal, Short Version) | `hope-life-and-light-heavy-metal-short.wav` |
| LathosWorld | I Carry You With Me (Esme Version) | `i-carry-you-with-me-esme-version.wav` |
| LathosWorld | I Carry You With Me (feat. Lexi Storm) | `i-carry-you-with-me-feat-lexi-storm.wav` |
| LathosWorld | No One Can Help Me Except (feat. Lexi Storm) | `no-one-can-help-me-except-feat-lexi-storm.wav` |
| LathosWorld | Deeper Than the Ocean (feat. Lexi Storm) | `deeper-than-the-ocean-feat-lexi-storm.wav` |
| LathosWorld | The Light | `the-light.wav` |
| LathosWorld | Why | `why.wav` |
| Lexi Storm | Blame Me (Rap Remix) | `lexi-storm-blame-me-rap-remix.wav` |
| Lexi Storm | Slow Motion | `lexi-storm-slow-motion.wav` |
| Lexi Storm | Hope | `lexi-storm-hope.wav` |

## Run it

```bash
npm install
npm run dev
```

The dev server listens on port 8080. `npm run build` builds the site and runs database migrations.
