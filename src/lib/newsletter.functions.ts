import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";

function cleanEmail(value: unknown) {
  const email = String(value ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 180) {
    throw new Error("Enter a real email.");
  }
  return email;
}

async function writeSubscriber(email: string, mode: "in" | "out") {
  const sql = await getSql();
  try {
    if (mode === "in") {
      await sql`insert into newsletter_subscriber (email) values (${email}) on conflict (email) do nothing`;
    } else {
      await sql`delete from newsletter_subscriber where email = ${email}`;
    }
  } catch (err) {
    console.error("[list] could not update newsletter_subscriber", err);
    throw new Error("Could not save that email. Try again in a moment.");
  }
  return { ok: true as const };
}

export const joinLetter = createServerFn({ method: "POST" })
  .validator(cleanEmail)
  .handler(async ({ data: email }) => writeSubscriber(email, "in"));

export const leaveLetter = createServerFn({ method: "POST" })
  .validator(cleanEmail)
  .handler(async ({ data: email }) => writeSubscriber(email, "out"));
