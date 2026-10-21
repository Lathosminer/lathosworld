# GB — lathosworld.com

Do not redesign the site. Do not invent facts. The public code is already here:

https://github.com/Lathosminer/lathosworld

`main` at `a4d4908`. Clone that. This workspace does not follow GitHub by itself. After a merge, pull `main` into Grok Build, then the owner hits Publish. Publish uses this workspace, not GitHub.

The name on the page is **lathosworld.com**. A preview link in the builder can change. That is not a new site.

## Leave this layout

After the nav, top to bottom: one centered hero (the square v9 loop, `hero-loop`), the blade, the story, streams (Twitch player full width, then YouTube), three clips, the emblem, then the coin block (how to get it, the contract, crypto offers, roadmap), then one social row, the mp4/gif clip, a short link to the list, then a short link to the help desk. Do not reorder that. Do not add a second logo above or below the hero. The nav does not show Sign in.

The nav is only Streams, Clips, and Get $LWRLD. Schedule, Survivors, the Shit List, and the help desk stay in the footer and on their own pages. The join form is on `/list`. The desk form is on `/help`. Do not put either form back on the homepage.

Homepage socials, in order: Twitch, YouTube, X, Discord, Instagram, Telegram. Pinterest and Linktree stay on the list page only. Do not add a second social row.

The lightning sword is only on the Get $LWRLD buttons (nav, Flap, buy bar). Section marks still use the small still sword. Do not put the lightning sword on social cards or the list button.

Wallets on the contract: detected wallets, Trust Wallet, and MetaMask are the path. The rest sit behind More wallets. Phantom stays in that list.

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

The public paper is v1.9. Do not put unpublished work back on the site.

- $LWRLD on Flap is the token now. The only contract is the one that ends in 7777. Buying $LWRLD does not send any other token.
- Work that is not live is not described on the site or in the help desk.
- $LWRLD is not redeemable for BTC. Holding it does not pay Bitcoin.
- The merch shop is open.

## Help desk

Label: **LathosWorld Help Desk**
Public contact: **help@lathosworld.com** (forwards to the owner's Gmail)

A visitor writes a note. The page answers from the site facts. A copy is sent to that address with the subject `LathosWorld Help Desk`. The site never asks for a seed phrase.

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
