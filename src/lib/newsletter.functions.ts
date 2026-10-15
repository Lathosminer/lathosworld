import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";

function cleanEmail(value: unknown) {
  const email = String(value ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 180) {
    throw new Error("Enter a real email.");
  }
  return email;
}

export const joinLetter = createServerFn({ method: "POST" })
  .validator(cleanEmail)
  .handler(async ({ data: email }) => {
    const sql = await getSql();
    await sql`insert into newsletter_subscriber (email) values (${email}) on conflict (email) do nothing`;
    return { ok: true as const };
  });

export const leaveLetter = createServerFn({ method: "POST" })
  .validator(cleanEmail)
  .handler(async ({ data: email }) => {
    const sql = await getSql();
    await sql`delete from newsletter_subscriber where email = ${email}`;
    return { ok: true as const };
  });
