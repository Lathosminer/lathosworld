import { useEffect, useRef } from "react";

// LiveArc (v10: red starts from the WORLD centre) — Star Wars Force lightning walking the letter bones in /bones.json.
// Cyan on LATHOS (teal nodes), red on WORLD (world nodes). Drop-in for the old LiveArc.
// Perf: no shadowBlur, no getImageData, geometry rebuilt only every REGEN_MS, adaptive quality.

type Pt = { x: number; y: number };
type Node = { x: number; y: number; teal: boolean; world: boolean };
type Seg = { pts: Pt[]; w: number; sword: number }; // sword: 0..1 overlap with sword zone
type Charge = { red: boolean; from: number; to: number; t: number; trail: number[]; segs: Seg[] };

// Sword (the T) zone in mark.jpg, normalized. Glow is tightened inside this strip so the
// hilt, crossguard, red eye gems and blade engraving stay readable behind the bolts.
const SWORD = { cx: 0.458, half: 0.035, falloff: 0.03 };
const REGEN_MS = 45;
const PAL = {
  cyan: { haze: "#1a6cff", glow: "#5ff3f0", core: "#f4ffff" },
  red: { haze: "#8a0012", glow: "#ff2a2a", core: "#fff0ea" },
};

function displace(a: Pt, b: Pt, disp: number, out: Pt[]) {
  if (disp < 1.8) { out.push(b); return; }
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
  const off = (Math.random() - 0.5) * disp;
  const m = { x: (a.x + b.x) / 2 - (dy / len) * off, y: (a.y + b.y) / 2 + (dx / len) * off };
  displace(a, m, disp * 0.55, out);
  displace(m, b, disp * 0.55, out);
}

export default function LiveArc() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (typeof window === "undefined") return; // SSR safe (TanStack Start)
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d", { alpha: true, desynchronized: true }) as CanvasRenderingContext2D | null;
    if (!canvas || !ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = window.matchMedia("(max-width: 700px)").matches;
    const maxCharges = mobile ? 3 : 7;

    let nodes: Node[] = [];
    let adj: number[][] = [];
    let charges: Charge[] = [];
    let raf = 0, alive = true, visible = true;
    let lastRegen = 0, lastNow = 0, surgeUntil = 0, nextSurge = performance.now() + 2500;
    let w = 1, h = 1;
    // adaptive quality: 2 = full (3 passes + branches), 1 = 2 passes fewer branches, 0 = core+glow only
    let quality = mobile ? 1 : 2, slow = 0, fast = 0;

    const fit = () => {
      const box = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
      w = Math.max(1, box.width); h = Math.max(1, box.height);
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (const c of charges) c.segs.length = 0;
    };
    fit();

    const swordAmt = (x: number) => {
      const d = Math.abs(x / w - SWORD.cx) - SWORD.half;
      return d <= 0 ? 1 : d >= SWORD.falloff ? 0 : 1 - d / SWORD.falloff;
    };
    const P = (i: number): Pt => ({ x: nodes[i].x * w, y: nodes[i].y * h });

    const bolt = (path: Pt[], depth: number, scale: number, out: Seg[]) => {
      const pts: Pt[] = [path[0]];
      for (let i = 1; i < path.length; i++) {
        const len = Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
        displace(path[i - 1], path[i], Math.min(26, len * 0.3 + 3) * scale, pts);
      }
      let s = 0;
      for (const p of pts) s = Math.max(s, swordAmt(p.x));
      out.push({ pts, w: depth ? 0.7 : 1.4, sword: s });
      if (depth > (quality === 2 ? 1 : 0) || quality === 0) return;
      const chance = depth ? 0.04 : quality === 2 ? 0.09 : 0.05;
      for (let i = 2; i < pts.length - 1; i++) {
        if (Math.random() > chance) continue;
        const p = pts[i], q = pts[i - 1];
        if (swordAmt(p.x) > 0.5) continue; // no forks sprouting over the blade
        const ang = Math.atan2(p.y - q.y, p.x - q.x) + (Math.random() - 0.5) * 1.8;
        const l = (10 + Math.random() * 34) * scale;
        bolt([p, { x: p.x + Math.cos(ang) * l, y: p.y + Math.sin(ang) * l }], depth + 1, scale * 0.7, out);
      }
    };

    // v10 lock: red charges start from the centre of the red WORLD letters (nearest ~30% of WORLD nodes
    // to the WORLD centroid), then walk outward along the bones. Cyan still starts anywhere on the teal LATHOS strokes.
    let redCore: number[] = [];
    const pool = (red: boolean) => {
      if (red && redCore.length) return redCore;
      const ids: number[] = [];
      nodes.forEach((n, i) => { if ((red ? n.world : n.teal && !n.world) && adj[i].length) ids.push(i); });
      return ids;
    };
    const spawn = (red: boolean, into?: Charge): Charge | null => {
      const ids = pool(red);
      if (!ids.length) return null;
      const from = ids[(Math.random() * ids.length) | 0];
      const to = adj[from][(Math.random() * adj[from].length) | 0];
      const c = into ?? { red, from, to, t: 0, trail: [], segs: [] };
      c.from = from; c.to = to; c.t = Math.random(); c.trail.length = 0; c.trail.push(from);
      return c;
    };
    const step = (c: Charge, dt: number) => {
      c.t += dt * (4 + Math.random() * 3);
      while (c.t >= 1) {
        c.t -= 1;
        c.trail.push(c.to);
        if (c.trail.length > 6) c.trail.shift();
        const prev = c.from;
        c.from = c.to;
        const opts = adj[c.from].filter((n) => n !== prev && nodes[n].world === c.red);
        if (!opts.length || Math.random() < 0.04) { spawn(c.red, c); return; }
        c.to = opts[(Math.random() * opts.length) | 0];
      }
    };
    const build = (c: Charge, scale: number) => {
      const a = P(c.from), b = P(c.to);
      const path = c.trail.map(P);
      path.push({ x: a.x + (b.x - a.x) * c.t, y: a.y + (b.y - a.y) * c.t });
      c.segs.length = 0;
      bolt(path, 0, scale, c.segs);
    };

    const line = (pts: Pt[], width: number, color: string, alpha: number) => {
      if (alpha <= 0.01) return;
      ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = width;
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
    };

    const draw = (now: number, still = false) => {
      // afterglow: fade the previous frame instead of a hard clear (hard clear for static frame)
      ctx.globalCompositeOperation = "destination-out";
      ctx.globalAlpha = still ? 1 : 0.4;
      ctx.fillRect(0, 0, w, h);
      if (!nodes.length) return;
      ctx.globalCompositeOperation = "lighter"; // additive: sword art reads through the bolts
      ctx.lineCap = "round"; ctx.lineJoin = "round";

      if (!still && now > nextSurge) { surgeUntil = now + 260; nextSurge = now + 3500 + Math.random() * 5000; }
      const surge = now < surgeUntil;
      const dt = lastNow ? Math.min(0.05, (now - lastNow) / 1000) : 0.016;
      lastNow = now;
      const regen = still || now - lastRegen > REGEN_MS;
      if (regen) lastRegen = now;

      for (const c of charges) {
        if (!still) step(c, dt * (surge ? 1.8 : 1));
        if (regen || !c.segs.length) build(c, surge ? 1.5 : 1);
        const pal = c.red ? PAL.red : PAL.cyan;
        const strobe = still ? 1 : Math.random() < 0.15 ? 0.3 : surge ? 1.2 : 0.85 + Math.random() * 0.15;
        for (const s of c.segs) {
          const keep = 1 - s.sword * 0.85; // haze/glow nearly off over the sword
          if (quality === 2) line(s.pts, s.w * (7 - s.sword * 4), pal.haze, 0.12 * strobe * keep);
          line(s.pts, s.w * (3 - s.sword * 1.4), pal.glow, 0.5 * strobe * (1 - s.sword * 0.5));
          line(s.pts, s.w * 0.85, pal.core, Math.min(1, 0.95 * strobe));
        }
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    };

    const loop = (now: number) => {
      if (!alive) return;
      const ft = lastNow ? now - lastNow : 16;
      if (ft > 20) { fast = 0; if (++slow > 8 && quality > 0) { quality--; slow = 0; } }
      else if (ft < 14) { slow = 0; if (++fast > 240 && quality < (mobile ? 1 : 2)) { quality++; fast = 0; } }
      draw(now);
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      cancelAnimationFrame(raf);
      lastNow = 0;
      if (!reduce && alive && visible && !document.hidden && nodes.length) raf = requestAnimationFrame(loop);
    };
    const onVis = () => (document.hidden ? cancelAnimationFrame(raf) : start());
    document.addEventListener("visibilitychange", onVis);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? start() : cancelAnimationFrame(raf); });
    io.observe(canvas);
    const ro = new ResizeObserver(() => { fit(); if (reduce) draw(performance.now(), true); });
    ro.observe(canvas);

    fetch("/bones.json")
      .then((r) => r.json())
      .then((mesh: { nodes: Array<{ x: number; y: number; teal: boolean; world?: boolean }>; ribs: number[][] }) => {
        if (!alive) return;
        nodes = mesh.nodes.map((n) => ({ x: n.x, y: n.y, teal: !!n.teal, world: !!n.world }));
        adj = nodes.map(() => [] as number[]);
        for (const [a, b] of mesh.ribs) if (nodes[a] && nodes[b]) { adj[a].push(b); adj[b].push(a); }
        const world = nodes.map((n, i) => i).filter((i) => nodes[i].world && adj[i].length);
        if (world.length) {
          const cx = world.reduce((a, i) => a + nodes[i].x, 0) / world.length;
          const cy = world.reduce((a, i) => a + nodes[i].y, 0) / world.length;
          const d = (i: number) => Math.hypot(nodes[i].x - cx, nodes[i].y - cy);
          redCore = world.slice().sort((a, b) => d(a) - d(b)).slice(0, Math.max(3, Math.round(world.length * 0.3)));
        }
        const redCount = Math.max(1, Math.round(maxCharges * 0.4));
        charges = [];
        for (let i = 0; i < maxCharges; i++) { const c = spawn(i < redCount); if (c) charges.push(c); }
        if (reduce) draw(performance.now(), true); else start();
      })
      .catch(() => {});

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect(); io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);
  return <canvas ref={ref} className="storm arc" width={1792} height={1008} aria-hidden="true" />;
}
