import { chicagoDateKey } from "./clips.ts";
import { cleanText, linkSpamError, severeLanguage } from "./discussion.ts";

export const POLL_Q_MIN = 8;
export const POLL_Q_MAX = 140;
export const POLL_OPT_MAX = 40;
export const POLL_OPT_MIN_COUNT = 2;
export const POLL_OPT_MAX_COUNT = 4;

export type BankPoll = {
  id: string;
  question: string;
  options: readonly string[];
};

/** Fun questions about gaming, streaming, and LathosWorld. Each one starts pending. */
export const POLL_BANK: readonly BankPoll[] = [
  { id: "borderlands", question: "Best Borderlands character?", options: ["Lilith", "Zer0", "Maya", "Tiny Tina"] },
  { id: "snacks", question: "Snacks for a 6-hour stream?", options: ["Chips", "Candy", "Something hot", "Just a drink"] },
  { id: "next-game", question: "Next game Lathos should play?", options: ["Another looter", "A horror game", "Something cozy", "Chat picks the chaos"] },
  { id: "swords-guns", question: "Swords or guns?", options: ["Swords", "Guns"] },
  { id: "owl", question: "Night owl or early bird gamer?", options: ["Night owl", "Early bird"] },
  { id: "once-human", question: "Once Human: build the base or fight first?", options: ["Build", "Fight", "Wander"] },
  { id: "stream-length", question: "Best stream length?", options: ["Under 2 hours", "A solid 4", "6 hours or bust"] },
  { id: "mic", question: "Mic on or quiet lobby?", options: ["Mic on", "Quiet lobby"] },
  { id: "controls", question: "Controller or keyboard?", options: ["Controller", "Keyboard and mouse", "Whatever is in reach"] },
  { id: "drink", question: "Raid drink of choice?", options: ["Water", "Soda", "Coffee", "Energy drink"] },
  { id: "squad", question: "Solo queue or a stack?", options: ["Solo", "A stack"] },
  { id: "spoilers", question: "Spoilers: right away or wait?", options: ["Tell me now", "Let me find it"] },
  { id: "clips", question: "Better clip: the funny fail or the clutch?", options: ["Funny fail", "Clutch"] },
  { id: "tonight", question: "Borderlands or Once Human tonight?", options: ["Borderlands", "Once Human", "Surprise me"] },
  { id: "open", question: "How should a stream open?", options: ["Chat first", "Straight into the game"] },
  { id: "loot", question: "What keeps you in a game?", options: ["Loot", "The story", "The people"] },
  { id: "music", question: "Music in the background or in-game sound?", options: ["Music", "In-game sound", "Silence"] },
  { id: "coop", question: "Best co-op size?", options: ["Duo", "A full squad", "The more the messier"] },
  { id: "wipe", question: "After a wipe, what next?", options: ["Laugh and reset", "Lock in"] },
  { id: "chat", question: "Chat energy?", options: ["Emotes everywhere", "Actual sentences", "Lurk"] },
  { id: "boss", question: "Boss fight: learn it or send it?", options: ["Learn the mechanics", "Send it"] },
  { id: "inventory", question: "Inventory: hoarder or clean?", options: ["Hoarder", "Clean"] },
  { id: "patch", question: "Patch day: day one or wait?", options: ["Day one", "Wait a week"] },
  { id: "weapon", question: "Favorite weapon vibe?", options: ["Big and loud", "Fast and precise", "Weird and funny"] },
  { id: "overlay", question: "Stream look?", options: ["Busy overlay", "Clean and simple"] },
  { id: "grind", question: "Grinding audio?", options: ["A podcast", "The game", "A playlist"] },
  { id: "gg", question: "After a win?", options: ["A calm gg", "A victory lap"] },
  { id: "night", question: "Next community night?", options: ["A raid", "A chill build stream", "Viewer games"] },
  { id: "difficulty", question: "Difficulty?", options: ["Normal", "Make it hurt"] },
  { id: "side", question: "Main quest or side quests?", options: ["Main quest", "Every side quest"] },
];

export type PollChoice = {
  id: string;
  label: string;
  votes: number;
  pct: number;
};

export type PollCard = {
  id: string;
  question: string;
  options: PollChoice[];
  total: number;
  myOptionId: string | null;
  closed: boolean;
};

export type PollSuggestionView = {
  id: string;
  question: string;
  options: string[];
  authorName: string;
  createdAt: string;
  reason: string;
  source: "bank" | "fan";
  status: "pending" | "approved";
};

/** Stable id for a seeded question. It stays pending until the owner approves it. */
export function seedPollId(bankId: string): string {
  return `poll:bank:${bankId}`;
}

export type RotationDecision =
  | { action: "keep"; pollId: string }
  | { action: "feature"; pollId: string; closeId: string | null }
  | { action: "none" };

/**
 * Monday rotation only. An unapproved poll is never featured.
 * A live poll stays up when nothing approved is waiting, including into the next week.
 * A new approved poll does not replace one that already belongs to this week.
 */
export function rotationChoice(input: {
  weekKey: string;
  current: { id: string; weekKey: string | null } | null;
  nextApprovedId: string | null;
}): RotationDecision {
  const current = input.current;
  const next = input.nextApprovedId;
  if (current && (current.weekKey === input.weekKey || !next)) {
    return { action: "keep", pollId: current.id };
  }
  if (next) return { action: "feature", pollId: next, closeId: current?.id ?? null };
  return { action: "none" };
}

/** Monday of the Chicago calendar week, `YYYY-MM-DD`. A new poll starts that morning. */
export function chicagoWeekKey(dateKey: string = chicagoDateKey()): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return dateKey;
  const utc = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const day = new Date(utc).getUTCDay();
  const monday = new Date(utc - ((day + 6) % 7) * 86_400_000);
  const year = monday.getUTCFullYear();
  const month = String(monday.getUTCMonth() + 1).padStart(2, "0");
  const date = String(monday.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${date}`;
}

export function pollPercents(counts: readonly number[]): number[] {
  const total = counts.reduce((sum, count) => sum + count, 0);
  if (total <= 0) return counts.map(() => 0);
  return counts.map((count) => Math.round((count / total) * 100));
}

export function validatePoll(
  question: unknown,
  rawOptions: unknown,
): { ok: true; question: string; options: string[]; hold: boolean } | { ok: false; error: string } {
  const asked = cleanText(question).replace(/\s+/g, " ");
  if (asked.length < POLL_Q_MIN) return { ok: false, error: "Ask a little more than that." };
  if (asked.length > POLL_Q_MAX) return { ok: false, error: `Keep the question under ${POLL_Q_MAX} characters.` };
  const list = Array.isArray(rawOptions) ? rawOptions : [];
  const options = list.map((item) => cleanText(item).replace(/\s+/g, " ")).filter((item) => item.length > 0);
  if (options.length < POLL_OPT_MIN_COUNT) return { ok: false, error: "Add at least two choices." };
  if (options.length > POLL_OPT_MAX_COUNT) return { ok: false, error: "Four choices is the limit." };
  if (options.some((item) => item.length > POLL_OPT_MAX)) {
    return { ok: false, error: `Keep each choice under ${POLL_OPT_MAX} characters.` };
  }
  const folded = new Set(options.map((item) => item.toLowerCase()));
  if (folded.size !== options.length) return { ok: false, error: "Those choices repeat." };
  if (linkSpamError([asked, ...options].join(" "))) return { ok: false, error: "Leave the links out of a poll." };
  const hold = [asked, ...options].some((item) => severeLanguage(item));
  return { ok: true, question: asked, options, hold };
}
