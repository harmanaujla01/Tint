import { type Oklch, rgbToOklch } from "./color.ts";

/**
 * k-means over an image's pixels, clustered in OKLab's cartesian form.
 *
 * Clustering in OKLCH directly would be wrong: hue is an angle, so 359deg and
 * 1deg are neighbours that read as 358 units apart. Projecting to
 * (L, c·cos h, c·sin h) makes euclidean distance behave, and the wrap
 * disappears. Converting the centroid back is just cartesian -> polar.
 */
export type Lab = { l: number; a: number; b: number };

const toLab = ({ l, c, h }: Oklch): Lab => {
  const rad = (h * Math.PI) / 180;
  return { l, a: c * Math.cos(rad), b: c * Math.sin(rad) };
};

const fromLab = ({ l, a, b }: Lab): Oklch => ({
  l,
  c: Math.hypot(a, b),
  h: ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360,
});

/** Roughly a just-noticeable difference in OKLab; below this it is one colour. */
const JND = 0.025;

const dist2 = (p: Lab, q: Lab) =>
  (p.l - q.l) ** 2 + (p.a - q.a) ** 2 + (p.b - q.b) ** 2;

/** Draw to a small canvas first — 120px of image is plenty for a palette. */
export async function pixelsFrom(file: File, edge = 120): Promise<Lab[]> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(edge / bitmap.width, edge / bitmap.height, 1);
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas is unavailable in this browser.");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const { data } = ctx.getImageData(0, 0, w, h);
  const out: Lab[] = [];
  for (let i = 0; i < data.length; i += 4) {
    // Skip anything meaningfully transparent; it is background, not colour.
    if (data[i + 3] < 200) continue;
    out.push(
      toLab(
        rgbToOklch({
          r: data[i] / 255,
          g: data[i + 1] / 255,
          b: data[i + 2] / 255,
        }),
      ),
    );
  }
  return out;
}

export function kmeans(points: Lab[], k = 6, iterations = 16): Oklch[] {
  if (points.length === 0) return [];
  if (points.length <= k) return points.map(fromLab);

  // Farthest-point init: deterministic, and it spreads the starting centroids
  // instead of landing three of them inside the same dominant colour.
  const centroids: Lab[] = [points[0]];
  while (centroids.length < k) {
    let best = points[0];
    let bestDist = -1;
    for (const p of points) {
      let nearest = Infinity;
      for (const c of centroids) nearest = Math.min(nearest, dist2(p, c));
      if (nearest > bestDist) {
        bestDist = nearest;
        best = p;
      }
    }
    centroids.push(best);
  }

  const assignment = new Array<number>(points.length).fill(0);
  for (let iter = 0; iter < iterations; iter++) {
    let moved = false;
    for (let i = 0; i < points.length; i++) {
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let c = 0; c < centroids.length; c++) {
        const d = dist2(points[i], centroids[c]);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = c;
        }
      }
      if (assignment[i] !== bestIdx) {
        assignment[i] = bestIdx;
        moved = true;
      }
    }
    if (!moved && iter > 0) break; // converged

    const sums = centroids.map(() => ({ l: 0, a: 0, b: 0, n: 0 }));
    for (let i = 0; i < points.length; i++) {
      const s = sums[assignment[i]];
      s.l += points[i].l;
      s.a += points[i].a;
      s.b += points[i].b;
      s.n++;
    }
    for (let c = 0; c < centroids.length; c++) {
      // An empty cluster keeps its old centroid rather than becoming NaN.
      if (sums[c].n === 0) continue;
      centroids[c] = {
        l: sums[c].l / sums[c].n,
        a: sums[c].a / sums[c].n,
        b: sums[c].b / sums[c].n,
      };
    }
  }

  const counts = centroids.map(() => 0);
  for (const a of assignment) counts[a]++;

  const ranked = centroids
    .map((c, i) => ({ lab: c, weight: counts[i] }))
    .sort((x, y) => y.weight - x.weight);

  // An image with fewer real colours than k collapses several centroids onto
  // the same spot, and showing the same swatch four times looks broken rather
  // than informative. Return what the image actually contains.
  const distinct: Lab[] = [];
  for (const { lab } of ranked) {
    if (distinct.every((kept) => dist2(kept, lab) > JND * JND)) distinct.push(lab);
  }
  return distinct.map(fromLab);
}
