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

// Fallback when the database is unavailable (e.g. the Worker has no DATABASE_URL):
// mail the request to the desk inbox so no signup is lost.
async function mailList(email: string, mode: "in" | "out") {
  try {
    const res = await fetch(`https://formsubmit.co/ajax/${DESK_EMAIL}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        // FormSubmit rejects server-side posts without a site Origin/Referer.
        Origin: "https://lathosworld.com",
        Referer: "https://lathosworld.com/help", // the activated FormSubmit referrer
      },
      signal: AbortSignal.timeout(12000),
      body: JSON.stringify({
        _subject: mode === "in" ? "The list: new signup" : "The list: remove me",
        _template: "table",
        _captcha: "false",
        list: mode === "in" ? "join" : "leave",
        email,
      }),
    });
    const body = (await res.json().catch(() => ({}))) as { success?: string | boolean; message?: string };
    return body.success === true || body.success === "true";
  } catch {
    return false;
  }
}

async function writeSubscriber(email: string, mode: "in" | "out") {
  try {
    const sql = await getSql();
    if (mode === "in") {
      await sql`insert into newsletter_subscriber (email) values (${email}) on conflict (email) do nothing`;
    } else {
      await sql`delete from newsletter_subscriber where email = ${email}`;
    }
    // Saved. Also mail a copy to the desk inbox; a mail hiccup never fails the visitor.
    await mailList(email, mode);
    return { ok: true as const };
  } catch (err) {
    console.error("[list] database unavailable, mailing instead", err);
  }
  if (await mailList(email, mode)) return { ok: true as const };
  throw new Error("Could not save that email. Try again in a moment.");
}

export const joinLetter = createServerFn({ method: "POST" })
  .validator(cleanEmail)
  .handler(async ({ data: email }) => writeSubscriber(email, "in"));

export const leaveLetter = createServerFn({ method: "POST" })
  .validator(cleanEmail)
  .handler(async ({ data: email }) => writeSubscriber(email, "out"));
