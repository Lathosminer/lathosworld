# LathosWorld — code for GB to analyze

Analyze this as the current LathosWorld site. Do not redesign it. Do not add a personal bio, rules, a shop, or extra coin copy. Keep the locked logo, the lightning, the sword dividers, and the contract.

## What this is
- Site: LathosWorld / $LWRLD on Flap, BNB Smart Chain.
- Contract: `0x3899ebf76c768c156df3073031a4518c5f947777` (ends in 7777).
- Buy and sell tax: 4%. Split: 85% liquidity, 10% fund, 5% burn. Supply: 1,000,000,000.
- Audience line: Intended for certain audiences only. Not financial advice.
- Stack: TanStack Start, React, one home route.

## Locked art
- Hero image: `/mark.jpg` (1792x1008). The sword is the T in LATHOS. Do not redraw the wordmark.
- The logo is brightened in CSS on `.wordmark`: brightness 1.28, contrast 1.12, saturate 1.15.
- Lightning is a canvas named LiveArc, drawn over the logo and walked along the letter bones in `/bones.json`.
- Cyan lightning walks the teal LATHOS strokes. Red lightning walks WORLD the same way, from the center of the red letters.
- Divider swords are `/sword.png`, shown at 4.6rem. The pointer is `/sword-cursor.png` (64x64, hotspot 32,2).
- A phone-safe loop is `/lathosworld.gif` and `/lathosworld.mp4`. The page plays the mp4 under the logo.

## Do not change
- The contract address, the tax numbers, or the Flap and BscScan links.
- The logo file.
- Lightning colors: cyan on LATHOS, red on WORLD.
- The copy already on the page.

## bones.json
Ship `/public/bones.json` as-is. Shape: nodes with x, y, teal, world, and ribs as pairs of node indexes. It is not pasted below because it is one long line.

---

# src/routes/index.tsx

```tsx
import { useEffect, useRef, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/")({ component: Home });

const CA = "0x3899ebf76c768c156df3073031a4518c5f947777";
const FLAP = `https://flap.sh/bnb/${CA}`;
const SCAN = `https://bscscan.com/token/${CA}`;
const PAPER = "https://github.com/Lathosminer/LWRLD";

const FACTS = [
  { label: "Ticker", value: "$LWRLD" },
  { label: "Name", value: "LathosWorld" },
  { label: "Chain", value: "BNB Smart Chain" },
  { label: "Launch", value: "Flap.sh tax token" },
  { label: "Supply", value: "1,000,000,000" },
  { label: "Buy tax", value: "4%" },
  { label: "Sell tax", value: "4%" },
  { label: "Tax split", value: "85% liquidity · 10% fund · 5% burn" },
] as const;

const DOORS = [
  { name: "Flap", handle: "Open $LWRLD", href: FLAP, hint: "Trade", icon: "flap" },
  { name: "BscScan", handle: "Contract", href: SCAN, hint: "Verify", icon: "scan" },
  { name: "Paper", handle: "v1.6", href: PAPER, hint: "Read", icon: "paper" },
  { name: "Telegram", handle: "Official updates", href: "https://t.me/LathosWorldOfficial", hint: "Updates", icon: "telegram" },
  { name: "Twitch", handle: "lathosworld", href: "https://www.twitch.tv/lathosworld", hint: "Live", icon: "twitch" },
  { name: "YouTube", handle: "@lathos563", href: "https://www.youtube.com/@lathos563", hint: "Watch", icon: "youtube" },
  { name: "X", handle: "@lathos563", href: "https://x.com/lathos563", hint: "Talk", icon: "x" },
  { name: "Discord", handle: "The lobby", href: "https://discord.gg/749tHdsFU6", hint: "Join", icon: "discord" },
] as const;

type Pt = { x: number; y: number };

function heart(ms: number) {
  const p = (ms % 2600) / 2600;
  const lub = Math.exp(-((p - 0.1) ** 2) / 0.0014);
  const dub = 0.55 * Math.exp(-((p - 0.24) ** 2) / 0.002);
  return Math.min(1, lub + dub);
}

function hash(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function linePts(ctx: CanvasRenderingContext2D, pts: Pt[]) {
  if (pts.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();
}

function jag(x1: number, y1: number, x2: number, y2: number, sway: number, seed: number): Pt[] {
  const pts: Pt[] = [{ x: x1, y: y1 }];
  const steps = 6;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const kick = (hash(seed + i * 13) - 0.5) * 2 * sway;
    pts.push({ x: x1 + dx * t + (-dy / len) * kick, y: y1 + dy * t + (dx / len) * kick });
  }
  pts.push({ x: x2, y: y2 });
  return pts;
}

function forceLightning(ctx: CanvasRenderingContext2D, pts: Pt[], alpha: number, red = false) {
  if (pts.length < 2 || alpha <= 0.02) return;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = alpha * 0.38;
  ctx.strokeStyle = red ? "#ff1c14" : "#14c8e8";
  ctx.lineWidth = 4.2;
  linePts(ctx, pts);
  ctx.globalAlpha = alpha * 0.75;
  ctx.strokeStyle = red ? "#ff5a32" : "#8af0ff";
  ctx.lineWidth = 1.6;
  linePts(ctx, pts);
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = red ? "#ffe8dc" : "#f7fbff";
  ctx.lineWidth = 0.65;
  linePts(ctx, pts);
  const end = pts[pts.length - 1];
  const glow = ctx.createRadialGradient(end.x, end.y, 0, end.x, end.y, 10);
  glow.addColorStop(0, `rgba(255, 248, 244, ${0.85 * alpha})`);
  glow.addColorStop(0.45, red ? `rgba(255, 70, 30, ${0.5 * alpha})` : `rgba(80, 220, 255, ${0.5 * alpha})`);
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.globalAlpha = 1;
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(end.x, end.y, 10, 0, Math.PI * 2);
  ctx.fill();
}

function LiveArc() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let alive = true;
    let raf = 0;
    type Bone = { x: number; y: number; z: number; teal: boolean; world: boolean };
    type Rib = { a: number; b: number };
    let bones: Bone[] = [];
    let ribs: Rib[] = [];
    let next: number[][] = [];
    let frontEdges = 0;
    let lastNow = 0;
    const charges: Array<{ edge: number; from: number; t: number; red: boolean; seed: number }> = [];
    const leaps: Array<{ target: number; t: number; red: boolean; seed: number }> = [];
    const irisBone = { x: 0.455, y: 0.454, z: 0.05, teal: true, world: false };
    let mask: HTMLCanvasElement | null = null;
    const fit = () => {
      const box = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(box.width * dpr));
      canvas.height = Math.max(1, Math.round(box.height * dpr));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);
    const art = new Image();
    art.src = "/mark.jpg?v=locked";
    art.onload = () => {
      const plate = document.createElement("canvas");
      plate.width = art.naturalWidth;
      plate.height = art.naturalHeight;
      const g = plate.getContext("2d");
      if (!g) return;
      g.drawImage(art, 0, 0);
      const data = g.getImageData(0, 0, plate.width, plate.height);
      const px = data.data;
      for (let i = 0; i < px.length; i += 4) {
        const lum = px[i] + px[i + 1] + px[i + 2];
        px[i] = 255;
        px[i + 1] = 255;
        px[i + 2] = 255;
        px[i + 3] = lum < 36 ? 0 : Math.min(255, (lum - 36) * 3);
      }
      g.putImageData(data, 0, 0);
      mask = plate;
    };
    fetch("/bones.json")
      .then((res) => res.json())
      .then((mesh: { nodes: Array<{ x: number; y: number; teal: boolean; world?: boolean }>; ribs: number[][] }) => {
        const front: Bone[] = mesh.nodes.map((n) => ({ x: n.x, y: n.y, z: 0.04, teal: n.teal, world: !!n.world }));
        const links: Rib[] = mesh.ribs.map(([a, b]) => ({ a, b }));
        const count = front.length;
        const back = front.map((n) => ({ ...n, z: -0.04 }));
        frontEdges = links.length;
        const ribsAll = links.slice();
        for (const rib of links) ribsAll.push({ a: rib.a + count, b: rib.b + count });
        for (let i = 0; i < count; i += 3) ribsAll.push({ a: i, b: i + count });
        const graph = ribsAll.map(() => [] as number[]);
        const touch = new Map<number, number[]>();
        ribsAll.forEach((rib, e) => {
          for (const id of [rib.a, rib.b]) {
            const list = touch.get(id);
            if (list) list.push(e);
            else touch.set(id, [e]);
          }
        });
        ribsAll.forEach((rib, e) => {
          const pool = new Set<number>();
          for (const id of touch.get(rib.a) ?? []) if (id !== e) pool.add(id);
          for (const id of touch.get(rib.b) ?? []) if (id !== e) pool.add(id);
          graph[e] = [...pool];
        });
        bones = front.concat(back);
        ribs = ribsAll;
        next = graph;
        const arm = (red: boolean) => {
          const ids: number[] = [];
          for (let i = 0; i < front.length; i++) {
            if (!!front[i].world !== red) continue;
            if (!red && !front[i].teal) continue;
            ids.push(i);
          }
          if (!ids.length) {
            for (let i = 0; i < front.length; i++) if (!!front[i].world === red) ids.push(i);
          }
          ids.sort((a, b) => front[a].x - front[b].x);
          const starts = red
            ? ids.filter((id, i) => i === 0 || front[id].x - front[ids[i - 1]].x > 0.03)
            : [ids[0], ids[0], ids[0], ids[Math.floor(ids.length / 2)]];
          starts.forEach((from, i) => {
            if (from == null) return;
            const edge = links.findIndex((rib) => rib.a === from || rib.b === from);
            if (edge < 0) return;
            charges.push({ edge, from, t: i * 0.34, red, seed: 11 + i * 17 + (red ? 80 : 0) });
          });
        };
        arm(false);
        arm(true);
        const choose = (red: boolean, salt: number) => {
          const ids: number[] = [];
          for (let i = 0; i < front.length; i++) if (!!front[i].world === red) ids.push(i);
          if (!ids.length) return 0;
          return ids[Math.floor(hash(salt) * ids.length)] ?? ids[0];
        };
        [
          [false, 0],
          [false, 0.28],
          [false, 0.56],
          [true, 0.12],
          [true, 0.4],
          [true, 0.68],
        ].forEach(([red, t], i) => {
          leaps.push({ target: choose(!!red, i + 3), t: Number(t), red: !!red, seed: 20 + i * 9 });
        });
      })
      .catch(() => {});

    const project = (bone: Bone, yaw: number, w: number, h: number) => {
      const x = bone.x - 0.5;
      const y = bone.y - 0.5;
      const cy = Math.cos(yaw);
      const sy = Math.sin(yaw);
      const x1 = x * cy - bone.z * sy;
      const z1 = x * sy + bone.z * cy;
      const pitch = 0.08;
      const cp = Math.cos(pitch);
      const sp = Math.sin(pitch);
      const y1 = y * cp - z1 * sp;
      const z2 = y * sp + z1 * cp;
      const f = 2.6 / (2.6 + z2);
      return { x: w * (0.5 + x1 * f), y: h * (0.5 + y1 * f) };
    };

    const frame = (now: number) => {
      if (!alive) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      if (bones.length > 8 && ribs.length > 4) {
        const yaw = Math.sin(now / 7000) * 0.07;
        const pts = bones.map((bone) => project(bone, yaw, w, h));
        ctx.globalCompositeOperation = "lighter";
        ctx.lineCap = "round";
        const frontCount = Math.floor(bones.length / 2);
        const sources: number[] = [];
        for (let i = 0; i < frontCount; i++) if (bones[i].teal) sources.push(i);
        const origin = sources.reduce(
          (acc, id) => {
            const p = pts[id];
            if (!p) return acc;
            acc.x += p.x;
            acc.y += p.y;
            acc.n += 1;
            return acc;
          },
          { x: 0, y: 0, n: 0 },
        );
        const ox = origin.n ? origin.x / origin.n : w * 0.5;
        const oy = origin.n ? origin.y / origin.n : h * 0.42;
        const worlds: number[] = [];
        for (let i = 0; i < frontCount; i++) if (bones[i].world) worlds.push(i);
        const worigin = worlds.reduce(
          (acc, id) => {
            const p = pts[id];
            if (!p) return acc;
            acc.x += p.x;
            acc.y += p.y;
            acc.n += 1;
            return acc;
          },
          { x: 0, y: 0, n: 0 },
        );
        const wx = worigin.n ? worigin.x / worigin.n : w * 0.5;
        const wy = worigin.n ? worigin.y / worigin.n : h * 0.72;
        const reach = Math.hypot(w, h) * 0.62;
        const wave = ((now % 4200) / 4200) * reach;
        ribs.forEach((rib) => {
          const a = pts[rib.a];
          const b = pts[rib.b];
          if (!a || !b) return;
          const mx = (a.x + b.x) / 2;
          const my = (a.y + b.y) / 2;
          const front = rib.a < bones.length / 2 && rib.b < bones.length / 2;
          const teal = bones[rib.a].teal || bones[rib.b].teal;
          const world = bones[rib.a].world || bones[rib.b].world;
          const dist = Math.hypot(mx - (world ? wx : ox), my - (world ? wy : oy));
          const pulse = Math.exp(-((dist - wave) ** 2) / (reach * reach * 0.012));
          ctx.globalAlpha = (front ? 0.16 : 0.06) + pulse * 0.22;
          ctx.strokeStyle = world ? "#ff4a32" : teal ? "#7ef6ff" : "#b7dbe6";
          ctx.lineWidth = (front ? 0.65 : 0.3) + pulse * 0.35;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        });
        const dt = lastNow ? Math.min(0.032, (now - lastNow) / 1000) : 0.016;
        lastNow = now;
        const heads: Array<{ x: number; y: number; red: boolean }> = [];
        charges.forEach((charge) => {
          if (charge.edge >= frontEdges) return;
          charge.t += dt * 1.15;
          if (charge.t >= 1) {
            const rib = ribs[charge.edge];
            const node = rib.a === charge.from ? rib.b : rib.a;
            const came = bones[charge.from];
            const at = bones[node];
            const options = (next[charge.edge] ?? []).filter((id) => {
              if (id >= frontEdges) return false;
              const other = ribs[id];
              return other && (other.a === node || other.b === node);
            });
            let best = -1;
            let bestScore = -99;
            for (const id of options) {
              const other = ribs[id];
              const nextId = other.a === node ? other.b : other.a;
              if (!!bones[nextId].world !== charge.red) continue;
              const dirx = bones[nextId].x - at.x;
              const diry = bones[nextId].y - at.y;
              const score = dirx * (at.x - came.x) + diry * (at.y - came.y) + dirx * 0.02;
              if (score > bestScore) {
                bestScore = score;
                best = id;
              }
            }
            if (best < 0) {
              let home = sources[0] ?? 0;
              if (charge.red) {
                let bestX = Infinity;
                for (let i = 0; i < frontCount; i++) {
                  if (bones[i].world && bones[i].x < bestX) {
                    bestX = bones[i].x;
                    home = i;
                  }
                }
              }
              const edge = ribs.findIndex((rib, idx) => idx < frontEdges && (rib.a === home || rib.b === home));
              if (edge >= 0) {
                charge.edge = edge;
                charge.from = home;
              }
              charge.t = 0;
            } else {
              charge.from = node;
              charge.edge = best;
              charge.t -= 1;
            }
          }
          const rib = ribs[charge.edge];
          const a = pts[charge.from];
          const b = pts[rib.a === charge.from ? rib.b : rib.a];
          if (!a || !b) return;
          const head = { x: a.x + (b.x - a.x) * charge.t, y: a.y + (b.y - a.y) * charge.t };
          const tailT = Math.max(0, charge.t - 1);
          const tail = { x: a.x + (b.x - a.x) * tailT, y: a.y + (b.y - a.y) * tailT };
          const span = Math.hypot(head.x - tail.x, head.y - tail.y);
          forceLightning(ctx, jag(tail.x, tail.y, head.x, head.y, Math.max(2.5, span * 0.18), charge.seed), 0.85, charge.red);
          heads.push({ x: head.x, y: head.y, red: charge.red });
        });
        const iris = project(irisBone, yaw, w, h);
        const bow = (from: Pt, to: Pt, t: number, seed: number) => {
          const dx = to.x - from.x;
          const dy = to.y - from.y;
          const len = Math.hypot(dx, dy) || 1;
          const side = hash(seed) > 0.5 ? 1 : -1;
          const cx = (from.x + to.x) / 2 + (-dy / len) * len * 0.26 * side;
          const cy = (from.y + to.y) / 2 + (dx / len) * len * 0.26 * side;
          const u = 1 - t;
          return { x: u * u * from.x + 2 * u * t * cx + t * t * to.x, y: u * u * from.y + 2 * u * t * cy + t * t * to.y };
        };
        leaps.forEach((leap) => {
          const dest = pts[leap.target];
          if (!dest) return;
          leap.t += dt * 0.42;
          if (leap.t >= 1) {
            leap.t = 0;
            leap.seed += 1;
            const ids: number[] = [];
            for (let i = 0; i < frontCount; i++) if (!!bones[i].world === leap.red && i !== leap.target) ids.push(i);
            const far = ids.filter((id) => Math.hypot(bones[id].x - bones[leap.target].x, bones[id].y - bones[leap.target].y) > 0.06);
            const pool = far.length ? far : ids;
            if (pool.length) leap.target = pool[Math.floor(hash(leap.seed) * pool.length)] ?? leap.target;
          }
          const grown = Math.min(1, leap.t);
          const curve: Pt[] = [iris];
          for (let s = 0.16; s <= grown + 0.001; s += 0.16) curve.push(bow(iris, dest, Math.min(1, s), leap.seed));
          if (curve.length < 2) return;
          const bolt = jag(curve[0].x, curve[0].y, curve[curve.length - 1].x, curve[curve.length - 1].y, 10, leap.seed);
          forceLightning(ctx, curve.slice(0, -1).concat(bolt.slice(1)), 0.45 + grown * 0.55, leap.red);
          const head = curve[curve.length - 1];
          heads.push({ x: head.x, y: head.y, red: leap.red });
        });
        for (let e = 0; e < frontEdges; e++) {
          const rib = ribs[e];
          const a = pts[rib.a];
          const b = pts[rib.b];
          if (!a || !b) continue;
          const red = bones[rib.a].world || bones[rib.b].world;
          let near = 80;
          for (const head of heads) {
            if (head.red !== red) continue;
            near = Math.min(near, Math.hypot((a.x + b.x) / 2 - head.x, (a.y + b.y) / 2 - head.y));
          }
          if (near > 54) continue;
          const lit = 1 - near / 54;
          ctx.globalAlpha = 0.25 + lit * 0.75;
          ctx.strokeStyle = red ? "#ffd0c4" : "#e9fbff";
          ctx.lineWidth = 1.2 + lit * 2.2;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
        const eye = pts[sources[0] ?? 0];
        if (eye) {
          const beat = 0.55 + heart(now) * 0.45;
          const flare = ctx.createRadialGradient(eye.x, eye.y, 0, eye.x, eye.y, 36 * beat);
          flare.addColorStop(0, `rgba(255,255,255,${0.85 * beat})`);
          flare.addColorStop(0.35, `rgba(120,240,255,${0.45 * beat})`);
          flare.addColorStop(1, "rgba(20,180,220,0)");
          ctx.globalAlpha = 1;
          ctx.fillStyle = flare;
          ctx.beginPath();
          ctx.arc(eye.x, eye.y, 36 * beat, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (mask) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalCompositeOperation = "destination-in";
        ctx.drawImage(mask, 0, 0, canvas.width, canvas.height);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);
  return <canvas ref={ref} className="storm arc" aria-hidden="true" />;
}

function SwordRule() {
  return (
    <div className="sword-rule" aria-hidden="true">
      <img src="/sword.png?v=sharp" alt="" />
    </div>
  );
}

function Home() {
  const [copied, setCopied] = useState(false);
  const copyCa = () => {
    navigator.clipboard.writeText(CA).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    }).catch(() => {});
  };
  return (
    <>
      <a className="skip" href="#token">Skip to token</a>
      <header className="nav">
        <a className="brand" href="#top">
          <img src="/mark.jpg?v=locked" width={40} height={40} alt="" />
          <span>LATHOS'</span>
        </a>
        <nav className="nav-links" aria-label="Sections">
          <a href="#buy">How to get it</a>
          <a href="#token">Contract</a>
          <a className="btn btn-cyan nav-buy" href={FLAP} target="_blank" rel="noreferrer">Get $LWRLD</a>
          <AccountSlot />
        </nav>
      </header>
      <main id="top">
        <section className="hero" aria-label="LathosWorld">
          <div className="hero-art">
            <h1 className="crest-lockup">
              <img className="wordmark" src="/mark.jpg?v=locked" width={1792} height={1008} alt="LathosWorld" />
              <LiveArc />
            </h1>
          </div>
          <div className="clip">
            <video src="/lathosworld.mp4" controls playsInline loop preload="metadata" />
            <a href="/lathosworld.mp4" download="lathosworld.mp4">Save the video</a>
          </div>
          <div className="hero-copy">
            <p className="kicker">Live on Flap · BNB Smart Chain</p>
            <p className="sell-line">Get $LWRLD</p>
            <p className="lede">One contract. One Flap page. 4% on the way in. 4% on the way out.</p>
            <div className="cta-row">
              <a className="btn btn-cyan btn-buy" href={FLAP} target="_blank" rel="noreferrer">Get $LWRLD on Flap</a>
              <button className="btn btn-ghost" type="button" onClick={copyCa}>{copied ? "Contract copied" : "Copy the contract"}</button>
            </div>
          </div>
        </section>
        <SwordRule />
        <section className="section" id="buy">
          <div className="wrap">
            <div className="banner">
              <p className="kicker">Three steps</p>
              <h2>How to get it</h2>
            </div>
            <ol className="steps">
              <li><strong>1 · BNB</strong><span>Put BNB in a wallet that can reach BNB Smart Chain.</span></li>
              <li><strong>2 · Flap</strong><span>Open the official Flap page. The address ends in 7777.</span></li>
              <li><strong>3 · Trade</strong><span>Swap there. The 4% tax is part of the token, not a hidden fee.</span></li>
            </ol>
            <div className="cta-row">
              <a className="btn btn-cyan btn-buy" href={FLAP} target="_blank" rel="noreferrer">Open Flap and get $LWRLD</a>
            </div>
          </div>
        </section>
        <SwordRule />
        <section className="section" id="token">
          <div className="wrap">
            <div className="banner">
              <p className="kicker">BNB Smart Chain</p>
              <h2>$LWRLD</h2>
            </div>
            <p className="serif-line">LathosWorld. A Flap tax token.</p>
            <div className="panel">
              <dl className="facts">
                {FACTS.map((fact) => (
                  <div key={fact.label}>
                    <dt>{fact.label}</dt>
                    <dd>{fact.value}</dd>
                  </div>
                ))}
              </dl>
              <div className="ca-row">
                <code>{CA}</code>
                <button className="btn btn-ghost" type="button" onClick={copyCa}>{copied ? "Copied" : "Copy contract"}</button>
                <a className="btn btn-ghost" href={SCAN} target="_blank" rel="noreferrer">BscScan</a>
              </div>
              <p className="note">
                Contract ends in 7777. A different address is not this token. Intended for certain audiences only. Not financial advice. Not a promise of price.
              </p>
              <div className="cta-row">
                <a className="btn btn-cyan btn-buy" href={FLAP} target="_blank" rel="noreferrer">Get $LWRLD on Flap</a>
                <a className="btn btn-ghost" href={PAPER} target="_blank" rel="noreferrer">Read the paper</a>
              </div>
            </div>
          </div>
        </section>
        <SwordRule />
        <section className="section" id="community">
          <div className="wrap">
            <div className="banner">
              <p className="kicker">Links</p>
              <h2>Where it lives</h2>
            </div>
            <p className="serif-line">The trade is on Flap. Everything else is optional.</p>
            <div className="socials">
              {DOORS.map((door) => (
                <a key={door.name} className="social" href={door.href} target="_blank" rel="noreferrer">
                  <Mark name={door.icon} />
                  <span>
                    <strong>{door.name}</strong>
                    <em>{door.handle}</em>
                  </span>
                  <b>{door.hint}</b>
                </a>
              ))}
            </div>
          </div>
        </section>
      </main>
      <footer className="footer">
        <div className="wrap">
          <p className="way">Not financial advice.</p>
          <p className="thanks">$LWRLD on Flap. BNB Smart Chain.</p>
          <p className="copy">© 2026 Lathos' World</p>
        </div>
      </footer>
      <div className="buy-bar">
        <p>$LWRLD · contract ends in 7777</p>
        <a className="btn btn-cyan" href={FLAP} target="_blank" rel="noreferrer">Get $LWRLD</a>
      </div>
    </>
  );
}

function AccountSlot() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) return <span className="nav-auth-wait" aria-hidden="true" />;
  if (!user) return <Link to="/login">Sign in</Link>;
  return (
    <span className="nav-auth">
      <Link to="/account">Account</Link>
      <UserButton />
    </span>
  );
}

function Mark({ name }: { name: (typeof DOORS)[number]["icon"] }) {
  if (name === "telegram") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M21.5 4.4 2.7 11.2c-1.2.5-1.2 1.1-.2 1.4l4.8 1.5 11.2-7.1c.5-.3 1-.1.6.3l-9.1 8.2-.3 4.7c.5 0 .7-.2 1-.5l2.3-2.2 4.9 3.6c.9.5 1.5.2 1.7-.8l3.2-15.1c.4-1.3-.5-1.9-1.3-1.4z" />
      </svg>
    );
  }
  if (name === "youtube") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M23 12.2s0-3.1-.4-4.5c-.2-.9-.9-1.6-1.8-1.8C19.2 5.5 12 5.5 12 5.5s-7.2 0-8.8.4c-.9.2-1.6.9-1.8 1.8C1 9.1 1 12.2 1 12.2s0 3.1.4 4.5c.2.9.9 1.6 1.8 1.8 1.6.4 8.8.4 8.8.4s7.2 0 8.8-.4c.9-.2 1.6-.9 1.8-1.8.4-1.4.4-4.5.4-4.5zM9.8 15.5V8.9l6.1 3.3-6.1 3.3z" />
      </svg>
    );
  }
  if (name === "x") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M14.7 10.4 22.2 2h-1.8l-6.5 7.3L8.2 2H2l8 11.3L2 22h1.8l7-7.9L15.6 22H22l-7.3-11.6zm-2.5 2.8-.8-1.1L4.6 3.5h2.8l5.2 7.3.8 1.1 6.8 9.5h-2.8l-5.2-7.2z" />
      </svg>
    );
  }
  if (name === "twitch") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 3h16v11l-4 4h-4l-2 2H8v-2H3V6l2-3zm2 2v11h3v2h2l2-2h4l2-2V5H7zm8 2h2v5h-2V7zm-4 0h2v5h-2V7z" />
      </svg>
    );
  }
  if (name === "discord") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M19.3 5.3A17 17 0 0 0 15 4l-.3.6a15 15 0 0 0-5.4 0L9 4a17 17 0 0 0-4.3 1.3C2.4 9 1.7 12.5 2.1 16a16 16 0 0 0 5 2.5l.8-1.3a10 10 0 0 1-1.5-.7l.3-.2c3.1 1.4 6.5 1.4 9.6 0l.3.2c-.5.3-1 .5-1.5.7l.8 1.3a16 16 0 0 0 5-2.5c.5-3.9-.7-7.4-2.6-10.7zM8.6 14.2c-.8 0-1.5-.8-1.5-1.7s.7-1.7 1.5-1.7 1.5.8 1.5 1.7-.7 1.7-1.5 1.7zm6.8 0c-.8 0-1.5-.8-1.5-1.7s.7-1.7 1.5-1.7 1.5.8 1.5 1.7-.7 1.7-1.5 1.7z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3l2.2 5.2L20 9l-4 3.6L17.2 19 12 16.2 6.8 19 8 12.6 4 9l5.8-.8L12 3z" />
    </svg>
  );
}

```

---

# src/styles.css

```css
@import "tailwindcss";
@import "@fontsource/orbitron/latin-700.css";
@import "@fontsource/orbitron/latin-800.css";
@import "@fontsource/cinzel/latin-500.css";
@import "@fontsource/cinzel/latin-600.css";
@import "@fontsource/dm-sans/latin-400.css";
@import "@fontsource/dm-sans/latin-500.css";
@import "@fontsource/dm-sans/latin-600.css";
@import "@fontsource/share-tech-mono/latin-400.css";

@theme {
  --color-bg: #05080c;
  --color-ink: #e7eef2;
  --color-muted: #a9b7c4;
  --color-cyan: #5ff3f0;
  --color-blood: #e0222a;
  --color-gold: #d4af37;
  --color-chrome: #c9d3dc;
  --color-storm: #1b3a5c;
  --color-panel: #0b1118;
  --color-line: #1c2a36;
  --font-display: "Orbitron", sans-serif;
  --font-serif: "Cinzel", "Palatino Linotype", serif;
  --font-sans: "DM Sans", "Segoe UI", sans-serif;
  --font-mono: "Share Tech Mono", ui-monospace, monospace;
}

@layer base {
  html { scroll-behavior: smooth; cursor: url("/sword-cursor.png?v=sharp") 32 2, auto; }
  body {
    margin: 0;
    background: var(--color-bg);
    color: var(--color-ink);
    font-family: var(--font-sans);
    font-size: 1.05rem;
    line-height: 1.55;
    padding-bottom: 5.5rem;
  }
  button:not(:disabled),
  [role="button"]:not(:disabled) { cursor: url("/sword-cursor.png?v=sharp") 32 2, auto; }
  :focus-visible {
    outline: 2px solid var(--color-cyan);
    outline-offset: 3px;
  }
  @media (prefers-reduced-motion: reduce) {
    html { scroll-behavior: auto; }
  }
}

.skip {
  position: absolute;
  left: 1rem;
  top: 0;
  transform: translateY(-120%);
  background: var(--color-cyan);
  color: var(--color-bg);
  padding: 0.6rem 0.9rem;
  z-index: 40;
  font-weight: 600;
}
.skip:focus { transform: none; }

.nav {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.25rem 0.75rem;
  padding: 0.35rem 1rem;
  background: color-mix(in srgb, var(--color-bg) 88%, transparent);
  border-bottom: 1px solid var(--color-line);
  backdrop-filter: blur(12px);
}
.brand {
  font-family: var(--font-display);
  font-weight: 800;
  letter-spacing: 0.14em;
  color: var(--color-cyan);
  text-decoration: none;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  text-shadow: 0 0 12px color-mix(in srgb, var(--color-cyan) 55%, transparent);
}
.brand img {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  margin-right: 0.45rem;
  object-fit: cover;
}
.nav-links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.15rem;
  align-items: center;
}
.nav-links a {
  color: var(--color-muted);
  text-decoration: none;
  font-family: var(--font-display);
  font-size: 0.68rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  min-height: 44px;
  padding: 0 0.55rem;
  display: inline-flex;
  align-items: center;
}
.nav-links a:hover { color: var(--color-ink); }
.nav-auth { display: inline-flex; align-items: center; gap: 0.35rem; color: var(--color-ink); }
.nav-auth-wait { width: 4.5rem; height: 1rem; }

.hero-art {
  position: relative;
  background: var(--color-bg);
  overflow: hidden;
}
.crest-lockup { position: relative; z-index: 2; margin: 0; isolation: isolate; }
.wordmark {
  display: block;
  width: 100%;
  height: auto;
  object-fit: contain;
  background: #05080c;
  filter: brightness(1.28) contrast(1.12) saturate(1.15);
}
.storm {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 4;
  background: transparent;
}
.storm.arc { mix-blend-mode: normal; }
.read-storm {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 8;
}
.hero-copy { text-align: center; padding: 0.4rem 1.1rem 2.6rem; }
.clip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 1.1rem 0.2rem;
}
.clip video {
  width: min(720px, 100%);
  height: auto;
  background: #05080c;
  border: 1px solid rgba(127, 246, 255, 0.25);
}
.clip a {
  color: var(--color-cyan);
  font-family: var(--font-display);
  font-size: 0.72rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
.kicker {
  margin: 0;
  font-family: var(--font-display);
  font-size: 0.72rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--color-cyan);
}
.tag-rotator {
  position: relative;
  max-width: 36rem;
  min-height: 3.4rem;
  margin: 0.85rem auto 0;
}
.tag-rotator p {
  position: absolute;
  inset: 0;
  margin: 0;
  font-family: var(--font-display);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  animation: tag 15s infinite;
  opacity: 0;
}
.tag-rotator p:nth-child(2) { animation-delay: -10s; }
.tag-rotator p:nth-child(3) { animation-delay: -5s; }
@keyframes tag {
  0%, 28% { opacity: 1; }
  33%, 100% { opacity: 0; }
}
.lede {
  margin: 0.35rem auto 0;
  max-width: 36rem;
  color: var(--color-muted);
}
.cta-row {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1.35rem;
  align-items: center;
}
.btn {
  min-height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1.15rem;
  text-decoration: none;
  font-family: var(--font-display);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  border-radius: 999px;
  border: 1px solid transparent;
}
.btn-cyan {
  color: var(--color-bg);
  background: var(--color-cyan);
  box-shadow: 0 0 22px color-mix(in srgb, var(--color-cyan) 35%, transparent);
}
.btn-ghost {
  color: var(--color-ink);
  background: transparent;
  border-color: color-mix(in srgb, var(--color-blood) 80%, white);
}
.section { padding: 2.4rem 0 1rem; }
.wrap { width: min(68rem, calc(100% - 2rem)); margin: 0 auto; }
.banner h2 {
  margin: 0.25rem 0 0.4rem;
  font-family: var(--font-display);
  font-size: clamp(1.6rem, 4vw, 2.4rem);
  letter-spacing: 0.04em;
}
.rules {
  list-style: none;
  margin: 0 0 1.4rem;
  padding: 0;
  display: grid;
  gap: 0.55rem;
}
.rule-one {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  margin: 0;
  padding: 0.9rem 1rem;
  border: 1px solid color-mix(in srgb, var(--color-blood) 70%, white);
  background: color-mix(in srgb, var(--color-blood) 12%, var(--color-panel));
  font-family: var(--font-display);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.rule-one span {
  display: grid;
  place-items: center;
  width: 2.2rem;
  height: 2.2rem;
  border-radius: 50%;
  background: var(--color-blood);
  color: white;
  font-weight: 800;
}
.serif-line {
  margin: 0 0 1rem;
  font-family: var(--font-serif);
  color: var(--color-gold);
  font-size: 1.15rem;
}
.prose { max-width: 40rem; color: var(--color-muted); }
.prose p { margin: 0 0 0.9rem; }
.mono-quote {
  font-family: var(--font-mono);
  color: var(--color-chrome);
  letter-spacing: 0.04em;
}
.ages {
  display: grid;
  gap: 0.75rem;
  margin: 1.2rem 0 0;
  padding: 0;
  list-style: none;
}
.ages li {
  padding: 0.85rem 0.9rem;
  border: 1px solid var(--color-line);
  background: var(--color-panel);
}
.ages strong {
  display: block;
  font-family: var(--font-display);
  letter-spacing: 0.12em;
  color: var(--color-cyan);
}
.saga { margin-bottom: 2rem; text-align: center; }
.saga-world, .saga-chapter, .saga-name { margin: 0; }
.saga-world {
  font-family: var(--font-display);
  letter-spacing: 0.28em;
  color: var(--color-gold);
}
.saga-chapter {
  margin-top: 0.8rem;
  font-family: var(--font-display);
  font-size: 0.72rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--color-cyan);
}
.saga-name {
  font-family: var(--font-serif);
  font-size: clamp(1.8rem, 5vw, 3rem);
}
.saga-viewport {
  height: 11rem;
  overflow: hidden;
  margin-top: 1rem;
  mask-image: linear-gradient(transparent, #000 18%, #000 78%, transparent);
}
.saga-crawl {
  animation: crawl 28s linear infinite;
  color: var(--color-gold);
  font-family: var(--font-serif);
}
.saga-crawl p { margin: 0 0 0.8rem; }
@keyframes crawl {
  from { transform: translateY(8rem); }
  to { transform: translateY(-100%); }
}
.me { margin: 0 0 1rem; }
.me img,
.me video {
  display: block;
  width: min(18rem, 100%);
  height: auto;
  border: 1px solid color-mix(in srgb, var(--color-gold) 40%, transparent);
}
.panel {
  padding: 1rem 0 0.4rem;
}
.facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
  gap: 0.75rem 1.25rem;
  margin: 1rem 0 0;
  padding: 0;
}
.facts div {
  border-top: 1px solid color-mix(in srgb, var(--color-cyan) 28%, transparent);
  padding-top: 0.45rem;
}
.facts dt {
  margin: 0;
  font-family: var(--font-display);
  font-size: 0.68rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-cyan);
}
.facts dd { margin: 0.2rem 0 0; }
.ca-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  align-items: center;
  margin-top: 1rem;
}
.ca-row code {
  font-family: var(--font-mono);
  font-size: 0.82rem;
  word-break: break-all;
}
.btn-buy {
  min-height: 58px;
  padding: 0.95rem 1.8rem;
  font-size: 0.95rem;
  letter-spacing: 0.16em;
}
.sell-line {
  margin: 0.4rem 0 0;
  font-family: var(--font-display);
  font-size: clamp(2rem, 6vw, 3.4rem);
  letter-spacing: 0.08em;
}
.steps {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
  gap: 0.8rem;
  margin: 1rem 0 0;
  padding: 0;
  list-style: none;
}
.steps li {
  margin: 0;
  padding: 1rem;
  background: var(--color-panel);
  border: 1px solid color-mix(in srgb, var(--color-cyan) 35%, transparent);
}
.steps strong {
  display: block;
  font-family: var(--font-display);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-cyan);
}
.steps span { display: block; margin-top: 0.35rem; }
.buy-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 30;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.8rem;
  padding: 0.7rem 1rem;
  background: rgba(5, 8, 12, 0.94);
  border-top: 1px solid color-mix(in srgb, var(--color-cyan) 45%, transparent);
}
.buy-bar p { margin: 0; font-family: var(--font-display); letter-spacing: 0.08em; font-size: 0.78rem; }
.nav-buy { margin-left: 0.35rem; }
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin: 0.8rem 0 0;
  padding: 0;
  list-style: none;
}
.chips li {
  display: inline-flex;
  align-items: center;
  padding: 0.35rem 0.7rem;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--color-cyan) 45%, transparent);
  color: var(--color-cyan);
  font-family: var(--font-display);
  font-size: 0.62rem;
  letter-spacing: 0.14em;
  background: color-mix(in srgb, var(--color-storm) 45%, transparent);
}
.case { margin: 1.1rem 0 0.2rem; }
.case img {
  display: block;
  width: 100%;
  height: auto;
  border: 1px solid color-mix(in srgb, var(--color-gold) 40%, transparent);
}
.case figcaption {
  margin-top: 0.55rem;
  font-family: var(--font-display);
  font-size: 0.68rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-muted);
}
.games { margin: 0.6rem 0 0; padding: 0; list-style: none; }
.games li {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.75rem;
  align-items: start;
  padding: 0.95rem 0;
  border-top: 1px solid var(--color-line);
}
.plat {
  font-family: var(--font-display);
  font-size: 0.62rem;
  letter-spacing: 0.12em;
  color: var(--color-bg);
  background: var(--color-cyan);
  padding: 0.4rem 0.45rem;
}
.games h3 { margin: 0; font-family: var(--font-display); font-size: 1rem; }
.games p { margin: 0.2rem 0 0; color: var(--color-muted); }
.stream-links { display: flex; flex-wrap: wrap; gap: 1rem; margin-top: 0.35rem; }
.optional {
  margin: 1rem 0 0;
  color: var(--color-muted);
  font-family: var(--font-display);
  font-size: 0.68rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.stream-links a { color: var(--color-cyan); }
.lanes { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.lane {
  position: relative;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  padding: 0 0.75rem;
  border: 1px solid var(--color-line);
  font-family: var(--font-display);
  font-size: 0.62rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.lane input { position: absolute; opacity: 0; }
.lane:has(:checked) { color: var(--color-bg); background: var(--color-cyan); }
.vault:has(input[value="chrome"]:checked) .card:not([data-lane="chrome"]),
.vault:has(input[value="spirit"]:checked) .card:not([data-lane="spirit"]),
.vault:has(input[value="console"]:checked) .card:not([data-lane="console"]),
.vault:has(input[value="legend"]:checked) .card:not([data-lane="legend"]),
.vault:has(input[value="mine"]:checked) .card:not([data-lane="mine"]) { display: none; }
.vault-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.85rem;
  list-style: none;
  padding: 0;
  margin: 1rem 0 0;
}
.holo {
  background: #0a1016;
  border: 1px solid var(--color-line);
  overflow: hidden;
}
.holo img,
.holo video {
  display: block;
  width: 100%;
  height: auto;
}
.plate {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.55rem 0.7rem 0.7rem;
  font-family: var(--font-display);
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.plate span { color: var(--color-gold); }
.shine { display: none; }
.card-wide { grid-column: 1 / -1; }
.socials { display: grid; gap: 0.7rem; }
.social {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.75rem;
  align-items: center;
  min-height: 44px;
  padding: 0.85rem;
  border: 1px solid var(--color-line);
  text-decoration: none;
  color: inherit;
}
.social svg { width: 1.4rem; height: 1.4rem; fill: var(--color-cyan); }
.social strong { display: block; font-family: var(--font-display); letter-spacing: 0.08em; }
.social em { color: var(--color-muted); font-style: normal; }
.social b {
  color: var(--color-gold);
  font-weight: 500;
  letter-spacing: 0.12em;
  font-size: 0.68rem;
  text-transform: uppercase;
}
.sword-rule { display: flex; justify-content: center; padding: 0.4rem 0; }
.sword-rule img { width: 4.6rem; height: auto; }
.footer { padding: 2rem 0 2.6rem; text-align: center; }
.way {
  margin: 0;
  font-family: var(--font-serif);
  color: var(--color-gold);
}
.thanks, .copy { margin: 0.35rem 0 0; color: var(--color-muted); }

.gate {
  min-height: 100vh;
  display: grid;
  align-content: start;
  justify-items: center;
  gap: 1.25rem;
  padding: 1.5rem 1rem 3rem;
}
.gate-card {
  width: min(32rem, 100%);
  display: grid;
  gap: 0.85rem;
  padding: 1.25rem 1.15rem 1.4rem;
  background: var(--color-panel);
  border: 1px solid var(--color-line);
}
.gate-card h1, .gate-card h2 {
  margin: 0;
  font-family: var(--font-display);
  letter-spacing: 0.04em;
}
.gate-card h2 { margin-top: 0.6rem; font-size: 0.95rem; }
.gate-card form { display: grid; gap: 0.75rem; }
.gate-card label {
  display: grid;
  gap: 0.35rem;
  font-family: var(--font-display);
  font-size: 0.68rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-muted);
}
.gate-card input, .gate-card select {
  min-height: 44px;
  width: 100%;
  padding: 0.55rem 0.7rem;
  border: 1px solid var(--color-line);
  background: #070c12;
  color: var(--color-ink);
  font-family: var(--font-sans);
  font-size: 1rem;
  letter-spacing: 0;
  text-transform: none;
}
.gate-note { margin: 0; color: var(--color-gold); }
.gate-switch { display: flex; flex-wrap: wrap; gap: 0.75rem; }
.gate-switch button {
  background: none;
  border: 0;
  padding: 0;
  color: var(--color-cyan);
  font-family: var(--font-display);
  font-size: 0.68rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.gate-list { margin: 0; padding-left: 1.1rem; color: var(--color-muted); }

@media (min-width: 720px) {
  .cta-row { flex-direction: row; justify-content: center; }
  .btn { min-width: 15rem; }
  .ages { grid-template-columns: repeat(3, 1fr); }
  .vault-grid { grid-template-columns: repeat(3, 1fr); gap: 1rem; }
  .socials { grid-template-columns: 1fr 1fr; }
}
@media (prefers-reduced-motion: reduce) {
  .tag-rotator p, .saga-crawl { animation: none; opacity: 1; position: static; }
  .tag-rotator { min-height: 0; }
}
a, button, .btn, .cursor-pointer, label, input, select, summary {
  cursor: url("/sword-cursor.png?v=sharp") 32 2, auto;
}

```
