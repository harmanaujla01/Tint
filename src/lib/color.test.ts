import { test } from "node:test";
import assert from "node:assert/strict";
import {
  oklchToRgb, rgbToOklch, contrast, luminance, deriveInk,
  ramp, clampToGamut, inGamut, grade, toHex, toCss, fromHex,
} from "./color.ts";
import type { Oklch } from "./color.ts";

const close = (a: number, b: number, eps = 1e-3) =>
  assert.ok(Math.abs(a - b) < eps, `${a} !~ ${b}`);

test("sRGB anchors convert to known OKLCH values", () => {
  const white = rgbToOklch({ r: 1, g: 1, b: 1 });
  close(white.l, 1); close(white.c, 0);
  const black = rgbToOklch({ r: 0, g: 0, b: 0 });
  close(black.l, 0); close(black.c, 0);
});

test("oklch <-> rgb round-trips", () => {
  for (const rgb of [
    { r: 0.2, g: 0.6, b: 0.9 }, { r: 0.94, g: 0.78, b: 0.81 },
    { r: 0.05, g: 0.05, b: 0.06 }, { r: 1, g: 0.5, b: 0 },
  ]) {
    const back = oklchToRgb(rgbToOklch(rgb));
    close(back.r, rgb.r); close(back.g, rgb.g); close(back.b, rgb.b);
  }
});

test("contrast matches WCAG reference values", () => {
  const white = rgbToOklch({ r: 1, g: 1, b: 1 });
  const black = rgbToOklch({ r: 0, g: 0, b: 0 });
  close(contrast(black, white), 21, 0.01);
  close(contrast(white, white), 1, 0.01);
  // symmetric
  close(contrast(black, white), contrast(white, black), 1e-9);
  // #767676 on white is the canonical 4.54:1 "just passes AA" grey
  close(contrast(fromHex("#767676")!, white), 4.54, 0.02);
});

test("grade applies the right thresholds", () => {
  assert.equal(grade(7.1), "AAA");
  assert.equal(grade(4.5), "AA");
  assert.equal(grade(3.2), "AA Large");
  assert.equal(grade(2.9), "Fail");
  assert.equal(grade(4.5, true), "AAA");
});

test("deriveInk always reaches AA - across the whole gamut", () => {
  let worst = Infinity;
  for (let h = 0; h < 360; h += 7) {
    for (let l = 0.02; l <= 1; l += 0.04) {
      for (const c of [0, 0.05, 0.12, 0.25]) {
        const surface = clampToGamut({ l, c, h });
        const ratio = contrast(deriveInk(surface), surface);
        worst = Math.min(worst, ratio);
        assert.ok(ratio >= 4.5 - 1e-3,
          `${ratio.toFixed(3)}:1 at l=${l.toFixed(2)} c=${c} h=${h}`);
      }
    }
  }
  // The theoretical floor is 4.58:1 (black-or-white at luminance ~0.179).
  assert.ok(worst >= 4.5 && worst < 5.2, `worst case was ${worst.toFixed(3)}`);
});

test("deriveInk keeps ink soft, not slammed to pure black", () => {
  const pale = fromHex("#fdf2f4")!; // pale rose surface
  const ink = deriveInk(pale);
  assert.ok(ink.l > 0.05, "ink should not bottom out at pure black on a pale surface");
  assert.ok(contrast(ink, pale) >= 4.5);
});

test("ramp is 11 in-gamut steps, monotonically darkening", () => {
  const steps = ramp({ l: 0.7, c: 0.18, h: 350 });
  assert.equal(steps.length, 11);
  for (const s of steps) assert.ok(inGamut(oklchToRgb(s)), "step left sRGB");
  for (let i = 1; i < steps.length; i++)
    assert.ok(steps[i].l < steps[i - 1].l, "lightness must decrease");
});

test("ramp holds hue while trading chroma", () => {
  const steps = ramp({ l: 0.7, c: 0.3, h: 180 });
  for (const s of steps) if (s.c > 1e-4) close(s.h, 180, 0.5);
});

test("clampToGamut only reduces chroma", () => {
  const wild = { l: 0.5, c: 0.9, h: 140 };
  const fixed = clampToGamut(wild);
  assert.ok(inGamut(oklchToRgb(fixed)));
  assert.ok(fixed.c < wild.c);
  close(fixed.l, wild.l); close(fixed.h, wild.h);
});

test("hex parsing handles shorthand, case, and junk", () => {
  close(luminance(oklchToRgb(fromHex("#FFF")!)), 1, 1e-3);
  assert.equal(toHex(fromHex("#b7d4ff")!), "#b7d4ff");
  assert.equal(toHex(fromHex("abc")!), "#aabbcc");
  for (const bad of ["", "#12", "#gggggg", "not a colour", "#1234567"])
    assert.equal(fromHex(bad), null, `should reject ${JSON.stringify(bad)}`);
});

test("the colour that ships is the colour that was verified", () => {
  // The in-memory result passing is not the guarantee that matters: CSS
  // rounds, and a ratio solved to exactly 4.500 can round below it. Parse
  // deriveInk's output back out of its own serialised form and re-check.
  const parse = (css: string): Oklch => {
    const [l, c, h] = css.match(/[\d.]+/g)!.map(Number);
    return { l, c, h };
  };

  let worst = Infinity;
  let worstAt = "";

  for (let h = 0; h < 360; h += 11) {
    for (let l = 0.05; l <= 0.98; l += 0.05) {
      for (const c of [0, 0.06, 0.14, 0.26]) {
        const surface = clampToGamut({ l, c, h });
        for (const target of [4.5, 7]) {
          // 7:1 is not always reachable; only judge the ones that claim to be.
          const ink = deriveInk(surface, target);
          if (contrast(ink, surface) < target) continue;

          const shipped = parse(toCss(ink));
          const ratio = contrast(shipped, surface);
          if (ratio / target < worst) {
            worst = ratio / target;
            worstAt = `${toCss(surface)} @ ${target}`;
          }
          assert.ok(
            ratio >= target,
            `serialised ink fails: ${toCss(ink)} on ${toCss(surface)} = ${ratio.toFixed(4)}, needed ${target}`,
          );
        }
      }
    }
  }

  assert.ok(worst >= 1, `worst shipped/target ratio was ${worst} at ${worstAt}`);
});
