import test from "node:test";
import assert from "node:assert/strict";
import { contrast, fromHex, toHex } from "./color.ts";
import { LIBRARY } from "./library.ts";
import { MATRICES, type Vision, collapses, feMatrix, review, separation, simulate } from "./vision.ts";

const MODES: Exclude<Vision, "normal">[] = ["deuteranopia", "protanopia", "tritanopia"];

test("a grey is a grey to every eye", () => {
  // The transforms are built around the achromatic axis; anything that moves a
  // neutral has been applied in the wrong colour space, which is the usual way
  // these matrices get pasted into a project wrong.
  for (const hex of ["#000000", "#404040", "#808080", "#c0c0c0", "#ffffff"])
    for (const v of MODES) {
      const before = fromHex(hex)!;
      const after = simulate(before, v);
      assert.ok(
        Math.abs(before.l - after.l) < 0.01 && after.c < 0.012,
        `${hex} under ${v} came back as ${toHex(after)}`,
      );
    }
});

test("normal vision is the identity", () => {
  for (const p of LIBRARY)
    for (const hex of p.colors) {
      const c = fromHex(hex)!;
      assert.equal(simulate(c, "normal"), c);
    }
});

test("red and green stop being different colours to a deuteranope", () => {
  const red = fromHex("#c83c3c")!;
  const green = fromHex("#3c9628")!;
  assert.ok(separation(red, green) > 0.09, "these are obviously different to start with");
  assert.ok(
    collapses(red, green, "deuteranopia"),
    `they still separate by ${separation(simulate(red, "deuteranopia"), simulate(green, "deuteranopia")).toFixed(3)}`,
  );
  // Blue against yellow is the pair a red-green deficiency leaves alone.
  assert.equal(collapses(fromHex("#1a4fd6")!, fromHex("#e8c020")!, "deuteranopia"), false);
});

test("contrast is not preserved, and the tool must not claim it is", () => {
  // This assumption is what the feature was originally specified on, and it is
  // wrong. If a future change makes it true, this test should be the thing that
  // notices — the status line's wording depends on the drift being real.
  let worst = 0;
  let lost = 0;
  for (const p of LIBRARY) {
    const cs = p.colors.map((h) => fromHex(h)!);
    const r = review(cs, "protanopia");
    worst = Math.max(worst, r.drift);
    lost += r.dropped;
  }
  assert.ok(worst > 0.2, `protanopia moved ratios by only ${(worst * 100).toFixed(1)}%`);
  assert.ok(lost > 0, "no shelf palette lost an AA pass under protanopia");
});

test("review agrees with contrast() computed the long way", () => {
  const cs = LIBRARY[0].colors.map((h) => fromHex(h)!);
  for (const v of MODES) {
    const r = review(cs, v);
    for (let a = 0; a < cs.length; a++)
      for (let b = 0; b < cs.length; b++)
        assert.equal(r.seen[a][b], contrast(simulate(cs[a], v), simulate(cs[b], v)));
  }
});

test("the SVG filter is fed the same numbers as the JS", () => {
  for (const v of MODES) {
    const values = feMatrix(MATRICES[v]).split(" ").map(Number);
    assert.equal(values.length, 20);
    // Row-major 4x5, alpha untouched.
    assert.deepEqual(values.slice(0, 3), MATRICES[v].slice(0, 3));
    assert.deepEqual(values.slice(5, 8), MATRICES[v].slice(3, 6));
    assert.deepEqual(values.slice(10, 13), MATRICES[v].slice(6, 9));
    assert.deepEqual(values.slice(15), [0, 0, 0, 1, 0]);
  }
});
