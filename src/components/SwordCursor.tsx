import { useEffect, useRef } from "react";

/**
 * Desktop sword pointer. The blade tip is the click hotspot (59, 2 in the 64px box).
 * A static PNG cursor is the no-JS / reduced-motion fallback; this overlay only
 * runs for a fine pointer so touch screens keep the normal browser behavior.
 */
const TIP_X = 59;
const TIP_Y = 2;

const BLADE =
  "M59 2 L57.58 4.74 L55.86 7.21 L54.08 9.64 L52.27 12.03 L50.44 14.41 L48.59 16.77 L46.73 19.11 L44.85 21.44 L42.95 23.77 L41.05 26.08 L39.13 28.38 L37.21 30.67 L35.27 32.96 L33.3 35.21 L31.27 37.42 L29.23 39.61 L25.57 36.39 L27.48 34.08 L29.4 31.79 L31.38 29.54 L33.39 27.33 L35.42 25.12 L37.45 22.92 L39.5 20.73 L41.55 18.56 L43.62 16.39 L45.71 14.23 L47.81 12.09 L49.93 9.97 L52.07 7.86 L54.24 5.79 L56.47 3.76 Z";
const FULLER =
  "M54.49 7.14 L52.23 9.71 L49.97 12.29 L47.71 14.86 L45.46 17.43 L43.2 20 L40.94 22.57 L38.69 25.14 L36.43 27.71 L34.17 30.29 L31.91 32.86";
const SPINE = "M56.2 4.6 L52.2 9.2 L47.7 14.5 L42.8 20.2 L37.6 26.2 L33.2 31.2";

function Bolt({ className, d, red = false }: { className: string; d: string; red?: boolean }) {
  return (
    <g className={className} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path
        d={d}
        stroke={red ? "#AC171D" : "#3DC8CF"}
        strokeWidth={red ? 1.75 : 2.05}
        opacity={red ? 0.85 : 0.55}
      />
      <path d={d} stroke={red ? "#F62F37" : "#68FAF7"} strokeWidth={red ? 0.6 : 0.72} />
    </g>
  );
}

function SwordCursorGraphic() {
  return (
    <svg className="lw-sword-svg" viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">
      <defs>
        <linearGradient
          id="lwcur-bevel"
          x1="59"
          y1="2"
          x2="25"
          y2="40"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#f4f7f8" />
          <stop offset="0.16" stopColor="#d5dee6" />
          <stop offset="0.42" stopColor="#6d7e8c" />
          <stop offset="0.7" stopColor="#1a232c" />
          <stop offset="1" stopColor="#05080c" />
        </linearGradient>
        <linearGradient
          id="lwcur-guard"
          x1="19"
          y1="32"
          x2="34"
          y2="46"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#e7eef2" />
          <stop offset="0.4" stopColor="#8ea0ae" />
          <stop offset="1" stopColor="#12181e" />
        </linearGradient>
        <radialGradient id="lwcur-iris" cx="36%" cy="34%" r="68%">
          <stop offset="0" stopColor="#F62F37" />
          <stop offset="0.45" stopColor="#AC171D" />
          <stop offset="1" stopColor="#5c0c12" />
        </radialGradient>
      </defs>

      <g fill="#05080c" opacity="0.5" transform="translate(0.65 0.8)">
        <path d={BLADE} />
        <path d="M19.58 32.66 L26.81 35.42 L30.04 38.25 L33.71 45.07 L27.52 40.97 L24.44 38.26 Z" />
        <path d="M27.13 40.89 L21.63 46.77 L19.45 44.86 L24.57 38.64 Z" />
        <ellipse cx="16.6" cy="50.7" rx="6.5" ry="4.7" />
      </g>

      <path
        className="aura"
        d={BLADE}
        fill="none"
        stroke="#3DC8CF"
        strokeWidth="1.7"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d={BLADE}
        fill="url(#lwcur-bevel)"
        stroke="#e7eef2"
        strokeWidth="0.6"
        strokeLinejoin="miter"
        strokeMiterlimit="8"
      />
      <path
        d="M59 2 L56.47 3.76 L54.24 5.79 L52.07 7.86 L49.93 9.97 L47.81 12.09"
        fill="none"
        stroke="#f4ffff"
        strokeWidth="0.55"
        strokeLinecap="round"
        opacity="0.9"
      />
      <path d={FULLER} fill="none" stroke="#AC171D" strokeWidth="1.05" strokeLinecap="round" />
      <path
        className="fuller-hot"
        d={FULLER}
        fill="none"
        stroke="#F62F37"
        strokeWidth="0.4"
        strokeLinecap="round"
      />

      <Bolt
        className="bolt b1"
        d="M57.08 4.14 L55.38 5.96 L54.33 8.35 L52.41 9.99 L50.72 11.82 L49.69 14.23"
      />
      <Bolt
        className="bolt br"
        red
        d="M49.86 10.55 L47.78 12.42 L45.45 14.08 L44.81 17.2 L41.42 17.93"
      />
      <path
        d="M45.45 14.08 L43.55 12.55 L42.9 14.7"
        className="bolt b2"
        fill="none"
        stroke="#68FAF7"
        strokeWidth="0.6"
        strokeLinecap="round"
      />
      <Bolt
        className="bolt b3"
        d="M45.84 21.04 L42.28 21.74 L41.74 25.09 L38.85 26.38 L38.48 29.88 L34.87 30.53"
      />
      <Bolt className="bolt br2" red d="M43.14 21.22 L41.02 23.82 L39.17 26.66 L35.94 28.28" />
      <path
        className="run"
        pathLength={100}
        d={SPINE}
        fill="none"
        stroke="#68FAF7"
        strokeWidth="0.85"
        strokeLinecap="round"
      />

      <path
        d="M19.58 32.66 L26.81 35.42 L30.04 38.25 L33.71 45.07 L27.52 40.97 L24.44 38.26 Z"
        fill="url(#lwcur-guard)"
        stroke="#e7eef2"
        strokeWidth="0.45"
        strokeLinejoin="round"
      />
      <path
        d="M21.1 33.6 L26.9 36.4 L32.2 43.3"
        fill="none"
        stroke="#68FAF7"
        strokeWidth="0.35"
        opacity="0.75"
      />
      <path
        d="M27.13 40.89 L21.63 46.77 L19.45 44.86 L24.57 38.64 Z"
        fill="#12181e"
        stroke="#c5d0d8"
        strokeWidth="0.45"
        strokeLinejoin="round"
      />
      <path d="M25.95 42.45 L23.17 40.01" fill="none" stroke="#3DC8CF" strokeWidth="0.5" />
      <path d="M24.44 44.18 L21.66 41.74" fill="none" stroke="#AC171D" strokeWidth="0.6" />
      <path d="M22.92 45.91 L20.14 43.47" fill="none" stroke="#d5dee6" strokeWidth="0.45" />

      <g transform="translate(16.15 51.15)">
        <g className="eye-bolts" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path
            stroke="#3DC8CF"
            strokeWidth="1.65"
            opacity="0.6"
            d="M-1.4 -1.35 L-4.15 -3.7 L-3.15 -1.05 L-6.7 -2.55"
          />
          <path
            stroke="#68FAF7"
            strokeWidth="0.7"
            d="M-1.4 -1.35 L-4.15 -3.7 L-3.15 -1.05 L-6.7 -2.55"
          />
          <path
            stroke="#3DC8CF"
            strokeWidth="1.4"
            opacity="0.55"
            d="M1.55 1.15 L4.05 3.25 L2.95 0.95 L5.85 2.25"
          />
          <path
            stroke="#68FAF7"
            strokeWidth="0.55"
            d="M1.55 1.15 L4.05 3.25 L2.95 0.95 L5.85 2.25"
          />
          <path stroke="#F62F37" strokeWidth="0.4" d="M0.3 -2.15 L1.7 -3.85 L2.55 -2.2" />
        </g>
        <ellipse rx="6.35" ry="4.45" fill="#0c1218" stroke="#d5dee6" strokeWidth="0.65" />
        <ellipse rx="6.35" ry="4.45" fill="none" stroke="#3DC8CF" strokeWidth="0.4" />
        <ellipse rx="4.95" ry="3.25" fill="#f6f3ec" />
        <path
          d="M-4.85 0.1 Q0 -3.15 4.85 0.1 Q1.6 -0.35 0 -0.05 Q-1.8 -0.35 -4.85 0.1"
          fill="#1a1012"
          opacity="0.22"
        />
        <circle className="iris-glow" r="2.55" fill="#F62F37" />
        <circle r="2.15" fill="url(#lwcur-iris)" />
        <circle r="0.92" fill="#05080C" />
        <circle cx="-0.55" cy="-0.58" r="0.36" fill="#f7fffe" />
        <circle cx="-0.2" cy="-0.26" r="0.13" fill="#68FAF7" />
      </g>
    </svg>
  );
}

function showsSword(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  const cursor = getComputedStyle(target).cursor;
  return cursor === "none" || cursor.includes("sword-mini-cursor");
}

export function SwordCursor() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const root = document.documentElement;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let shown = false;
    let lastTarget: EventTarget | null = null;

    const place = (x: number, y: number) => {
      node.style.transform = `translate3d(${x - TIP_X}px, ${y - TIP_Y}px, 0)`;
    };

    const setShown = (next: boolean) => {
      if (next === shown) return;
      shown = next;
      node.classList.toggle("is-on", next);
    };

    const hide = () => setShown(false);
    const eligible = () => fine.matches && !reduce.matches;

    const sync = () => {
      if (eligible()) return;
      root.classList.remove("lw-sword-cursor");
      hide();
    };

    const onMove = (event: Event) => {
      if (!eligible()) return;
      const pointer = event as PointerEvent;
      if (pointer.pointerType === "touch") return;
      root.classList.add("lw-sword-cursor");
      if (pointer.target !== lastTarget) {
        lastTarget = pointer.target;
        setShown(showsSword(pointer.target));
      }
      if (!shown) return;
      place(pointer.clientX, pointer.clientY);
    };

    const onLeave = (event: MouseEvent) => {
      if (event.relatedTarget) return;
      lastTarget = null;
      hide();
    };

    sync();
    fine.addEventListener("change", sync);
    reduce.addEventListener("change", sync);
    const moveName = "onpointerrawupdate" in window ? "pointerrawupdate" : "pointermove";
    window.addEventListener(moveName, onMove, { passive: true });
    document.documentElement.addEventListener("mouseout", onLeave);
    window.addEventListener("blur", hide);

    return () => {
      root.classList.remove("lw-sword-cursor");
      fine.removeEventListener("change", sync);
      reduce.removeEventListener("change", sync);
      window.removeEventListener(moveName, onMove);
      document.documentElement.removeEventListener("mouseout", onLeave);
      window.removeEventListener("blur", hide);
    };
  }, []);

  return (
    <div ref={ref} className="lw-sword-pointer" aria-hidden="true">
      <SwordCursorGraphic />
    </div>
  );
}
