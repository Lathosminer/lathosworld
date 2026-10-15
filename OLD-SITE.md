# Lathos' World — old site plan

Saved before the page was rebuilt around $LWRLD on Flap.
The live homepage is the token page. This file is the plan to put the old site back.
Login and account were not removed.

## What it was

A personal gamer site. The logo is the page. No shop. No coin, in the last version of this site.
Audience line, last set: **Intended for certain audiences only.**

Look: dark metal, ice cyan, blood red, gold. Display type Orbitron. Serif Cinzel. Body DM Sans. Mono Share Tech Mono.
Logo file: `public/mark.jpg` (also `public/logo.jpg`). Do not swap it for a generated mark.

## Last homepage, top to bottom

1. **Header**
   - Small logo, word "LATHOS'"
   - Nav: Stream, Community, Sign in / Account
   - Skip link: Skip to stream

2. **Hero**
   - Full logo in `.crest-lockup`
   - Lightning canvas on top of the logo, clipped to the mark (`destination-in` from the logo's bright pixels)
   - Kicker: Intended for certain audiences only
   - Buttons: Watch the Stream → `https://www.youtube.com/@lathos563`
   - Join the Community → `#community`

3. **Sword divider** between sections

4. **Stream** (`#stream`) — "On the grind"
   - Line: No clock on it.
   - Line: The light is on when the stream is on.
   - Chips: NO CLOCK, GREAT GAMES, PS5, REAL TALK, OPEN CHAIR
   - Games, all PS5:
     - Summoner — A great one. Same chair as the rest.
     - Once Human — One of the great ones. Not the only one.
     - RuneScape: Dragonwilds — The long sit. Explore it. Don't rush the night.
     - The Witcher 3 — The path and the choices. A story you come back to.
   - Optional support line, then Twitch `https://www.twitch.tv/lathosworld` and YouTube `https://www.youtube.com/@lathos563`

5. **Community** (`#community`) — "Pick a door"
   - Line: The links are optional. Follow if you want.
   - Line: Nobody has to.
   - Doors:
     - Twitch — lathosworld — Live
     - YouTube — @lathos563 — Watch
     - X — @lathos563 — `https://x.com/lathos563` — Talk
     - Discord — The lobby — `https://discord.gg/749tHdsFU6` — Join
     - Instagram — @lathosworld — `https://www.instagram.com/lathosworld` — Photos
     - Telegram — @LathosWorld — `https://t.me/LathosWorld` — Chat

6. **Footer**
   - This is the way.
   - Thanks for being part of the world.
   - © 2026 Lathos' World

## Lightning (the version called great)

- Bones from `public/bones.json`. Cyan on LATHOS. Red on WORLD.
- Bolts walk the letter ribs. A pulse runs out from the teal center.
- Drawn on the canvas, then masked so only the logo shows the lightning.
- Reduced motion: canvas stays still.
- Do not put a second sword on top of the logo. The sword is already in the image.

## Still on the site

- `/login` — email and password, sign up, two security questions, recover by those answers
- `/account` — change password, sign out
- Same logo in the nav, login, and account headers
- Favicon is the logo

## Taken off before the token page (do not put back unless asked)

- Bio and "My story" (Mario, Duck Hunt, Metal Gear, dad, first person)
- The three rules (never harass, no pressure selling, honesty and integrity)
- The saga crawl and the ages list
- The vault shelf and every personal photo, clip, and family picture
- Any shop, Linktree store, or "for sale" language
- Any line that says the pictures were taken by someone

## How to restore

1. Put the homepage sections above back in `src/routes/index.tsx`.
2. Leave `LiveArc`, the mask, and `public/mark.jpg` as they are.
3. Point nav and the skip link at Stream and Community again.
4. Leave `/login` and `/account` alone.
5. The token page can stay in this file as the record of what replaced it, or move to its own route later.
