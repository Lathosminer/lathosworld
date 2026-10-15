"""Build a letter-bone mesh from the locked mark."""
import json
from PIL import Image
import numpy as np

src = Image.open("/workspace/public/mark.jpg").convert("RGB")
full = np.asarray(src)
H, W = full.shape[:2]
r = full[:, :, 0].astype(np.int16)
g = full[:, :, 1].astype(np.int16)
b = full[:, :, 2].astype(np.int16)
letter = (g > 100) & (b > 120) & (r < 190) & ((g + b) > 280)
ii = np.zeros((H + 1, W + 1), np.int32)
ii[1:, 1:] = letter
ii = ii.cumsum(0).cumsum(1)
rad = 5
ys = np.arange(H)[:, None]
xs = np.arange(W)[None, :]
y0s = np.clip(ys - rad, 0, H)
x0s = np.clip(xs - rad, 0, W)
y1s = np.clip(ys + rad + 1, 0, H)
x1s = np.clip(xs + rad + 1, 0, W)
count = ii[y1s, x1s] - ii[y0s, x1s] - ii[y1s, x0s] + ii[y0s, x0s]
thick = letter & (count > 36)
world_rows = np.zeros(H, dtype=bool)
world_rows[700:860] = True
thick = thick | (letter & (count > 14) & world_rows[:, None])
keep = np.zeros(H, dtype=bool)
keep[330:520] = True
keep[720:840] = True
thick &= keep[:, None]
def bones_from(mask: np.ndarray, world: bool, stem: bool) -> tuple[list, list]:
    rows = np.where(mask.any(axis=1))[0]
    cols = np.where(mask.any(axis=0))[0]
    if len(rows) == 0:
        return [], []
    pad = 8
    y0, y1 = max(0, int(rows.min()) - pad), min(H, int(rows.max()) + pad)
    x0, x1 = max(0, int(cols.min()) - pad), min(W, int(cols.max()) + pad)
    crop = mask[y0:y1, x0:x1]
    tw = 280
    th = max(12, int(crop.shape[0] * (tw / crop.shape[1])))
    small = np.array(Image.fromarray(crop.astype(np.uint8) * 255).resize((tw, th), Image.Resampling.BOX)) > 40
    img = small.copy()
    changed = True
    while changed:
        changed = False
        for step in (0, 1):
            remove = []
            h, w = img.shape
            for y in range(1, h - 1):
                for x in range(1, w - 1):
                    if not img[y, x]:
                        continue
                    p = [
                        img[y - 1, x],
                        img[y - 1, x + 1],
                        img[y, x + 1],
                        img[y + 1, x + 1],
                        img[y + 1, x],
                        img[y + 1, x - 1],
                        img[y, x - 1],
                        img[y - 1, x - 1],
                    ]
                    n = sum(p)
                    if n < 2 or n > 6:
                        continue
                    seq = p + [p[0]]
                    trans = sum(seq[i] == 0 and seq[i + 1] == 1 for i in range(8))
                    if trans != 1:
                        continue
                    p2, p3, p4, p5, p6, p7, p8, p9 = p
                    if step == 0 and (p2 * p4 * p6 or p4 * p6 * p8):
                        continue
                    if step == 1 and (p2 * p4 * p8 or p2 * p6 * p8):
                        continue
                    remove.append((y, x))
            if remove:
                changed = True
                for y, x in remove:
                    img[y, x] = False
    ys, xs = np.where(img)
    cell = 4
    buckets: dict[tuple[int, int], list[tuple[int, int]]] = {}
    for y, x in zip(ys.tolist(), xs.tolist()):
        buckets.setdefault((y // cell, x // cell), []).append((y, x))
    nodes = []
    cell_index = {}
    for key, pts in buckets.items():
        cell_index[key] = len(nodes)
        sy = sum(p[0] for p in pts) / len(pts)
        sx = sum(p[1] for p in pts) / len(pts)
        nx = (x0 + (sx + 0.5) / tw * (x1 - x0)) / W
        ny = (y0 + (sy + 0.5) / th * (y1 - y0)) / H
        nodes.append({"x": round(float(nx), 4), "y": round(float(ny), 4), "teal": False, "world": world})
    if stem and nodes:
        xs_n = [n["x"] for n in nodes]
        stem_x = sorted(xs_n)[len(xs_n) // 2]
        for n in nodes:
            n["teal"] = abs(n["x"] - stem_x) < 0.018
    ribs = []
    for (cy, cx), i in cell_index.items():
        for dy, dx in ((0, 1), (1, 0), (1, 1), (1, -1)):
            j = cell_index.get((cy + dy, cx + dx))
            if j is None:
                continue
            if dy and dx:
                if cell_index.get((cy + dy, cx)) or cell_index.get((cy, cx + dx)):
                    continue
            ribs.append([i, j])
    return nodes, ribs


lathos_mask = letter & (count > 28)
lathos_mask[:330] = False
lathos_mask[530:] = False
world_mask = letter.copy()
world_mask[:745] = False
world_mask[815:] = False
nodes_a, ribs_a = bones_from(lathos_mask, False, True)
nodes_b, ribs_b = bones_from(world_mask, True, False)
shift = len(nodes_a)
nodes = nodes_a + nodes_b
ribs = ribs_a + [[a + shift, b + shift] for a, b in ribs_b]
out = {"nodes": nodes, "ribs": ribs}
with open("/workspace/public/bones.json", "w") as f:
    json.dump(out, f, separators=(",", ":"))
print(
    f"nodes {len(nodes)} ribs {len(ribs)} "
    f"teal {sum(n['teal'] for n in nodes)} world {sum(n['world'] for n in nodes)}"
)
