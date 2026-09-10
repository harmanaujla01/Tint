import test from "node:test";
import assert from "node:assert/strict";
import { fromHex, toHex } from "./color.ts";
import { swatch } from "./harmony.ts";
import { decode, encode } from "./share.ts";

const build = (hexes: string[], locks: boolean[] = []) =>
  hexes.map((h, i) => swatch(fromHex(h)!, "library", locks[i] ?? false));

test("a palette survives the round trip, locks and all", () => {
  const original = build(["#fff1f3", "#f4a9be", "#7a4a5c"], [false, true, false]);
  const back = decode(`#/studio?${encode(original, "Blush Hour")}`);

  assert.ok(back);
  assert.equal(back.name, "Blush Hour");
  assert.equal(back.palette.length, 3);
  original.forEach((s, i) => {
    assert.equal(toHex(back.palette[i].color), toHex(s.color));
    assert.equal(back.palette[i].locked, s.locked);
  });
});

test("a shared palette arrives as the recipient's own, not as the generator's", () => {
  const back = decode(`#/studio?${encode(build(["#0d1b2a", "#e0e1dd"]), "")}`);
  assert.ok(back);
  assert.equal(back.name, null);
  for (const s of back.palette) assert.equal(s.origin, "user");
});

test("names with spaces and punctuation come back intact", () => {
  for (const name of ["Blush Hour", "50% grey & co", "cafe/atelier", "a+b"]) {
    const back = decode(`#/studio?${encode(build(["#111111", "#eeeeee"]), name)}`);
    assert.equal(back?.name, name, `mangled: ${name}`);
  }
});

test("anything it cannot fully read is refused rather than half-loaded", () => {
  for (const hash of [
    "#/studio",                          // no query at all
    "#/studio?n=only-a-name",            // no palette
    "#/studio?p=",                       // empty palette
    "#/studio?p=fff1f3-nothex-7a4a5c",   // one bad colour
    "#/studio?p=fff1f3",                 // a single colour is not a palette
    "#/studio?p=!zzzzzz",                // locked and unreadable
  ])
    assert.equal(decode(hash), null, `should have refused: ${hash}`);
});

test("three-digit hexes are read, and normalise on the way out", () => {
  const back = decode("#/studio?p=fff-!08f");
  assert.ok(back);
  assert.equal(toHex(back.palette[0].color), "#ffffff");
  assert.equal(toHex(back.palette[1].color), "#0088ff");
  assert.equal(back.palette[1].locked, true);
  assert.equal(encode(back.palette, ""), "p=ffffff-!0088ff");
});
