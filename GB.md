# GB — lathosworld.com

Do not redesign the site. Do not invent facts. The public code is already here:

https://github.com/Lathosminer/lathosworld

`main` at `a4d4908`. Clone that. This workspace does not follow GitHub by itself. After a merge, pull `main` into Grok Build, then the owner hits Publish. Publish uses this workspace, not GitHub.

The name on the page is **lathosworld.com**. A preview link in the builder can change. That is not a new site.

## Leave this layout

After the nav, top to bottom: the looping hero video, the wordmark, the story, streams (Twitch player full width, then YouTube), then the coin block (how to get it, the $LWRLD section with the whitepaper link, crypto offers, roadmap), then socials in this order (Twitch, YouTube, X, Pinterest, Discord, Instagram), the mp4/gif clip, then Telegram and Linktree, then the list, then the help desk. Do not reorder that. Sign-in stays in the nav.

Do not restore `public/sword.png` or `public/sword-cursor.png`. The cursor is `public/sword-mini-cursor.png`. Section marks use the small still sword.

Link card: `public/og.jpg` is the original logo at 1200×630 with the title removed. Do not redraw it. Do not touch an X feed banner. `src/lib/og/site.json` keeps title `lathosworld.com`, card `custom`, and the existing lede as the description.

Sign-in is already on. `emailAndPasswordEnabled = true` in `src/lib/auth/email-password.ts`. Do not edit `src/lib/auth/server.ts`.

## Token facts

- Ticker $LWRLD. Name LathosWorld. Chain BNB Smart Chain.
- Contract `0x3899ebf76c768c156df3073031a4518c5f947777`. It ends in 7777. A different address is not this token.
- Flap tax token. Supply 1,000,000,000. Buy tax 4%. Sell tax 4%. Split 85% liquidity, 10% fund, 5% burn.
- Flap: https://flap.sh/bnb/0x3899ebf76c768c156df3073031a4518c5f947777
- BscScan: https://bscscan.com/token/0x3899ebf76c768c156df3073031a4518c5f947777
- Whitepaper repo (do not rewrite it from here): https://github.com/Lathosminer/LWRLD
- Not financial advice. Not a promise of price. Never risk more than you can afford to lose. Crypto is volatile.

## Roadmap — goals, not live

The owner will update the whitepaper later. On the site this is only a roadmap.

- $LWRLD on Flap is the token now. Using its proceeds to launch a later token is a roadmap goal. That token does not exist yet. Buying $LWRLD does not send the later token. The only contract is the one that ends in 7777.
- Percent promise. Every holder of the contract that ends in 7777 is promised a percent of the later token. The percent is not set. No contract pays it yet.
- Bitcoin. That later token is meant to be backed by BTC. No Bitcoin is held for it yet. $LWRLD is not redeemable for BTC.
- All revenue generated goes back into the coin. 100 percent. None of it is taken out. The merch shop is coming soon. All merch sales go directly back into the coin. 100 percent.

## Help desk

Label: **lathosworld.comhelpdesk**
Inbox: **lathosx@gmail.com**

A visitor writes a note. The page answers from the site facts. A copy is sent to that Gmail with the subject `lathosworld.comhelpdesk`. The site never asks for a seed phrase.

The list only saves an email and lists the socials. It does not send inbox mail.

## Socials

- Twitch https://www.twitch.tv/lathosworld
- YouTube https://www.youtube.com/@lathos563
- X https://x.com/lathos563
- Discord https://discord.gg/749tHdsFU6
- Instagram https://www.instagram.com/lathosworld
- Telegram https://t.me/LathosWorldOfficial
- Pinterest https://www.pinterest.com/lathosworld/
- Linktree https://linktr.ee/LathosWorld

## Run

```bash
npm install
npm run dev
```

Dev server is port 8080. `npm run build` builds the site and runs migrations.
