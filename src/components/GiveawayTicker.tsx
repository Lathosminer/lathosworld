import { useEffect, useState } from "react";
import { TICKER_REFRESH_MS, TICKER_SUFFIX } from "@/lib/giveaway";
import { getTickerPreview } from "@/lib/giveaway.functions";

/**
 * News-ticker marquee of recent entrants. Loops continuously, pauses on hover
 * or focus, and sits still for prefers-reduced-motion (CSS). Names come from
 * the cached public /api/giveaway/ticker endpoint; the owner's hidden-page
 * preview reads the same list through an admin-only server function.
 */
export function GiveawayTicker({ preview }: { preview: boolean }) {
  const [names, setNames] = useState<string[]>([]);

  useEffect(() => {
    let live = true;
    async function load() {
      try {
        let next: string[];
        if (preview) {
          next = await getTickerPreview();
        } else {
          const res = await fetch("/api/giveaway/ticker");
          const body = (await res.json()) as { names?: unknown };
          next = Array.isArray(body.names) ? body.names.filter((n): n is string => typeof n === "string") : [];
        }
        if (live) setNames(next);
      } catch {
        /* keep the last list */
      }
    }
    void load();
    const timer = window.setInterval(load, TICKER_REFRESH_MS);
    return () => {
      live = false;
      window.clearInterval(timer);
    };
  }, [preview]);

  if (names.length === 0) return null;
  // Repeat short lists so the strip is always wider than the screen.
  const items: string[] = [];
  while (items.length < 8) items.push(...names);
  const seconds = Math.max(25, items.length * 6);

  const row = (hidden: boolean) => (
    <ul className="gw-ticker-row" aria-hidden={hidden || undefined}>
      {items.map((name, index) => (
        <li key={`${hidden ? "b" : "a"}-${index}`}>
          <span className="gw-ticker-eye" aria-hidden="true">👁️</span>
          <strong>{name}</strong> {TICKER_SUFFIX}
        </li>
      ))}
    </ul>
  );

  return (
    <div className="gw-ticker" role="region" aria-label="Recent entrants" tabIndex={0}>
      <div className="gw-ticker-track" style={{ animationDuration: `${seconds}s` }}>
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
