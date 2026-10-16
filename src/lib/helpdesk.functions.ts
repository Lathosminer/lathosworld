import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { DESK_EMAIL, DESK_FACTS, DESK_LABEL } from "@/lib/helpdesk";

const FALLBACK = `${DESK_LABEL} has the note. A person reads ${DESK_EMAIL}. This is not financial advice, and it is not a promise of price.`;

type HelpInput = { name: string; email: string; message: string; company: string };

function cleanHelp(value: unknown): HelpInput {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const name = String(raw.name ?? "").replace(/[\u0000-\u001f]/g, "").trim().replace(/\s+/g, " ");
  const email = String(raw.email ?? "").trim().toLowerCase();
  const message = String(raw.message ?? "").replace(/[\u0000-\u001f]/g, " ").trim();
  const company = String(raw.company ?? "").trim();
  if (name.length < 1 || name.length > 80) throw new Error("Enter your name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 180) throw new Error("Enter a real email.");
  if (message.length < 8 || message.length > 2000) throw new Error("Write a short note, at least a sentence.");
  return { name, email, message, company };
}

async function automaticAnswer(message: string) {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return FALLBACK;
  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(20000),
      body: JSON.stringify({
        model: "grok-4.5",
        max_tokens: 220,
        temperature: 0.2,
        messages: [
          { role: "system", content: DESK_FACTS },
          { role: "user", content: message },
        ],
      }),
    });
    if (!res.ok) return FALLBACK;
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = body.choices?.[0]?.message?.content?.trim() ?? "";
    return text.slice(0, 1200) || FALLBACK;
  } catch {
    return FALLBACK;
  }
}

async function mailDesk(input: HelpInput, answer: string) {
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
        _subject: DESK_LABEL,
        _template: "table",
        _captcha: "false",
        _replyto: input.email,
        desk: DESK_LABEL,
        name: input.name,
        email: input.email,
        message: input.message,
        automatic_reply: answer,
      }),
    });
    const body = (await res.json().catch(() => ({}))) as { success?: string | boolean; message?: string };
    const note = String(body.message ?? "");
    if (body.success === true || body.success === "true") return "sent" as const;
    if (/activat/i.test(note)) return "confirm" as const;
    if (/rate|later|busy/i.test(note)) return "busy" as const;
    return "missed" as const;
  } catch {
    return "missed" as const;
  }
}

export const askDesk = createServerFn({ method: "POST" })
  .validator(cleanHelp)
  .handler(async ({ data }) => {
    if (data.company) {
      return { ok: true as const, answer: FALLBACK, mail: "sent" as const };
    }
    // The database is optional: on the Cloudflare Worker it may be unavailable (no DATABASE_URL).
    // The note still reaches the inbox by mail, so never block the visitor on it.
    let sql: Awaited<ReturnType<typeof getSql>> | null = null;
    try {
      sql = await getSql();
      const recent = await sql<{ n: number }>`
        select count(*)::int as n from help_ticket
        where email = ${data.email} and created_at > now() - interval '2 minutes'
      `;
      if ((recent[0]?.n ?? 0) >= 3) throw new Error("RATE");
    } catch (err) {
      if (err instanceof Error && err.message === "RATE") throw new Error("Wait a couple of minutes, then send again.");
      console.error("[desk] database unavailable, mailing only", err);
      sql = null;
    }
    const answer = await automaticAnswer(data.message);
    if (sql) {
      try {
        await sql`
          insert into help_ticket (name, email, message, answer)
          values (${data.name}, ${data.email}, ${data.message}, ${answer})
        `;
      } catch (err) {
        console.error("[desk] could not save ticket", err);
      }
    }
    const mail = await mailDesk(data, answer);
    return { ok: true as const, answer, mail };
  });
