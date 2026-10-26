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

## Run it

```bash
npm install
npm run dev
```

The dev server listens on port 8080. `npm run build` builds the site and runs database migrations.
