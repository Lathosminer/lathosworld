/** Name shown in the header badge: display name, else the email's local part, else "Fan". */
export function badgeName(displayName: string | null | undefined, email: string | null | undefined): string {
  const clean = (value: unknown) =>
    [...String(value ?? "")]
      .filter((char) => {
        const code = char.codePointAt(0) ?? 0;
        return code >= 32 && code !== 127;
      })
      .join("")
      .replace(/\s+/g, " ")
      .trim();
  const name = clean(displayName);
  if (name && !/\S+@\S+\.\S+/.test(name)) return name.slice(0, 40);
  const local = clean(email).split("@")[0] ?? "";
  return local.slice(0, 40) || "Fan";
}
