import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { DESK_EMAIL } from "@/lib/helpdesk";

function cleanEmail(value: unknown) {
  const email = String(value ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 180) {
    throw new Error("Enter a real email.");
  }
  return email;
}

function cleanName(value: unknown) {
  const name = String(value ?? "").trim().replace(/\s+/g, " ").slice(0, 24);
  if (!name) return "";
  if (name.includes("@") || /[<>]/.test(name)) {
    throw new Error("Use a first name or nickname. No email.");
  }
  return name;
}

function joinInput(value: unknown) {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const email = cleanEmail(raw.email);
  const wall = raw.wall === true;
  const name = cleanName(raw.name);
  if (wall && !name) throw new Error("Add a first name or nickname to show on the wall.");
  return { email, name: wall ? name : "", wall };
}

async function mailList(email: string, mode: "in" | "out", extra?: { name?: string; wall?: boolean }) {
  try {
    const res = await fetch(`https://formsubmit.co/ajax/${DESK_EMAIL}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Origin: "https://lathosworld.com",
        Referer: "https://lathosworld.com/help",
      },
      signal: AbortSignal.timeout(12000),
      body: JSON.stringify({
        _subject: mode === "in" ? "The Official Shit List: new signup" : "The Official Shit List: remove me",
        _template: "table",
        _captcha: "false",
        list: mode === "in" ? "join" : "leave",
        email,
        name: extra?.name || "",
        wall: extra?.wall ? "show name" : "private",
      }),
    });
    const body = (await res.json().catch(() => ({}))) as { success?: string | boolean };
    return body.success === true || body.success === "true";
  } catch {
    return false;
  }
}

async function writeSubscriber(email: string, mode: "in" | "out", extra?: { name: string; wall: boolean }) {
  try {
    const sql = await getSql();
    if (mode === "in") {
      const name = extra?.wall ? extra.name : null;
      const wall = Boolean(name);
      await sql`insert into newsletter_subscriber (email, display_name, show_on_wall)
        values (${email}, ${name}, ${wall})
        on conflict (email) do update set display_name = excluded.display_name, show_on_wall = excluded.show_on_wall`;
    } else {
      await sql`delete from newsletter_subscriber where email = ${email}`;
    }
    await mailList(email, mode, extra);
    return { ok: true as const };
  } catch (err) {
    console.error("[list] database unavailable, mailing instead", err);
  }
  if (await mailList(email, mode, extra)) return { ok: true as const };
  throw new Error("Could not save that email. Try again in a moment.");
}

export const joinLetter = createServerFn({ method: "POST" })
  .validator(joinInput)
  .handler(async ({ data }) => writeSubscriber(data.email, "in", data));

export const leaveLetter = createServerFn({ method: "POST" })
  .validator(cleanEmail)
  .handler(async ({ data: email }) => writeSubscriber(email, "out"));

export const listSurvivors = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const sql = await getSql();
    const rows = await sql<{ display_name: string }>`
      select display_name from newsletter_subscriber
      where show_on_wall = true and display_name is not null and length(trim(display_name)) > 0
      order by created_at asc`;
    return rows.map((row) => row.display_name);
  } catch (err) {
    console.error("[wall] could not read names", err);
    return [] as string[];
  }
});
