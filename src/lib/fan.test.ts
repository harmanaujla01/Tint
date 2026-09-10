import assert from "node:assert/strict";
import { test } from "node:test";
import { OVERLAP, TURN, bladeAngle } from "./motion.ts";

/**
 * The fan's peeling cascade. Blade `step` 0 leads; every blade behind it is
 * held until the one in front has cleared `OVERLAP` degrees, and then runs its
 * own full revolution. Everything here is the arithmetic that makes that true
 * for any number of petals the palette happens to hold.
 */

const budget = (n: number) => TURN + (n - 1) * OVERLAP;

test("the deck starts and ends as the same neat fan", () => {
  for (const n of [3, 5, 8, 14]) {
    for (let step = 0; step < n; step++) {
      assert.equal(bladeAngle(0, step, n), 0);
      assert.equal(bladeAngle(1, step, n), TURN);
    }
  }
});

test("a blade waits until the one in front of it has cleared the overlap", () => {
  const n = 5;
  for (let step = 1; step < n; step++) {
    // The instant the blade in front has turned exactly `OVERLAP`, this one
    // is still at rest; a hair later it is moving.
    const at = (step * OVERLAP) / budget(n);
    assert.equal(bladeAngle(at, step, n), 0);
    assert.ok(bladeAngle(at + 0.001, step, n) > 0);
  }
});

test("the queue is always in order, and never more than one overlap apart", () => {
  const n = 8;
  for (let s = 0; s <= 1; s += 0.01) {
    for (let step = 1; step < n; step++) {
      const ahead = bladeAngle(s, step - 1, n);
      const behind = bladeAngle(s, step, n);
      assert.ok(ahead >= behind, `blade ${step} overtook the one in front at ${s}`);
      assert.ok(ahead - behind <= OVERLAP + 1e-9);
    }
  }
});

test("every blade turns exactly once, and no blade turns twice", () => {
  for (const n of [3, 5, 8]) {
    for (let step = 0; step < n; step++) {
      for (let s = 0; s <= 1; s += 0.005) {
        const a = bladeAngle(s, step, n);
        assert.ok(a >= 0 && a <= TURN);
      }
      // The lead blade is done well before the deck is, which is the whole
      // point of the stagger — otherwise it is one slab pivoting.
      if (step === 0 && n > 1) assert.equal(bladeAngle(TURN / budget(n), 0, n), TURN);
    }
  }
});

test("progress outside 0..1 is clamped rather than winding the deck round again", () => {
  assert.equal(bladeAngle(-3, 0, 5), 0);
  assert.equal(bladeAngle(9, 4, 5), TURN);
});
