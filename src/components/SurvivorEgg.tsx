import { useEffect, useRef, useState } from "react";

type Bug = { id: number; x: number; y: number };

export function SurvivorEgg() {
  const [open, setOpen] = useState(false);
  const clicks = useRef(0);
  const clickTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (event.key.length !== 1) return;
      const next = ((event.currentTarget as Window & { __egg?: string }).__egg ?? "") + event.key.toUpperCase();
      const buf = next.replace(/[^A-Z]/g, "").slice(-10);
      (event.currentTarget as Window & { __egg?: string }).__egg = buf;
      if (buf.endsWith("ONCEHUMAN")) setOpen(true);
    };
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest(".brand")) return;
      clicks.current += 1;
      window.clearTimeout(clickTimer.current);
      clickTimer.current = window.setTimeout(() => {
        clicks.current = 0;
      }, 2500);
      if (clicks.current >= 5) {
        event.preventDefault();
        event.stopPropagation();
        clicks.current = 0;
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick, true);
      window.clearTimeout(clickTimer.current);
    };
  }, []);

  if (!open) return null;
  return <Raid onClose={() => setOpen(false)} />;
}

function Raid({ onClose }: { onClose: () => void }) {
  const calm = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [bug, setBug] = useState<Bug | null>(calm ? null : { id: 1, x: 18, y: 62 });
  const [end, setEnd] = useState<"" | "out" | "down">(calm ? "out" : "");
  const id = useRef(1);

  useEffect(() => {
    if (calm || end) return;
    const timer = window.setTimeout(() => {
      setLives((left) => {
        const next = left - 1;
        if (next <= 0) setEnd("down");
        return next;
      });
      id.current += 1;
      setBug({ id: id.current, x: 8 + Math.random() * 78, y: 18 + Math.random() * 64 });
    }, 1300);
    return () => window.clearTimeout(timer);
  }, [bug, calm, end]);

  function hit() {
    const next = score + 1;
    setScore(next);
    if (next >= 8) {
      setEnd("out");
      setBug(null);
      return;
    }
    id.current += 1;
    setBug({ id: id.current, x: 8 + Math.random() * 78, y: 18 + Math.random() * 64 });
  }

  return (
    <div className="egg" role="dialog" aria-modal="true" aria-label="Survivor surprise">
      <div className="egg-card">
        <p className="kicker">Once Human</p>
        <h2>{end === "down" ? "The server got you" : end === "out" ? "You made it out" : "Something is in the camp"}</h2>
        <p className="lede">
          {calm
            ? "You found the survivors. The camp is quiet."
            : end === "down"
              ? "Three got through. The blade is still here."
              : end === "out"
                ? "Eight down. The camp holds."
                : "Tap them before they reach you."}
        </p>
        {!end && bug ? (
          <button type="button" className="egg-bug" style={{ left: `${bug.x}%`, top: `${bug.y}%` }} onClick={hit}>
            <span aria-hidden="true" />
            Tap
          </button>
        ) : null}
        <p className="note">{calm ? "Secret found." : `Cleared ${score} · lives ${Math.max(lives, 0)}`}</p>
        <button className="btn btn-ghost" type="button" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
