import { useEffect, useRef } from "react";

// EmblemArc: live lightning fitted to /lathosworld-emblem-v9.gif (600x600, normalized coords).
// Cyan rides the sword and LATHOS', red rides WORLD and the eye. Subtle, additive, pauses offscreen.

type Pt = { x: number; y: number };
type Path = { pts: Pt[]; red: boolean };

const line = (x1: number, y1: number, x2: number, y2: number): Pt[] => [{ x: x1, y: y1 }, { x: x2, y: y2 }];
const ring = (cx: number, cy: number, r: number): Pt[] =>
  Array.from({ length: 25 }, (_, i) => ({ x: cx + Math.cos((i / 24) * Math.PI * 2) * r, y: cy + Math.sin((i / 24) * Math.PI * 2) * r }));

const PATHS: Path[] = [
  { pts: line(0.385, 0.33, 0.395, 0.9), red: false }, // blade left edge
  { pts: line(0.418, 0.33, 0.405, 0.9), red: false }, // blade right edge
  { pts: [{ x: 0.31, y: 0.29 }, { x: 0.36, y: 0.32 }, { x: 0.4, y: 0.335 }, { x: 0.44, y: 0.32 }, { x: 0.5, y: 0.29 }], red: false }, // crossguard
  { pts: line(0.40, 0.11, 0.40, 0.27), red: false }, // grip
  { pts: line(0.07, 0.375, 0.93, 0.375), red: false }, // LATHOS' top
  { pts: line(0.07, 0.485, 0.93, 0.485), red: false }, // LATHOS' bottom
  { pts: line(0.17, 0.525, 0.83, 0.525), red: true }, // WORLD top
  { pts: line(0.17, 0.66, 0.83, 0.66), red: true }, // WORLD bottom
  { pts: ring(0.4, 0.607, 0.062), red: true }, // the eye
];

const PAL = {
  cyan: { glow: "rgba(95,243,240,0.6)", core: "rgba(244,255,255,0.9)" },
  red: { glow: "rgba(255,60,60,0.65)", core: "rgba(255,236,226,0.9)" },
};

function jag(a: Pt, b: Pt, d: number, out: Pt[]) {
  if (d < 2) { out.push(b); return; }
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1, off = (Math.random() - 0.5) * d;
  const m = { x: (a.x + b.x) / 2 - (dy / len) * off, y: (a.y + b.y) / 2 + (dx / len) * off };
  jag(a, m, d * 0.55, out); jag(m, b, d * 0.55, out);
}

// Point at fraction t along a polyline (pixels).
function along(pts: Pt[], t: number): Pt {
  const segs = pts.slice(1).map((p, i) => Math.hypot(p.x - pts[i].x, p.y - pts[i].y));
  let want = t * segs.reduce((s, v) => s + v, 0);
  for (let i = 0; i < segs.length; i++) {
    if (want <= segs[i] || i === segs.length - 1) {
      const k = segs[i] ? Math.min(1, want / segs[i]) : 0;
      return { x: pts[i].x + (pts[i + 1].x - pts[i].x) * k, y: pts[i].y + (pts[i + 1].y - pts[i].y) * k };
    }
    want -= segs[i];
  }
  return pts[pts.length - 1];
}

type Bolt = { red: boolean; pts: Pt[]; born: number; life: number };

export default function EmblemArc() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const mobile = window.matchMedia("(max-width: 700px)").matches;
    let w = 1, raf = 0, visible = false, bolts: Bolt[] = [], next = 0;

    const fit = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
      w = Math.max(1, canvas.getBoundingClientRect().width);
      canvas.width = canvas.height = Math.round(w * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();

    const spawn = (now: number) => {
      const p = PATHS[Math.floor(Math.random() * PATHS.length)];
      const px = p.pts.map((q) => ({ x: q.x * w, y: q.y * w }));
      const t0 = Math.random() * 0.6, t1 = Math.min(1, t0 + 0.2 + Math.random() * 0.4);
      const n = 4, base: Pt[] = [];
      for (let i = 0; i <= n; i++) base.push(along(px, t0 + ((t1 - t0) * i) / n));
      const out: Pt[] = [base[0]];
      for (let i = 1; i < base.length; i++) jag(base[i - 1], base[i], w * 0.035, out);
      bolts.push({ red: p.red, pts: out, born: now, life: 220 + Math.random() * 220 });
    };

    const stroke = (pts: Pt[], width: number, color: string) => {
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
      for (const q of pts) ctx.lineTo(q.x, q.y);
      ctx.lineWidth = width; ctx.strokeStyle = color; ctx.stroke();
    };

    const frame = (now: number) => {
      raf = 0;
      if (!visible) return;
      if (now > next) {
        spawn(now);
        if (Math.random() < 0.35) spawn(now);
        next = now + (mobile ? 450 : 250) + Math.random() * 500;
      }
      ctx.clearRect(0, 0, w, w);
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = ctx.lineJoin = "round";
      bolts = bolts.filter((b) => now - b.born < b.life);
      for (const b of bolts) {
        const k = 1 - (now - b.born) / b.life;
        const pal = b.red ? PAL.red : PAL.cyan;
        ctx.globalAlpha = k * (Math.random() < 0.15 ? 0.4 : 1);
        stroke(b.pts, w * 0.022, pal.glow);
        stroke(b.pts, w * 0.009, pal.glow);
        stroke(b.pts, w * 0.004, pal.core);
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    };

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(frame);
    });
    io.observe(canvas);
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);
    return () => { io.disconnect(); ro.disconnect(); if (raf) cancelAnimationFrame(raf); };
  }, []);
  return <canvas ref={ref} className="emblem-arc" aria-hidden="true" />;
}
