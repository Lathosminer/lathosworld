/**
 * Fallback follower counts for the home-page row.
 *
 * Live counts win when they answer. This file is only the number the row
 * shows when a live read is missing or blocked. Edit the numbers here.
 * Do not put API tokens, cookies, or other secrets in this file.
 *
 * X (@lathos563, https://x.com/lathos563)
 *   1. `X_BEARER_TOKEN` — X API v2 app-only bearer. The worker calls
 *      `GET https://api.x.com/2/users/by/username/lathos563?user.fields=public_metrics`.
 *   2. Otherwise a public read of that profile page (no secret). Cloudflare
 *      often blocks this read.
 *   3. Otherwise `x` below.
 *
 * TikTok (@lathos.world, https://www.tiktok.com/@lathos.world — the profile
 * already linked on the site)
 *   1. `TIKTOK_ACCESS_TOKEN` — TikTok Display API user access token for this
 *      account, with the `user.info.stats` scope. The worker calls
 *      `GET https://open.tiktokapis.com/v2/user/info/?fields=follower_count`
 *      with `Authorization: Bearer <token>`. Display API tokens expire
 *      (about a day); refresh the token in Cloudflare when it does.
 *      There is no app-only TikTok key that returns another account's
 *      follower count.
 *   2. Otherwise a public read of that profile page (no secret). TikTok
 *      often blocks datacenter IPs, including Cloudflare.
 *   3. Otherwise `tiktok` below.
 *
 * Set the secrets in the Cloudflare Workers project. Never commit them.
 *
 * Counts recorded from the public profiles on 2026-10-26.
 */
export const COMMUNITY_HANDLES = {
  x: "lathos563",
  tiktok: "lathos.world",
} as const;

export const COMMUNITY_COUNT_FALLBACK = {
  x: 227,
  tiktok: 4,
} as const;
