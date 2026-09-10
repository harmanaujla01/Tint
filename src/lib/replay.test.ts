import test from "node:test";
import assert from "node:assert/strict";
import { fromHex } from "./color.ts";
import { CANDIDATES, search, swatch } from "./harmony.ts";
import { DURATION, FRAMES, frameAt } from "./replay.ts";

/** A fixed generator, so a failure here is a real one rather than an unlucky seed. */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const base = ["#f4a9be", "#c97b94", "#7a4a5c"].map((h) => swatch(fromHex(h)!, "library", false));

test("the search keeps its whole trail, and keeps the best of it", () => {
  const found = search(base, 5, seeded(7));
  assert.equal(found.trail.length, CANDIDATES);
  assert.equal(found.scores.length, CANDIDATES);
  assert.equal(found.score, Math.max(...found.scores));
  assert.equal(found.scores[found.kept], found.score);
  assert.equal(found.palette.length, 5);
  assert.ok(found.label.length > 0, "the winner explains itself");
  for (const candidate of found.trail) assert.equal(candidate.length, 5);
});

test("the replay ends on the winner and never runs off the end of the trail", () => {
  const found = search(base, 5, seeded(11));

  // Every frame the loop can possibly ask for, at one-millisecond resolution.
  for (let ms = 0; ms <= DURATION; ms++) {
    const f = frameAt(found, ms / DURATION);
    assert.ok(f.index >= 0 && f.index < CANDIDATES, `index ${f.index} off the end`);
    assert.equal(f.colors, found.trail[f.index]);
    assert.equal(f.score, found.scores[f.index]);
    assert.ok(f.best >= f.score, "best-so-far cannot be worse than this candidate");
    assert.ok(f.best <= found.score, "best-so-far cannot beat the winner");
  }

  // The last frame is the palette that is already sitting behind the replay,
  // so the flicker resolves rather than cutting.
  assert.equal(frameAt(found, 1).index, found.kept);
  assert.equal(frameAt(found, 0.999).index, found.kept);
});

test("every candidate stays on screen long enough to actually be read", () => {
  const found = search(base, 5, seeded(23));

  // The first cut of the replay ran sixteen candidates in 620ms — about 39ms
  // each, which is two refreshes and unreadable. The whole point of showing
  // the search is that you can see what it chose between, so the shortest
  // dwell is the number that matters, not the total duration.
  const dwell: number[] = [];
  let prev = -1;
  let start = 0;
  for (let ms = 0; ms <= DURATION; ms++) {
    const { index } = frameAt(found, ms / DURATION);
    if (index === prev) continue;
    if (prev >= 0) dwell.push(ms - start);
    prev = index;
    start = ms;
  }
  dwell.push(DURATION - start);

  assert.equal(dwell.length, FRAMES, "one dwell per frame");
  assert.ok(Math.min(...dwell) >= 120, `quickest candidate held ${Math.min(...dwell)}ms`);
  // And it decelerates: the winner has to sit still long enough to land.
  assert.ok(dwell[dwell.length - 1] >= 2 * dwell[0], "the replay does not slow down at the end");
});

test("best-so-far only ever climbs", () => {
  const found = search(base, 5, seeded(3));
  let last = -Infinity;
  for (let k = 0; k < FRAMES; k++) {
    const f = frameAt(found, k / (FRAMES - 1));
    // The final frame jumps to the winner, which is the highest of all.
    assert.ok(f.best >= last, `best went backwards at frame ${k}`);
    last = f.best;
  }
  assert.equal(last, found.score);
});

test("locked colours survive every candidate, so the replay never flickers them", () => {
  const locked = [
    swatch(fromHex("#0d1b2a")!, "user", true),
    swatch(fromHex("#f4a9be")!, "user", true),
  ];
  const found = search(locked, 5, seeded(19));
  for (const candidate of found.trail)
    for (const anchor of locked)
      assert.ok(
        candidate.some(
          (c) =>
            Math.abs(c.l - anchor.color.l) < 1e-9 && Math.abs(c.c - anchor.color.c) < 1e-9,
        ),
        "a locked colour went missing from a candidate",
      );
});
