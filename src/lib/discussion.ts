import { isClipDiscussionId } from "./clips.ts";

export const BOARD_SCOPE = "board";
export const TITLE_MIN = 3;
export const TITLE_MAX = 80;
export const BODY_MIN = 2;
export const BODY_MAX = 2000;
export const REASON_MAX = 300;
export const MAX_LINKS = 2;
export const MAX_DEPTH = 6;
export const RATE_WINDOW_MS = 10 * 60 * 1000;
export const RATE_MAX_POSTS = 6;
export const RATE_MIN_GAP_MS = 3 * 1000;
export const REPORT_MAX = 8;
/** Distinct reporters before a post is hidden for the owner to review. */
export const REPORT_HIDE_AT = 3;
export const DUPLICATE_MIN = 12;
export const NOTE_MIN = 12;
export const NOTE_MAX = 280;
/** Helpful ratings a note needs before it shows under the post. */
export const NOTE_HELPFUL_MIN = 3;

export const COMMUNITY_RULES =
  "Common courtesy. Be respectful.\nSlurs, threats, harassment, and spam get removed.";

export const HELD_NOTICE = "Held for review. It won't show until the owner clears it.";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Slurs and hate only. Ordinary swearing and gamer trash talk are left alone.
 * Patterns stay bounded so "classic", "cocktail", "Scunthorpe", and "grape"
 * are not flagged. A hit is hidden for review, not rejected.
 */
const SEVERE_WORDS = [
  "faggot",
  "fag",
  "nigger",
  "nigga",
  "retard",
  "rapist",
  "rape",
  "kike",
  "spic",
  "chink",
  "gook",
  "wetback",
  "beaner",
  "tranny",
  "coon",
  "paki",
  "raghead",
  "towelhead",
] as const;

const LINK_RE = /\b(?:https?:\/\/|www\.)[^\s<>"']+|\b(?:discord\.gg|bit\.ly|tinyurl\.com|t\.co|t\.me|goo\.gl)\/[^\s<>"']+/gi;

function wordPattern(word: string, suffixes: string): RegExp {
  const parts = word.split("").map((letter) => `${letter}+`);
  const body = parts.join("[^a-z]{0,2}");
  return new RegExp(`(?<![a-z])${body}(?:${suffixes})?(?![a-z])`, "i");
}

function spaced(words: string[]): RegExp {
  const chunk = (word: string) => word.split("").map((letter) => `${letter}+`).join("[^a-z]{0,2}");
  const body = words.map(chunk).join("[^a-z]{1,4}");
  return new RegExp(`(?<![a-z])${body}(?![a-z])`, "i");
}

const SEVERE_PATTERNS = SEVERE_WORDS.map((word) => wordPattern(word, "es|s|ed|y"));

/** Harassment and real threats. "I'll kill you" in a match is trash talk and stays up. */
const SEVERE_PHRASES = [
  spaced(["kys"]),
  spaced(["kms"]),
  spaced(["kill", "yourself"]),
  spaced(["kill", "urself"]),
  spaced(["neck", "yourself"]),
  spaced(["hope", "you", "die"]),
  spaced(["hope", "u", "die"]),
  /(?<![a-z])(?:ill|i will|iwill|im gonna|imgonna|im going to|gonna|going to)\s+rape\s+(?:you|u|ya|them|him|her)(?![a-z])/i,
];

export type TalkAuthor = {
  id: string;
  name: string;
  image: string | null;
};

export type TalkNoteStatus = "live" | "pending" | "held";

export type TalkNote = {
  id: string;
  postId: string;
  body: string;
  createdAt: string;
  author: TalkAuthor;
  helpful: number;
  notHelpful: number;
  myRating: "helpful" | "not" | null;
  status: TalkNoteStatus;
};

export type TalkPost = {
  id: string;
  parentId: string | null;
  title: string | null;
  body: string;
  createdAt: string;
  deleted: boolean;
  author: TalkAuthor;
  replyCount: number;
  reportCount: number;
  reportedByMe: boolean;
  notes: TalkNote[];
};

export type TalkViewer = {
  signedIn: boolean;
  userId: string | null;
  name: string | null;
  image: string | null;
  isAdmin: boolean;
  banned: boolean;
};

export type TalkBan = {
  userId: string;
  name: string;
  reason: string;
  createdAt: string;
};

export type TalkReview = {
  id: string;
  scope: string;
  title: string | null;
  body: string;
  createdAt: string;
  hidden: boolean;
  hiddenReason: string;
  reportCount: number;
  /** Informational only. Holding a post does not mute or ban. */
  proposedStrikes: number;
  author: TalkAuthor;
};

export type TalkNoteReview = {
  id: string;
  postId: string;
  place: string;
  postPreview: string;
  body: string;
  createdAt: string;
  status: "pending" | "held";
  helpful: number;
  notHelpful: number;
  author: TalkAuthor;
};

export type TalkFeed = {
  posts: TalkPost[];
  viewer: TalkViewer;
  bans: TalkBan[];
  queue: TalkReview[];
  noteQueue: TalkNoteReview[];
};

export const ANON_VIEWER: TalkViewer = {
  signedIn: false,
  userId: null,
  name: null,
  image: null,
  isAdmin: false,
  banned: false,
};

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function adminEmails(raw: string | undefined | null): Set<string> {
  if (!raw) return new Set();
  return new Set(
    raw
      .split(/[,;\s]+/)
      .map((part) => part.trim().toLowerCase())
      .filter((part) => part.includes("@")),
  );
}

export function isAdminEmail(email: string | null | undefined, raw: string | undefined | null): boolean {
  if (!email) return false;
  return adminEmails(raw).has(email.trim().toLowerCase());
}

/** Strip control characters. Keeps newlines and tabs. */
export function cleanText(value: unknown): string {
  const raw = String(value ?? "").replace(/\r\n/g, "\n");
  let out = "";
  for (const char of raw) {
    const code = char.codePointAt(0) ?? 0;
    if (code === 9 || code === 10) {
      out += char;
      continue;
    }
    if (code < 32 || code === 127) continue;
    if (code >= 0x200b && code <= 0x200d) continue;
    if (code === 0xfeff) continue;
    out += char;
  }
  return out.replace(/\n{3,}/g, "\n\n").trim();
}

function fold(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/['’`]/g, "")
    .replace(/[@4]/g, "a")
    .replace(/[3€]/g, "e")
    .replace(/1/g, "i")
    .replace(/0/g, "o")
    .replace(/[5$]/g, "s")
    .replace(/7/g, "t")
    .replace(/9/g, "g")
    .replace(/\u0430/g, "a")
    .replace(/\u0435/g, "e")
    .replace(/\u043e/g, "o")
    .replace(/\u0440/g, "p")
    .replace(/\u0441/g, "c")
    .replace(/\u0443/g, "y")
    .replace(/\u0445/g, "x")
    .replace(/\u0456/g, "i");
}

/** Second pass so n!gger and f|g still match, without turning "shit!" into a miss. */
function leet(text: string): string {
  return fold(text).replace(/[!|]/g, "i");
}

function matchesAny(text: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

export function severeLanguage(text: string): boolean {
  const forms = [fold(text), leet(text)];
  return forms.some((form) => matchesAny(form, SEVERE_PHRASES) || matchesAny(form, SEVERE_PATTERNS));
}

/** True only for slurs, hate, threats, and harassment. Swearing is not included. */
export function hasProfanity(text: string): boolean {
  return severeLanguage(text);
}

export function linkSpamError(text: string): string | null {
  const links = text.match(LINK_RE) ?? [];
  if (links.length > MAX_LINKS) return "Too many links. Two is the limit.";
  const compact = text.trim();
  const linkChars = links.reduce((sum, link) => sum + link.length, 0);
  if (links.length >= 1 && compact.length > 0 && linkChars / compact.length >= 0.55 && compact.length < 80) {
    return "That reads like link spam. Add a sentence.";
  }
  if (links.length >= 2 && compact.length < 40) return "That reads like link spam. Add a sentence.";
  return null;
}

export function normalizePost(text: string): string {
  return fold(cleanText(text))
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function duplicateError(
  body: string,
  title: string | null,
  recent: readonly { title: string | null; body: string }[],
): string | null {
  const bodyKey = normalizePost(body);
  const fullKey = normalizePost(`${title ?? ""} ${body}`);
  if (bodyKey.length < DUPLICATE_MIN && fullKey.length < DUPLICATE_MIN) return null;
  for (const item of recent) {
    const prevBody = normalizePost(item.body);
    const prevFull = normalizePost(`${item.title ?? ""} ${item.body}`);
    if (bodyKey.length >= DUPLICATE_MIN && prevBody === bodyKey) return "You already said that.";
    if (fullKey.length >= DUPLICATE_MIN && prevFull === fullKey) return "You already said that.";
  }
  return null;
}

export function validateTitle(value: unknown): { ok: true; title: string; hold: boolean } | { ok: false; error: string } {
  const title = cleanText(value).replace(/\s+/g, " ");
  if (title.length < TITLE_MIN) return { ok: false, error: `Give the thread a title of at least ${TITLE_MIN} characters.` };
  if (title.length > TITLE_MAX) return { ok: false, error: `Keep the title under ${TITLE_MAX} characters.` };
  if (severeLanguage(title)) return { ok: true, title, hold: true };
  if (linkSpamError(title)) return { ok: false, error: "Put the title in words, not links." };
  return { ok: true, title, hold: false };
}

export function validateNote(value: unknown): { ok: true; body: string; hold: boolean } | { ok: false; error: string } {
  const body = cleanText(value).replace(/\s+/g, " ");
  if (body.length < NOTE_MIN) return { ok: false, error: `Add a little more context (at least ${NOTE_MIN} characters).` };
  if (body.length > NOTE_MAX) return { ok: false, error: `Keep the note under ${NOTE_MAX} characters.` };
  if (!/[a-z0-9]/i.test(body)) return { ok: false, error: "Write something with words." };
  if (severeLanguage(body)) return { ok: true, body, hold: true };
  const links = linkSpamError(body);
  if (links) return { ok: false, error: links };
  return { ok: true, body, hold: false };
}

/** Public once enough people mark it helpful, and more say helpful than not. */
export function noteIsLive(helpful: number, notHelpful: number): boolean {
  return helpful >= NOTE_HELPFUL_MIN && helpful > notHelpful;
}

export function noteStatus(hidden: boolean, helpful: number, notHelpful: number): TalkNoteStatus {
  if (hidden) return "held";
  return noteIsLive(helpful, notHelpful) ? "live" : "pending";
}

export function noteVisibleTo(
  status: TalkNoteStatus,
  authorId: string,
  viewer: { signedIn: boolean; userId: string | null; isAdmin: boolean },
): boolean {
  if (status === "live") return true;
  if (!viewer.signedIn || !viewer.userId) return false;
  if (status === "pending") return true;
  return viewer.isAdmin || viewer.userId === authorId;
}

export function validateBody(value: unknown): { ok: true; body: string; hold: boolean } | { ok: false; error: string } {
  const body = cleanText(value);
  if (body.length < BODY_MIN) return { ok: false, error: "Write a little more than that." };
  if (body.length > BODY_MAX) return { ok: false, error: `Keep it under ${BODY_MAX} characters.` };
  if (!/[a-z0-9]/i.test(body)) return { ok: false, error: "Write something with words." };
  if (severeLanguage(body)) return { ok: true, body, hold: true };
  const links = linkSpamError(body);
  if (links) return { ok: false, error: links };
  return { ok: true, body, hold: false };
}

export function validateReason(value: unknown): { ok: true; reason: string } | { ok: false; error: string } {
  const reason = cleanText(value).replace(/\s+/g, " ");
  if (reason.length > REASON_MAX) return { ok: false, error: `Keep the note under ${REASON_MAX} characters.` };
  if (reason && hasProfanity(reason)) return { ok: false, error: "Take the language down a notch and try again." };
  return { ok: true, reason };
}

export function rateLimitError(recentCount: number, msSinceLast: number | null): string | null {
  if (msSinceLast != null && msSinceLast >= 0 && msSinceLast < RATE_MIN_GAP_MS) {
    return "Slow down a moment, then post again.";
  }
  if (recentCount >= RATE_MAX_POSTS) return "That's enough for a few minutes. Take a breath, then post again.";
  return null;
}

export function reportRateError(recentCount: number): string | null {
  if (recentCount >= REPORT_MAX) return "That's enough reports for now.";
  return null;
}

export function shouldHideForReports(reportCount: number): boolean {
  return reportCount >= REPORT_HIDE_AT;
}

/** Queue copy only. A count never mutes or bans on its own. */
export function proposedStrikeNote(count: number): string | null {
  if (count <= 0) return null;
  return count === 1 ? "Proposed strike: 1" : `Proposed strikes: ${count}`;
}

export function depthError(parentDepth: number): string | null {
  if (parentDepth >= MAX_DEPTH) return "Replies only nest six deep. Start a new thread.";
  return null;
}

export function safeAvatarUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function formatWhen(iso: string, now = Date.now()): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const delta = now - t;
  if (delta < 45_000) return "just now";
  const minutes = Math.round(delta / 60_000);
  if (minutes < 60) return `${Math.max(1, minutes)}m ago`;
  const hours = Math.round(delta / 3_600_000);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(delta / 86_400_000);
  if (days < 14) return `${days}d ago`;
  const date = new Date(t);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}

export function previewText(body: string, max = 140): string {
  const one = body.replace(/\s+/g, " ").trim();
  if (one.length <= max) return one;
  return `${one.slice(0, max - 1).trimEnd()}…`;
}

export function postsByParent(posts: TalkPost[], parentId: string | null): TalkPost[] {
  return posts.filter((post) => post.parentId === parentId);
}

export function initial(name: string): string {
  const letter = name.trim().charAt(0).toUpperCase();
  return letter || "·";
}

export function isAllowedClipId(value: string): boolean {
  return isClipDiscussionId(value);
}

export function reviewPlace(scope: string): string {
  if (scope === BOARD_SCOPE) return "Community";
  if (scope.startsWith("clip:")) return "Clip comment";
  return "Post";
}
