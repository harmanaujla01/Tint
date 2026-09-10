import assert from "node:assert/strict";
import { test } from "node:test";
import { fromHex, toHex } from "./color.ts";
import { swatch } from "./harmony.ts";
import { makeSaved, openSaved } from "./shelf.ts";

test("a saved palette reopens to exactly the colours it was saved from", () => {
  const palette = ["#f7e4ea", "#d96c8b", "#392c32"].map((h) =>
    swatch(fromHex(h)!, "user", h === "#d96c8b"),
  );
  const saved = makeSaved(palette, "Blush");
  assert.equal(saved.name, "Blush");

  const back = openSaved(saved);
  assert.ok(back, "a fresh save must reopen");
  assert.deepEqual(
    back!.map((s) => toHex(s.color)),
    palette.map((s) => toHex(s.color)),
  );
  // Lock state is part of what you saved, so it must survive the round trip.
  assert.deepEqual(back!.map((s) => s.locked), palette.map((s) => s.locked));
});

test("a corrupt entry reopens to null instead of throwing", () => {
  assert.equal(openSaved({ id: "x", name: "x", hash: "p=notacolour", savedAt: 0 }), null);
});
