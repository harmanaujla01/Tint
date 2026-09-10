import test from "node:test";
import assert from "node:assert/strict";
import { CHIP_GAP, CHIP_H, CHIP_W, afterPin, chipBox, chipProgress } from "./strip.ts";

/**
 * The strip's only real logic. Everything else in that section is markup, but
 * these numbers decide whether the chips land flush or leave a seam down the
 * middle of the screen at the one moment the page is asking to be looked at.
 */

test("chips rest as a centred row of fixed-size swatches", () => {
  const n = 5;
  const boxes = Array.from({ length: n }, (_, i) => chipBox(i, n, 0));

  for (const b of boxes) {
    assert.equal(b.widthPct, 0);
    assert.equal(b.widthPx, CHIP_W);
    assert.equal(b.heightPct, 0);
    assert.equal(b.heightPx, CHIP_H);
    // Both axes are measured from the centre of the box at rest.
    assert.equal(b.leftPct, 50);
    assert.equal(b.topPct, 50);
    assert.equal(b.topPx, -CHIP_H / 2);
  }

  // The row is centred on the box: its two pixel offsets from the 50% line
  // are equal and opposite, so the same gap sits either side of it.
  const first = boxes[0].leftPx;
  const last = boxes[n - 1].leftPx + CHIP_W;
  assert.ok(Math.abs(first + last) < 1e-9, `row off-centre by ${first + last}`);

  // Consecutive chips are one chip plus one gutter apart.
  for (let i = 1; i < n; i++) {
    assert.equal(boxes[i].leftPx - boxes[i - 1].leftPx, CHIP_W + CHIP_GAP);
  }
});

test("chips finish as an exact edge-to-edge split, with no pixels left over", () => {
  for (const n of [3, 4, 5, 6, 8]) {
    for (let i = 0; i < n; i++) {
      const b = chipBox(i, n, 1);
      // Any leftover pixel term is a visible seam between two columns.
      assert.equal(b.leftPx, 0);
      assert.equal(b.widthPx, 0);
      assert.equal(b.topPx, 0);
      assert.equal(b.heightPx, 0);
      assert.equal(b.radius, 0);

      assert.ok(Math.abs(b.leftPct - (i * 100) / n) < 1e-9);
      assert.ok(Math.abs(b.widthPct - 100 / n) < 1e-9);
      assert.equal(b.topPct, 0);
      assert.equal(b.heightPct, 100);
    }
    // The columns tile the width exactly.
    const lastCol = chipBox(n - 1, n, 1);
    assert.ok(Math.abs(lastCol.leftPct + lastCol.widthPct - 100) < 1e-9);
  }
});

test("every chip is finished by the time the section is", () => {
  for (const n of [3, 5, 8]) {
    for (let i = 0; i < n; i++) {
      assert.equal(chipProgress(0, i, n), 0, `chip ${i} of ${n} starts early`);
      assert.equal(chipProgress(1, i, n), 1, `chip ${i} of ${n} is left unfinished`);
    }
    // Later chips trail earlier ones rather than moving as one block.
    const mid = Array.from({ length: n }, (_, i) => chipProgress(0.5, i, n));
    for (let i = 1; i < n; i++) {
      assert.ok(mid[i] <= mid[i - 1], `chip ${i} of ${n} overtook the one before it`);
    }
    assert.ok(mid[0] > mid[n - 1], `chips of ${n} arrive as one block, not in order`);
  }
});

test("progress never runs backwards or leaves the box", () => {
  const n = 5;
  for (let i = 0; i < n; i++) {
    let prev = -1;
    for (let s = 0; s <= 40; s++) {
      const t = chipProgress(s / 40, i, n);
      assert.ok(t >= 0 && t <= 1, `t=${t} out of range`);
      assert.ok(t >= prev, "progress went backwards");
      prev = t;
    }
  }
});

/**
 * The endpoint tests above both passed while the middle of the scrub was
 * visibly broken: the chips slid left as a ragged clump and overlapped each
 * other. Nothing in a check of t=0 and t=1 can see that. This walks the
 * whole scrub in a box of a known width and asserts the two things that were
 * actually wrong — the row stayed centred, and no chip ever sat on top of
 * its neighbour.
 */
test("the row stays centred and un-overlapped all the way through the scrub", () => {
  const BOX = 1000;
  for (const n of [3, 5, 8]) {
    for (let s = 0; s <= 40; s++) {
      const p = s / 40;
      const edges = Array.from({ length: n }, (_, i) => {
        const b = chipBox(i, n, chipProgress(p, i, n));
        const left = (b.leftPct / 100) * BOX + b.leftPx;
        return [left, left + (b.widthPct / 100) * BOX + b.widthPx];
      });

      // The stagger means neighbours can cross by a hair mid-move. The bound
      // that matters is the resting gutter: anything under it is invisible
      // against chips that are a hundred-odd pixels wide by then, and
      // anything over it is the clump this test exists to catch.
      for (let i = 1; i < n; i++) {
        assert.ok(
          edges[i][0] >= edges[i - 1][1] - CHIP_GAP,
          `n=${n} p=${p.toFixed(2)}: chip ${i} overlaps chip ${i - 1} by ${(edges[i - 1][1] - edges[i][0]).toFixed(1)}px`,
        );
      }

      const centre = (edges[0][0] + edges[n - 1][1]) / 2;
      assert.ok(
        Math.abs(centre - BOX / 2) < BOX * 0.06,
        `n=${n} p=${p.toFixed(2)}: row centre drifted to ${centre.toFixed(0)} of ${BOX}`,
      );
    }
  }
});

test("the held frame's own clock starts at the pin and still ends with the section", () => {
  // The runway's size moves with the viewport and the breakpoint, so the
  // remap has to hold for any of them rather than for one tuned number.
  for (const pinAt of [0, 0.12, 0.234, 0.314, 0.6]) {
    assert.equal(afterPin(pinAt, pinAt), 0, `pinAt=${pinAt}: held clock starts late`);
    assert.equal(afterPin(1, pinAt), 1, `pinAt=${pinAt}: held clock never finishes`);
    // Nothing belonging to the held frame may begin during the approach.
    assert.equal(afterPin(pinAt / 2, pinAt), 0, `pinAt=${pinAt}: held clock ran early`);
  }
});

test("a section with no held stretch left is passed through, not divided by zero", () => {
  for (const p of [0, 0.5, 1]) assert.equal(afterPin(p, 1), p);
  assert.ok(Number.isFinite(afterPin(0.5, 1)));
});
