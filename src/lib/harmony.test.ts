import assert from "node:assert/strict";
import { test } from "node:test";
import { contrast, fromHex, toHex } from "./color.ts";
import {
  critique,
  directions,
  generate,
  hueGap,
  paletteRoles,
  regenerate,
  swatch,
} from "./harmony.ts";
import { LIBRARY, parseColors, searchMood } from "./library.ts";

// A seeded generator, so a failure is reproducible rather than a coin flip.
const seeded = (n: number) => () => {
  n = (n * 1664525 + 1013904223) % 4294967296;
  return n / 4294967296;
};

test("hueGap wraps the circle", () => {
  assert.equal(hueGap(10, 350), 20);
  assert.equal(hueGap(0, 180), 180);
  assert.equal(hueGap(200, 200), 0);
});

test("generate honours every locked colour, exactly", () => {
  const mine = fromHex("#e8a0b4")!;
  const other = fromHex("#3f8f88")!;
  const start = [swatch(mine, "user"), swatch(other, "user")];

  for (let s = 1; s <= 40; s++) {
    const out = generate(start, 5, seeded(s));
    assert.equal(out.length, 5, "returns the requested size");
    for (const anchor of [mine, other])
      assert.ok(
        out.some((w) => toHex(w.color) === toHex(anchor)),
        `seed ${s} dropped ${toHex(anchor)}`,
      );
  }
});

test("generated palettes are ones the critique would accept", () => {
  // The claim the product makes: it does not suggest what it would criticise.
  let worst = 100;
  for (let s = 1; s <= 60; s++) {
    const out = generate([], 5, seeded(s));
    const { score, notes } = critique(out.map((w) => w.color));
    worst = Math.min(worst, score);
    assert.equal(
      notes.filter((n) => n.severity === "bad").length,
      0,
      `seed ${s} scored ${score} with a hard failure`,
    );
  }
  assert.ok(worst >= 70, `worst unseeded palette scored ${worst}, expected >= 70`);
});

test("generate stays usable when the user's own colours are hostile", () => {
  // Five near-identical mid greys: there is no good palette containing all of
  // them, and the tool must still return them all rather than quietly helping.
  const hostile = ["#808080", "#828282", "#7e7e7e"].map(
    (h) => swatch(fromHex(h)!, "user"),
  );
  const out = generate(hostile, 5, seeded(7));
  assert.equal(out.length, 5);
  for (const h of hostile)
    assert.ok(out.some((w) => toHex(w.color) === toHex(h.color)));

  // ...and it must say so.
  const { notes } = critique(out.map((w) => w.color));
  assert.ok(
    notes.some((n) => n.id.startsWith("crowd")),
    "expected the critique to flag the duplicated greys",
  );
});

test("a fix never points at a colour the user locked, if there is any choice", () => {
  const a = fromHex("#808080")!;
  const b = fromHex("#828282")!;
  const colors = [a, b, fromHex("#ffffff")!, fromHex("#101010")!];
  const { notes } = critique(colors, [true, false, false, false]);
  const crowd = notes.find((n) => n.id.startsWith("crowd"));
  assert.ok(crowd, "expected a crowding note");
  assert.ok(crowd.replace, "expected a fix");
  assert.ok(!crowd.replace.includes(0), "fix aimed at the locked swatch");
});

test("a locked-solid palette still gets offered a way out", () => {
  // Every swatch is the user's own. Withholding the fix would not protect
  // their colours, it would just leave them stuck with a palette scoring 0 —
  // so a fix is still offered, and the UI labels it "Replace anyway".
  const colors = ["#808080", "#828282", "#7c7c7c", "#86867f"].map((h) => fromHex(h)!);
  const { score, notes } = critique(colors, [true, true, true, true]);

  assert.ok(score < 30, `expected a low score, got ${score}`);
  const problems = notes.filter((n) => n.severity !== "good");
  assert.ok(problems.length > 0, "expected problems");
  assert.ok(
    problems.every((n) => n.replace && n.replace.length > 0),
    "every problem must offer a fix, even when everything is locked",
  );
});

test("regenerate replaces only the named slots", () => {
  const start = generate([], 5, seeded(3));
  const kept = start.filter((_, i) => i !== 2).map((w) => toHex(w.color));
  const out = regenerate(start, [2], seeded(9));

  assert.equal(out.length, 5);
  for (const hex of kept)
    assert.ok(out.some((w) => toHex(w.color) === hex), `lost ${hex}`);
});

test("critique catches the flat palette", () => {
  const flat = ["#c0c0c0", "#c4c0c8", "#bcc4c0", "#c8c4bc"].map((h) => fromHex(h)!);
  const { score, notes } = critique(flat);
  assert.ok(score < 55, `flat palette scored ${score}`);
  assert.ok(notes.some((n) => n.id === "spread" && n.severity !== "good"));
});

test("paletteRoles reports honestly when the palette cannot supply its own text", () => {
  // All light: nothing in here is dark enough to be body copy on the lightest.
  const pale = ["#ffffff", "#fdf2f4", "#fbe6ea", "#f8dade"].map((h) => fromHex(h)!);
  const roles = paletteRoles(pale);
  assert.equal(roles.bodyFromPalette, false);
  assert.ok(contrast(roles.body, roles.surface) >= 4.5, "derived ink must still pass");

  const full = ["#ffffff", "#f0d9c6", "#a9683f", "#2a1a10"].map((h) => fromHex(h)!);
  assert.equal(paletteRoles(full).bodyFromPalette, true);
});

test("every shelf palette is well-formed and distinct", () => {
  const names = new Set<string>();
  for (const p of LIBRARY) {
    assert.equal(p.colors.length, 5, `${p.name} is not five colours`);
    assert.ok(!names.has(p.name), `duplicate palette name ${p.name}`);
    names.add(p.name);
    assert.ok(p.tags.length >= 3, `${p.name} is under-tagged`);
    for (const hex of p.colors)
      assert.ok(fromHex(hex), `${p.name} has an unparseable colour ${hex}`);
  }
});

test("mood search finds the obvious thing and admits a miss", () => {
  assert.ok(
    searchMood("something calm and coastal")
      .slice(0, 4)
      .some((p) => p.tags.includes("coastal")),
  );
  assert.ok(searchMood("spooky halloween").some((p) => p.tags.includes("dark")));
  assert.ok(searchMood("luxury brand").some((p) => p.tags.includes("luxury")));
  // Nouns and British spellings, because that is what people actually type.
  assert.ok(searchMood("cosy bakery").some((p) => p.tags.includes("cozy")));
  assert.ok(searchMood("skincare brand").some((p) => p.tags.includes("soft")));
  assert.deepEqual(searchMood("qqq zzz"), [], "a miss must return nothing");
});

test("parseColors reads real paste-ins and refuses prose", () => {
  assert.equal(parseColors("#ff0000, #00ff00").length, 2);
  assert.equal(parseColors("--brand: #e8a0b4; --alt: rgb(63, 143, 136);").length, 2);
  assert.equal(parseColors("e8a0b4 3f8f88 c2714f").length, 3);
  // "facade" and "decade" are valid six-digit hex. They are not colours here.
  assert.deepEqual(parseColors("a facade for the decade"), []);
  assert.equal(parseColors("oklch(0.72 0.11 350)").length, 1);
});

test("intake keeps colours that are nearly, but not quite, the same", () => {
  // The tool must never quietly merge two colours a user typed. If they are
  // redundant that is the critique's job to say, not the parser's to hide.
  const near = parseColors("#808080 #818181 #7f7f7f");
  assert.equal(near.length, 3);
  assert.deepEqual(near.map(toHex), ["#808080", "#818181", "#7f7f7f"]);

  const { notes } = critique(near);
  assert.ok(
    notes.some((n) => n.id.startsWith("crowd")),
    "expected the critique to flag them instead",
  );
});

test("directions returns distinct choices and keeps locks", () => {
  const seed = seeded(7);
  const pinned = swatch(fromHex("#d96c8b")!, "user", true);
  const start = [pinned, swatch(fromHex("#f7e4ea")!, "user", false)];

  const looks = directions(start, 5, 3, seed);
  assert.equal(looks.length, 3, "expected three directions");

  // Genuinely different: no two share the same set of colours.
  const sigs = looks.map((l) => l.palette.map((s) => toHex(s.color)).sort().join());
  assert.equal(new Set(sigs).size, 3, "directions must differ from each other");

  // The pinned colour survives in every direction.
  for (const look of looks)
    assert.ok(
      look.palette.some((s) => toHex(s.color) === "#d96c8b" && s.locked),
      "a locked colour must appear, still locked, in every direction",
    );
});
