import { isClipDiscussionId } from "./clip-ids.ts";

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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Whole words, plus a short suffix (fucking, shitty) and light separator evasion
 * (f.u.c.k). Short words stay bounded so "classic", "cocktail", and "Scunthorpe"
 * are not flagged.
 */
const BLOCKED_WORDS = [
  "fuck",
  "shit",
  "bitch",
  "cunt",
  "dick",
  "cock",
  "porn",
  "whore",
  "slut",
  "fag",
  "faggot",
  "nigger",
  "nigga",
  "retard",
  "rape",
  "rapist",
] as const;

const LINK_RE = /\b(?:https?:\/\/|www\.)[^\s<>"']+|\b(?:discord\.gg|bit\.ly|tinyurl\.com|t\.co|t\.me|goo\.gl)\/[^\s<>"']+/gi;

const WORD_PATTERNS = BLOCKED_WORDS.map((word) => {
  const parts = word.split("").map((letter) => `${letter}+`);
  const body = parts.join("[^a-z]{0,2}");
  return new RegExp(`(?<![a-z])${body}(?:es|s|y|ty|ing|er|ers|ed)?(?![a-z])`, "i");
});

/** f*ck / fck, without matching "flick" or "feedback". */
const FUCK_EVASION = /(?<![a-z])f+[^a-z]{0,2}c+[^a-z]{0,2}k+(?:s|ing|er|ed)?(?![a-z])/i;

export type TalkAuthor = {
  id: string;
  name: string;
  image: string | null;
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

export type TalkFeed = {
  posts: TalkPost[];
  viewer: TalkViewer;
  bans: TalkBan[];
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
    .replace(/[@4]/g, "a")
    .replace(/3/g, "e")
    .replace(/1/g, "i")
    .replace(/0/g, "o")
    .replace(/5/g, "s")
    .replace(/\$/g, "s")
    .replace(/7/g, "t");
}

export function hasProfanity(text: string): boolean {
  const folded = fold(text);
  if (/\bkill\s+yourself\b/.test(folded) || /\bkys\b/.test(folded)) return true;
  if (FUCK_EVASION.test(folded)) return true;
  return WORD_PATTERNS.some((pattern) => pattern.test(folded));
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

export function validateTitle(value: unknown): { ok: true; title: string } | { ok: false; error: string } {
  const title = cleanText(value).replace(/\s+/g, " ");
  if (title.length < TITLE_MIN) return { ok: false, error: `Give the thread a title of at least ${TITLE_MIN} characters.` };
  if (title.length > TITLE_MAX) return { ok: false, error: `Keep the title under ${TITLE_MAX} characters.` };
  if (hasProfanity(title)) return { ok: false, error: "Take the language down a notch and try again." };
  if (linkSpamError(title)) return { ok: false, error: "Put the title in words, not links." };
  return { ok: true, title };
}

export function validateBody(value: unknown): { ok: true; body: string } | { ok: false; error: string } {
  const body = cleanText(value);
  if (body.length < BODY_MIN) return { ok: false, error: "Write a little more than that." };
  if (body.length > BODY_MAX) return { ok: false, error: `Keep it under ${BODY_MAX} characters.` };
  if (!/[a-z0-9]/i.test(body)) return { ok: false, error: "Write something with words." };
  if (hasProfanity(body)) return { ok: false, error: "Take the language down a notch and try again." };
  const links = linkSpamError(body);
  if (links) return { ok: false, error: links };
  return { ok: true, body };
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
