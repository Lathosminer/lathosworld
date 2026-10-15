import { useEffect, useRef } from "react";

// EyeGlow — v9/v10 (crossguard eye moved). Based on v8: synced eye effect (subtle-pop strength + slow clockwise pulse on both rings) over the hero mark (/mark.jpg, 1792x1008).
// Crossguard eye, O-eye and pommel gem share one 6 s loop: flame ring on the iris
// (white-gold -> orange -> deep red), eased blue -> red -> orange micro-flash cycle,
// and a thin cyan flicker on the blue outline. One rAF, cached sprites, mirror-symmetric licks.

// Positions in 1024x576 art units (same as the v6 render).
const EYES = [
  { x: 463.1, y: 167.9, r: 17 }, // crossguard eye (v9: re-centred on blade axis + lowered into socket)
  { x: 464, y: 345, r: 36 }, // O of WORLD
  { x: 464, y: 26, r: 7 },   // pommel gem
];
const LOOP = 6000; // ms, seamless
const PULSES: Array<[number, number, number]> = [ // [centre 0..1, half-width 0..1, strength]
  [0.1, 0.055, 0.9], [0.29, 0.045, 0.7], [0.46, 0.065, 1], [0.65, 0.05, 0.75], [0.83, 0.06, 0.9],
];
const HUE: Array<[number, number, number]> = [[64, 140, 255], [255, 31, 26], [255, 140, 20], [64, 140, 255]];
const LICKS = 48;
// two soft lobes (at 0 and 0.5 of a turn) with smooth falloff, for the clockwise pulse
const LOBE: Array<[number, number]> = [[0, 1], [0.06, 0.7], [0.14, 0.15], [0.25, 0], [0.36, 0.15], [0.44, 0.7], [0.5, 1], [0.56, 0.7], [0.64, 0.15], [0.75, 0], [0.86, 0.15], [0.94, 0.7], [1, 1]];

const ss = (t: number) => t * t * (3 - 2 * t);
function pulse(u: number) {
  let p = 0.2 + 0.06 * Math.sin(u * Math.PI * 2 * 6);
  for (const [c, w, k] of PULSES) {
    let d = Math.abs(u - c); d = Math.min(d, 1 - d);
    if (d < w) p = Math.max(p, k * 0.5 * (1 + Math.cos((Math.PI * d) / w)));
  }
  return p;
}
function hue(u: number): [number, number, number] {
  const h = ((u * 2) % 1) * 3, i = Math.floor(h), t = ss(h - i), a = HUE[i], b = HUE[i + 1];
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

// Pre-rendered flame ring sprite (radius 1 = 64px) — drawn scaled per eye, never rebuilt per frame.
function flameSprite(): HTMLCanvasElement {
  const S = 128, c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d")!, R = S / 2;
  const grad = g.createRadialGradient(R, R, R * 0.5, R, R, R * 0.82);
  grad.addColorStop(0, "rgba(255,190,90,0)");
  grad.addColorStop(0.12, "rgba(255,242,190,0.95)");
  grad.addColorStop(0.35, "rgba(255,200,80,0.85)");
  grad.addColorStop(0.62, "rgba(255,115,20,0.55)");
  grad.addColorStop(0.85, "rgba(190,20,8,0.25)");
  grad.addColorStop(1, "rgba(150,10,5,0)");
  g.fillStyle = grad; g.fillRect(0, 0, S, S);
  return c;
}

export default function EyeGlow() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d", { alpha: true }) as CanvasRenderingContext2D | null;
    if (!canvas || !ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const sprite = flameSprite();
    const hasConic = typeof ctx.createConicGradient === "function";
    const cosT = new Float32Array(LICKS), sinT = new Float32Array(LICKS), th = new Float32Array(LICKS);
    for (let i = 0; i < LICKS; i++) {
      const a = (i / LICKS) * Math.PI * 2; cosT[i] = Math.cos(a); sinT[i] = Math.sin(a);
      th[i] = Math.atan2(sinT[i], Math.abs(cosT[i])); // mirror-symmetric angle (left = right)
    }
    let w = 1, h = 1, sc = 1, ox = 0, oy = 0, raf = 0, alive = true, visible = true;

    const fit = () => {
      const box = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(1, box.width); h = Math.max(1, box.height);
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // object-fit: contain mapping of the 1024x576 art into the canvas box
      sc = Math.min(w / 1024, h / 576); ox = (w - 1024 * sc) / 2; oy = (h - 576 * sc) / 2;
    };

    const draw = (now: number) => {
      const u = reduce ? 0.38 : (now % LOOP) / LOOP, ph = u * Math.PI * 2;
      const p = reduce ? 0.6 : pulse(u), [cr, cg, cb] = hue(u);
      const fl = 0.86 + 0.14 * Math.sin(ph * 7) * Math.sin(ph * 11 + 1);
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      for (const e of EYES) {
        const x = ox + e.x * sc, y = oy + e.y * sc, r = e.r * sc;
        // 1) iris flame ring: cached sprite, breathing with the flicker
        const k = r * (0.97 + 0.05 * fl);
        ctx.globalAlpha = 0.95 * fl;
        ctx.drawImage(sprite, x - k, y - k, k * 2, k * 2);
        // 2) mirror-symmetric licks on the iris flame edge + thin cyan licks on the blue outline
        const flame: number[] = [], outl: number[] = [];
        for (let i = 0; i < LICKS; i++) {
          const t = th[i];
          const n = Math.sin(t * 7 + ph * 3) * 0.5 + Math.sin(t * 13 - ph * 5) * 0.3 + Math.sin(t * 23 + ph * 9) * 0.2;
          const lk = Math.max(0, Math.sin(t * 31 - ph * 11) * Math.sin(t * 5 + ph * 2)) ** 3;
          flame.push(0.6 + (0.1 + 0.04 * n + 0.1 * lk) * fl);
          outl.push(0.92 + (0.03 + 0.012 * n + 0.05 * lk) * fl);
        }
        const poly = (rad: number[]) => {
          ctx.beginPath();
          for (let i = 0; i <= LICKS; i++) {
            const j = i % LICKS, q = rad[j] * r;
            i ? ctx.lineTo(x + cosT[j] * q, y + sinT[j] * q) : ctx.moveTo(x + cosT[j] * q, y + sinT[j] * q);
          }
        };
        ctx.lineJoin = "round";
        poly(flame);
        ctx.globalAlpha = 0.47 * fl; ctx.lineWidth = Math.max(1, r * 0.09);
        ctx.strokeStyle = `rgb(${255 - 0.35 * p * (255 - cr)},${150 * (1 - 0.35 * p) + 0.35 * p * cg},${60 * (1 - 0.35 * p) + 0.35 * p * cb})`;
        ctx.stroke();
        poly(outl);
        ctx.globalAlpha = (0.6 + 0.3 * p) * fl; ctx.lineWidth = Math.max(0.6, r * 0.035);
        ctx.strokeStyle = "rgb(150,235,255)"; ctx.stroke();
        ctx.globalAlpha = 0.24 * fl; ctx.lineWidth = Math.max(1.5, r * 0.14);
        ctx.strokeStyle = "rgb(40,140,255)"; ctx.stroke();
        // 4) v8: two soft bright lobes travelling CLOCKWISE (one full turn per 6 s loop), +~30%
        if (hasConic) {
          const cw = (rgb: string) => {
            const g2 = ctx.createConicGradient(ph, x, y); // canvas y is down: increasing angle = clockwise
            for (const [o, al] of LOBE) g2.addColorStop(o, `rgba(${rgb},${al})`);
            return g2;
          };
          poly(flame);
          ctx.globalAlpha = 0.3 * fl; ctx.lineWidth = Math.max(1.5, r * 0.12);
          ctx.strokeStyle = cw("255,200,110"); ctx.stroke();
          poly(outl);
          ctx.globalAlpha = 0.32 * fl; ctx.lineWidth = Math.max(0.6, r * 0.035);
          ctx.strokeStyle = cw("170,240,255"); ctx.stroke();
        }
        // 3) eased micro-flash tint inside the iris (keeps clear of the blue outline)
        const g = ctx.createRadialGradient(x, y, 0, x, y, r * 0.8);
        g.addColorStop(0, `rgba(${cr | 0},${cg | 0},${cb | 0},${0.62 * p})`);
        g.addColorStop(0.75, `rgba(${cr | 0},${cg | 0},${cb | 0},${0.45 * p})`);
        g.addColorStop(1, `rgba(${cr | 0},${cg | 0},${cb | 0},0)`);
        ctx.globalAlpha = 1; ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    };

    const loop = (now: number) => { if (!alive) return; draw(now); raf = requestAnimationFrame(loop); };
    const start = () => {
      cancelAnimationFrame(raf);
      if (reduce) { draw(0); return; }
      if (alive && visible && !document.hidden) raf = requestAnimationFrame(loop);
    };
    fit(); start();
    const onVis = () => (document.hidden ? cancelAnimationFrame(raf) : start());
    document.addEventListener("visibilitychange", onVis);
    const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; visible ? start() : cancelAnimationFrame(raf); });
    io.observe(canvas);
    const ro = new ResizeObserver(() => { fit(); if (reduce) draw(0); });
    ro.observe(canvas);
    return () => {
      alive = false; cancelAnimationFrame(raf);
      ro.disconnect(); io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);
  return <canvas ref={ref} className="storm eyes" width={1792} height={1008} aria-hidden="true" />;
}
