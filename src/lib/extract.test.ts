import { test } from "node:test";
import assert from "node:assert/strict";
import { kmeans, type Lab } from "./extract.ts";

/** A tight blob of points around a centre, deterministic. */
const blob = (l: number, a: number, b: number, n: number): Lab[] =>
  Array.from({ length: n }, (_, i) => {
    const t = (i / n) * Math.PI * 2;
    return { l: l + Math.sin(t) * 0.01, a: a + Math.cos(t) * 0.01, b };
  });

test("kmeans separates well-spaced clusters", () => {
  const points = [
    ...blob(0.9, 0.1, 0.0, 40),
    ...blob(0.5, -0.1, 0.1, 25),
    ...blob(0.15, 0.0, -0.12, 10),
  ];

  const found = kmeans(points, 3);
  assert.equal(found.length, 3);

  // Ordered by cluster size, so the 40-point blob has to come first.
  assert.ok(Math.abs(found[0].l - 0.9) < 0.03, `got l=${found[0].l}`);
  assert.ok(Math.abs(found[2].l - 0.15) < 0.03, `got l=${found[2].l}`);

  // Hue comes back as a real angle in 0..360, not a raw atan2 with negatives.
  for (const c of found) {
    assert.ok(c.h >= 0 && c.h < 360, `hue out of range: ${c.h}`);
    assert.ok(c.c >= 0, `negative chroma: ${c.c}`);
  }
});

test("kmeans handles degenerate inputs", () => {
  assert.deepEqual(kmeans([], 6), []);

  // Fewer pixels than clusters: return what exists rather than inventing
  // empty centroids that would come back as NaN.
  const two = kmeans([...blob(0.4, 0.05, 0, 1), ...blob(0.8, 0, 0.05, 1)], 6);
  assert.equal(two.length, 2);

  // A single flat colour must not produce NaN from empty clusters.
  const flat = kmeans(Array.from({ length: 50 }, () => ({ l: 0.6, a: 0, b: 0 })), 4);
  for (const c of flat) {
    assert.ok(Number.isFinite(c.l) && Number.isFinite(c.c) && Number.isFinite(c.h));
  }
});

test("kmeans returns distinct colours, not repeated centroids", () => {
  // Three colours but six clusters asked for: the extra centroids collapse
  // onto the same spots, and returning six chips where four are identical
  // reads as a bug to the user.
  const points = [
    ...blob(0.85, 0.05, 0.02, 30),
    ...blob(0.45, -0.08, 0.06, 20),
    ...blob(0.2, 0.02, -0.09, 10),
  ];
  const found = kmeans(points, 6);
  assert.equal(found.length, 3);

  const flat = kmeans(Array.from({ length: 40 }, () => ({ l: 0.5, a: 0.02, b: 0 })), 6);
  assert.equal(flat.length, 1);
});
