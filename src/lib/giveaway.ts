/**
 * $LWRLD giveaway: config, entry math, and the weighted draw.
 * Dependency-free so the client, the server, and the unit tests share it.
 *
 * Launch: the page stays hidden until the server env var GIVEAWAY_OPEN is set
 * to "true" in Cloudflare. Admins (COMMUNITY_ADMIN_EMAIL) can always preview.
 * Entries stop at GIVEAWAY_ENDS_AT no matter what the flag says.
 */

/** `discussion_post.scope` for giveaway comments (same as GIVEAWAY_SCOPE in discussion.ts). */
export const GIVEAWAY_SCOPE_NAME = "giveaway";

export const GIVEAWAY_TITLE = "WIN UP TO 1,000,000 $LWRLD";

/** 2027-07-09 23:59 America/Chicago (CDT, UTC-5 in July). Lathos's birthday. */
export const GIVEAWAY_ENDS_AT = "2027-07-09T23:59:00-05:00";

/** Comment entries: at most this many per person per Chicago calendar day. */
export const COMMENT_ENTRIES_PER_DAY = 1;

/** Entry actions (connect, save a handle) allowed per person per window. */
export const ACTION_WINDOW_MS = 10 * 60 * 1000;
export const ACTION_MAX = 12;

/** Paste the giveaway post's URL or id here once it is live (admins can also type it in the X check). */
export const GIVEAWAY_X_POST_ID = "";

/* ------------------------- Fair-play rules (edit here) ------------------------- */

/**
 * Planned prizes. Lathos announces final amounts, so this is the one place to change them.
 * `count` is how many winners share that tier (each gets `amount`).
 */
export const PRIZE_TIERS: readonly { place: string; amount: number; count: number }[] = [
  { place: "1st", amount: 500_000, count: 1 },
  { place: "2nd", amount: 250_000, count: 1 },
  { place: "3rd–7th", amount: 50_000, count: 5 },
];

export const PRIZE_TOTAL = PRIZE_TIERS.reduce((sum, tier) => sum + tier.amount * tier.count, 0);
export const WINNER_COUNT = PRIZE_TIERS.reduce((sum, tier) => sum + tier.count, 0);

/** Most entries one person can have (follows + bonus + comment days). */
export const MAX_ENTRIES_PER_PERSON = 10;

/** Winners have this many days to claim publicly, or Lathos re-draws. */
export const CLAIM_DAYS = 7;

/** Minimum age to enter. */
export const MIN_AGE = 18;

export const LEGAL_FOOTER = "No purchase necessary. Void where prohibited. 18+. Not financial advice.";

export function formatTokens(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

/** When a draw's claim window closes. */
export function claimDeadline(drawnAt: string | number | Date): number {
  const at = drawnAt instanceof Date ? drawnAt.getTime() : new Date(drawnAt).getTime();
  return at + CLAIM_DAYS * 24 * 60 * 60 * 1000;
}

export type ClaimStatus = "waiting" | "claimed" | "expired";

/** A waiting claim past its deadline reads as expired. */
export function effectiveClaim(status: ClaimStatus, drawnAt: string, now = Date.now()): ClaimStatus {
  if (status === "waiting" && now > claimDeadline(drawnAt)) return "expired";
  return status;
}

/** Exclusion list entries: an email, a user id, or a social handle. Compared lowercased without "@". */
export function exclusionKey(raw: unknown): string | null {
  const key = String(raw ?? "").trim().toLowerCase().replace(/^@/, "");
  if (!key || key.length > 200 || /\s/.test(key)) return null;
  return key;
}

/* ----------------------------------- Ticker ----------------------------------- */

export const TICKER_SUFFIX = "has entered the LathosWorld Million Token Giveaway!";
export const TICKER_MAX = 30;
export const TICKER_REFRESH_MS = 60_000;

/** A safe public name: never an email, never control characters, short. */
export function tickerName(name: unknown, fallback?: string | null): string | null {
  const clean = (value: unknown) =>
    [...String(value ?? "")]
      .filter((char) => {
        const code = char.codePointAt(0) ?? 0;
        return code >= 32 && code !== 127;
      })
      .join("")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 40);
  const looksLikeEmail = (value: string) => /\S+@\S+\.\S+/.test(value);
  const first = clean(name);
  if (first && !looksLikeEmail(first)) return first;
  const second = clean(fallback);
  if (second && !looksLikeEmail(second)) return second;
  return null;
}

export const NEVER_DM_LINE = "I'll never DM you first. Official info only at lathosworld.com";

/** Scam warning shown next to the wallet field and in the Official Rules. */
export const OFFICIAL_CONTRACT = "0x3899ebf76c768c156df3073031a4518c5f947777";
export const SCAM_WARNING =
  "LathosWorld / @lathos563 will never DM you asking for your wallet, a payment, a fee, or a seed phrase. " +
  "Winners are announced live on stream and contacted only through lathosworld.com. " +
  `The only official $LWRLD contract is ${OFFICIAL_CONTRACT}.`;
export const SEED_PHRASE_WARNING =
  "Never share your seed phrase (recovery phrase) or private key. Nobody needs it to send you a prize, and this site will never ask for it.";
export const WALLET_FREE_NOTE = "Wallets are free. No purchase necessary.";

export const TWITCH_LOGIN = "lathosworld";
export const X_HANDLE = "lathos563";
export const TIKTOK_HANDLE = "lathos.world";
export const YOUTUBE_URL = "https://www.youtube.com/@lathos563";

export type GiveawayState = "hidden" | "open" | "ended";

export type TwitchStatus = "none" | "verified" | "not_following" | "rejected";
export type YouTubeStatus = "none" | "verified" | "not_subscribed" | "self_reported" | "rejected";
export type XStatus = "none" | "pending" | "verified" | "not_following" | "rejected";
export type XRepostStatus = "none" | "pending" | "verified" | "not_found" | "rejected";
export type TikTokStatus = "none" | "unverified" | "verified" | "rejected";

export type WalletStatus = "none" | "ok" | "flagged" | "cleared" | "rejected";

export type Platform = "twitch" | "youtube" | "x" | "x_repost" | "tiktok" | "wallet";

export const ADMIN_STATUSES: Record<Platform, readonly string[]> = {
  twitch: ["none", "verified", "not_following", "rejected"],
  youtube: ["none", "verified", "not_subscribed", "self_reported", "rejected"],
  x: ["none", "pending", "verified", "not_following", "rejected"],
  x_repost: ["none", "pending", "verified", "not_found", "rejected"],
  tiktok: ["none", "unverified", "verified", "rejected"],
  wallet: ["none", "ok", "flagged", "cleared", "rejected"],
};

/**
 * Why a wallet keeps someone from winning, or null when it's fine.
 * A wallet is required to enter; a wallet shared with another account is flagged
 * (Flagged & Excluded) until the owner clears it.
 */
export function walletIneligible(address: string | null | undefined, status: string): string | null {
  if (!address || status === "none") return "No wallet address";
  if (status === "rejected") return "Wallet rejected";
  if (status === "flagged") return "Flagged & Excluded: wallet used by another entrant";
  return null;
}

/** Effective wallet status: a wallet shared with another entrant reads as flagged unless the owner cleared it. */
export function effectiveWalletStatus(address: string | null | undefined, stored: string, sharedCount: number): WalletStatus {
  if (!address) return "none";
  if (stored === "rejected") return "rejected";
  if (stored === "cleared") return "cleared";
  if (stored === "flagged" || sharedCount > 1) return "flagged";
  return "ok";
}

export type EntryStatuses = {
  twitch: TwitchStatus;
  youtube: YouTubeStatus;
  x: XStatus;
  xRepost: XRepostStatus;
  tiktok: TikTokStatus;
};

export type EntryBreakdown = {
  follows: number;
  comments: number;
  /** follows + comments, capped at MAX_ENTRIES_PER_PERSON. */
  total: number;
  /** True when the cap cut the total. */
  capped: boolean;
};

/** Statuses that earn an entry. Pending and self-reported count until checked. */
const COUNTS = {
  twitch: new Set(["verified"]),
  youtube: new Set(["verified", "self_reported"]),
  x: new Set(["pending", "verified"]),
  xRepost: new Set(["pending", "verified"]),
  tiktok: new Set(["unverified", "verified"]),
};

/** With "verified only", nothing self-reported or pending counts. */
const VERIFIED = {
  twitch: new Set(["verified"]),
  youtube: new Set(["verified"]),
  x: new Set(["verified"]),
  xRepost: new Set(["verified"]),
  tiktok: new Set(["verified"]),
};

export function followEntries(s: EntryStatuses, verifiedOnly = false): number {
  const rules = verifiedOnly ? VERIFIED : COUNTS;
  let n = 0;
  if (rules.twitch.has(s.twitch)) n += 1;
  if (rules.youtube.has(s.youtube)) n += 1;
  if (rules.x.has(s.x)) n += 1;
  // The like + repost bonus rides on an entered X handle.
  if (s.x !== "none" && s.x !== "rejected" && rules.xRepost.has(s.xRepost)) n += 1;
  if (rules.tiktok.has(s.tiktok)) n += 1;
  return n;
}

export function breakdown(s: EntryStatuses, commentEntries: number, verifiedOnly = false): EntryBreakdown {
  const follows = followEntries(s, verifiedOnly);
  const comments = Math.max(0, Math.floor(Number.isFinite(commentEntries) ? commentEntries : 0));
  const raw = follows + comments;
  return { follows, comments, total: Math.min(raw, MAX_ENTRIES_PER_PERSON), capped: raw > MAX_ENTRIES_PER_PERSON };
}

/** Comment entries from per-day comment counts, capped per day. */
export function commentEntriesFromDays(perDay: readonly number[], cap = COMMENT_ENTRIES_PER_DAY): number {
  let n = 0;
  for (const count of perDay) {
    if (count > 0) n += Math.min(count, cap);
  }
  return n;
}

export function giveawayState(flag: string | undefined, now: number = Date.now()): GiveawayState {
  if (String(flag ?? "").trim().toLowerCase() !== "true") return "hidden";
  return now > Date.parse(GIVEAWAY_ENDS_AT) ? "ended" : "open";
}

export function isEntryWindowOpen(now: number = Date.now()): boolean {
  return now <= Date.parse(GIVEAWAY_ENDS_AT);
}

export const STATUS_LABEL: Record<string, string> = {
  none: "Not entered",
  verified: "Verified",
  not_following: "Not following",
  not_subscribed: "Not subscribed",
  not_found: "Not found",
  self_reported: "Unverified, spot-check",
  unverified: "Unverified, spot-check",
  pending: "Pending check",
  rejected: "Rejected",
  ok: "Valid",
  flagged: "Flagged & Excluded",
  cleared: "Cleared by owner",
};

export function statusLabel(status: string): string {
  return STATUS_LABEL[status] ?? status;
}

export type HandleResult = { ok: true; handle: string } | { ok: false; error: string };

export function normalizeXHandle(raw: unknown): HandleResult {
  const handle = String(raw ?? "")
    .trim()
    .replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//i, "")
    .replace(/^@/, "")
    .replace(/[/?#].*$/, "");
  if (!/^[A-Za-z0-9_]{1,15}$/.test(handle)) return { ok: false, error: "That X handle doesn't look right." };
  return { ok: true, handle };
}

export function normalizeTikTokHandle(raw: unknown): HandleResult {
  const handle = String(raw ?? "")
    .trim()
    .replace(/^https?:\/\/(www\.)?tiktok\.com\//i, "")
    .replace(/^@/, "")
    .replace(/[/?#].*$/, "");
  if (!/^[A-Za-z0-9_.]{2,24}$/.test(handle)) return { ok: false, error: "That TikTok username doesn't look right." };
  return { ok: true, handle };
}

export function normalizeYouTubeHandle(raw: unknown): HandleResult {
  const handle = String(raw ?? "")
    .trim()
    .replace(/^https?:\/\/(www\.|m\.)?youtube\.com\//i, "")
    .replace(/^@/, "")
    .replace(/[/?#].*$/, "");
  if (!/^[A-Za-z0-9_.-]{3,30}$/.test(handle)) return { ok: false, error: "That YouTube handle doesn't look right." };
  return { ok: true, handle: `@${handle}` };
}

/** Pull a post id out of an x.com / twitter.com status URL, or accept a bare id. */
export function xPostId(raw: unknown): string | null {
  const text = String(raw ?? "").trim();
  if (/^\d{5,25}$/.test(text)) return text;
  const match = /(?:x|twitter)\.com\/[^/]+\/status(?:es)?\/(\d{5,25})/i.exec(text);
  return match?.[1] ?? null;
}

export type DrawCandidate = { id: string; weight: number };

/**
 * Weighted pick. `randomInt(n)` must return a uniform integer in [0, n).
 * Each entry is one ticket, so a person with 4 entries is 4x as likely as one with 1.
 */
export function pickWeighted<T extends DrawCandidate>(
  candidates: readonly T[],
  randomInt: (n: number) => number,
): T | null {
  const pool = candidates.filter((c) => Number.isFinite(c.weight) && c.weight > 0);
  const total = pool.reduce((sum, c) => sum + Math.floor(c.weight), 0);
  if (total <= 0) return null;
  let ticket = randomInt(total);
  if (!Number.isInteger(ticket) || ticket < 0 || ticket >= total) ticket = 0;
  for (const c of pool) {
    ticket -= Math.floor(c.weight);
    if (ticket < 0) return c;
  }
  return pool[pool.length - 1] ?? null;
}

/** Uniform integer in [0, n) from crypto, with rejection sampling (no modulo bias). */
export function cryptoRandomInt(n: number): number {
  if (!Number.isInteger(n) || n <= 0) return 0;
  const limit = Math.floor(0x100000000 / n) * n;
  const buf = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buf);
    const value = buf[0] ?? 0;
    if (value < limit) return value % n;
  }
}

function csvCell(value: unknown): string {
  let text = value == null ? "" : String(value);
  // Keep spreadsheets from running a cell as a formula.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(header: readonly string[], rows: readonly (readonly unknown[])[]): string {
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

export const ADMIN_NOTE_MAX = 500;

const CHICAGO_DAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Chicago",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** YYYY-MM-DD on the America/Chicago calendar. */
export function chicagoDay(at: Date | number | string): string {
  const date = at instanceof Date ? at : new Date(at);
  return CHICAGO_DAY.format(date);
}

/**
 * Comment entries per author from visible comment timestamps.
 * Comments after the end date never count. Each Chicago day earns at most `cap`.
 */
export function commentEntriesByAuthor(
  rows: readonly { authorId: string; createdAt: Date | number | string }[],
  cap = COMMENT_ENTRIES_PER_DAY,
  endsAt = Date.parse(GIVEAWAY_ENDS_AT),
): Map<string, number> {
  const days = new Map<string, Map<string, number>>();
  for (const row of rows) {
    const at = row.createdAt instanceof Date ? row.createdAt.getTime() : new Date(row.createdAt).getTime();
    if (!Number.isFinite(at) || at > endsAt) continue;
    let perDay = days.get(row.authorId);
    if (!perDay) {
      perDay = new Map();
      days.set(row.authorId, perDay);
    }
    const key = chicagoDay(at);
    perDay.set(key, (perDay.get(key) ?? 0) + 1);
  }
  const out = new Map<string, number>();
  for (const [author, perDay] of days) out.set(author, commentEntriesFromDays([...perDay.values()], cap));
  return out;
}
