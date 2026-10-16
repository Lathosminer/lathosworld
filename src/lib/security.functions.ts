import { createServerFn } from "@tanstack/react-start";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { hashPassword } from "better-auth/crypto";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";

const scryptAsync = promisify(scrypt);

export const SECURITY_QUESTIONS = [
  "What was the first game you finished?",
  "What was your first console?",
  "What city were you born in?",
  "What was the name of your first pet?",
  "What street did you grow up on?",
  "Who was your childhood hero?",
] as const;

type Pair = { question: string; answer: string };

const fails = new Map<string, { n: number; until: number }>();

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function assertPairs(items: Pair[]) {
  if (!Array.isArray(items) || items.length !== 2) {
    throw new Error("Pick two security questions.");
  }
  const questions = items.map((item) => item.question);
  if (new Set(questions).size !== 2) throw new Error("Pick two different questions.");
  for (const item of items) {
    if (!SECURITY_QUESTIONS.includes(item.question as (typeof SECURITY_QUESTIONS)[number])) {
      throw new Error("Pick a question from the list.");
    }
    if (normalize(item.answer).length < 2) throw new Error("Each answer needs at least 2 characters.");
  }
  return items.map((item) => ({ question: item.question, answer: normalize(item.answer) }));
}

async function hashAnswer(answer: string) {
  const salt = randomBytes(16).toString("hex");
  const key = (await scryptAsync(answer, salt, 32)) as Buffer;
  return `${salt}:${key.toString("hex")}`;
}

async function answerMatches(answer: string, stored: string) {
  const [salt, hex] = stored.split(":");
  if (!salt || !hex) return false;
  const key = (await scryptAsync(normalize(answer), salt, 32)) as Buffer;
  const prev = Buffer.from(hex, "hex");
  if (prev.length !== key.length) return false;
  return timingSafeEqual(prev, key);
}

function guard(email: string) {
  const hit = fails.get(email);
  if (hit && hit.until > Date.now()) throw new Error("Too many tries. Wait a few minutes.");
}

function noteFail(email: string) {
  const hit = fails.get(email);
  const n = (hit && hit.until > Date.now() ? hit.n : 0) + 1;
  fails.set(email, { n, until: n >= 5 ? Date.now() + 15 * 60 * 1000 : Date.now() + 60 * 1000 });
}

export const saveSecurity = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { items: Pair[] }) => assertPairs(input?.items ?? []))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`delete from security_answer where user_id = ${context.userId}`;
    for (const item of data) {
      const answerHash = await hashAnswer(item.answer);
      await sql`insert into security_answer (user_id, question, answer_hash) values (${context.userId}, ${item.question}, ${answerHash})`;
    }
    return { ok: true as const };
  });

export const mySecurity = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{ question: string }>`select question from security_answer where user_id = ${context.userId} order by id`;
    return rows.map((row) => row.question);
  });

export const recoveryQuestions = createServerFn({ method: "POST" })
  .validator((email: string) => email.trim().toLowerCase())
  .handler(async ({ data: email }) => {
    if (!email.includes("@")) throw new Error("Enter the email on the account.");
    const sql = await getSql();
    const users = await sql<{ id: string }>`select id from "user" where lower(email) = ${email} limit 1`;
    if (!users[0]) return { questions: [] as string[] };
    const rows = await sql<{ question: string }>`select question from security_answer where user_id = ${users[0].id} order by id`;
    return { questions: rows.map((row) => row.question) };
  });

export const resetWithSecurity = createServerFn({ method: "POST" })
  .validator((input: { email: string; answers: string[]; password: string }) => {
    const email = String(input?.email ?? "").trim().toLowerCase();
    const answers = Array.isArray(input?.answers) ? input.answers.map((a) => String(a)) : [];
    const password = String(input?.password ?? "");
    if (!email.includes("@")) throw new Error("Enter the email on the account.");
    if (password.length < 8 || password.length > 128) throw new Error("Password must be 8 to 128 characters.");
    return { email, answers, password };
  })
  .handler(async ({ data }) => {
    guard(data.email);
    const sql = await getSql();
    const users = await sql<{ id: string }>`select id from "user" where lower(email) = ${data.email} limit 1`;
    const user = users[0];
    const rows = user
      ? await sql<{ answer_hash: string }>`select answer_hash from security_answer where user_id = ${user.id} order by id`
      : [];
    if (!user || rows.length !== 2 || data.answers.length !== 2) {
      noteFail(data.email);
      throw new Error("Those answers don't match.");
    }
    const ok = await Promise.all(rows.map((row, i) => answerMatches(data.answers[i] ?? "", row.answer_hash)));
    if (ok.some((hit) => !hit)) {
      noteFail(data.email);
      throw new Error("Those answers don't match.");
    }
    const hashed = await hashPassword(data.password);
    const updated = await sql<{ id: string }>`update "account" set password = ${hashed}, "updatedAt" = now() where "userId" = ${user.id} and "providerId" = 'credential' returning id`;
    if (updated.length === 0) throw new Error("That account has no password to reset.");
    await sql`delete from "session" where "userId" = ${user.id}`;
    fails.delete(data.email);
    return { ok: true as const };
  });
