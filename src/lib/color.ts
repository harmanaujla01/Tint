/**
 * Colour engine for Tint.
 *
 * Everything here is deliberately hand-written rather than pulled from a library:
 * the maths *is* the product. Two conversions and one search, nothing else.
 *
 * Colour spaces used:
 *   OKLCH  - what we reason in. Perceptually uniform, so equal steps in L look equal.
 *   sRGB   - what screens accept, and what WCAG defines contrast against.
 */

export type Oklch = { l: number; c: number; h: number };
export type Rgb = { r: number; g: number; b: number }; // 0..1, gamma-encoded sRGB

// ---------------------------------------------------------------------------
// sRGB transfer function
// ---------------------------------------------------------------------------

export const toLinear = (v: number): number =>
  v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);

export const toGamma = (v: number): number =>
  v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;

// ---------------------------------------------------------------------------
// OKLab <-> linear sRGB  (Bjorn Ottosson's matrices)
// ---------------------------------------------------------------------------

export function oklchToRgb({ l, c, h }: Oklch): Rgb {
  const hr = (h * Math.PI) / 180;
  const a = c * Math.cos(hr);
  const b = c * Math.sin(hr);

  // OKLab -> LMS (cube roots), then cube to get LMS
  const L = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const M = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const S = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;

  return {
    r: toGamma(4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S),
    g: toGamma(-1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S),
    b: toGamma(-0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S),
  };
}

export function rgbToOklch({ r, g, b }: Rgb): Oklch {
  const lr = toLinear(r), lg = toLinear(g), lb = toLinear(b);

  const L = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const M = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const S = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

  const l = 0.2104542553 * L + 0.793617785 * M - 0.0040720468 * S;
  const a = 1.9779984951 * L - 2.428592205 * M + 0.4505937099 * S;
  const bb = 0.0259040371 * L + 0.7827717662 * M - 0.808675766 * S;

  const c = Math.hypot(a, bb);
  let h = (Math.atan2(bb, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  // Hue is meaningless at zero chroma; report 0 rather than atan2 noise.
  return { l, c, h: c < 1e-6 ? 0 : h };
}

// ---------------------------------------------------------------------------
// Gamut
// ---------------------------------------------------------------------------

/** True when every channel lands inside sRGB (with a hair of float tolerance). */
export function inGamut({ r, g, b }: Rgb): boolean {
  const ok = (v: number) => v >= -1e-4 && v <= 1 + 1e-4;
  return ok(r) && ok(g) && ok(b);
}

/**
 * Pull chroma down until the colour fits in sRGB, holding lightness and hue.
 *
 * Clipping RGB channels instead would shift both hue and lightness - the whole
 * reason for working in OKLCH is that we can give up exactly one property.
 */
export function clampToGamut(color: Oklch): Oklch {
  if (inGamut(oklchToRgb(color))) return color;

  let lo = 0, hi = color.c;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut(oklchToRgb({ ...color, c: mid }))) lo = mid;
    else hi = mid;
  }
  return { ...color, c: lo };
}

// ---------------------------------------------------------------------------
// WCAG 2.2 contrast
// ---------------------------------------------------------------------------

/**
 * WCAG relative luminance. Note the 0.03928 threshold - it is the spec's, not sRGB's.
 *
 * Channels are rounded to 8 bits first, deliberately. A screen cannot show
 * more than 8 bits per channel, and every contrast checker in use computes
 * from a hex code, so the honest ratio is the one the quantised pixel gives.
 * Measuring on continuous floats instead produces numbers that are off by up
 * to ~0.02 - enough to report 4.50 for a pair that renders at 4.49.
 */
export function luminance({ r, g, b }: Rgb): number {
  const lin = (v: number) => {
    const x = Math.round(Math.min(1, Math.max(0, v)) * 255) / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Contrast ratio between two colours, 1..21. Order-independent. */
export function contrast(a: Oklch, b: Oklch): number {
  const la = luminance(oklchToRgb(a));
  const lb = luminance(oklchToRgb(b));
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Contrast under the worst one-bit rounding the pair could suffer.
 *
 * Renderers are not obliged to round a colour to the same 8-bit value we do -
 * Chrome and this engine disagree by 1/255 on some hues, and at green's 0.72
 * luminance weight that single bit is worth ~0.05 of ratio. Enough to turn a
 * computed 4.51 into a rendered 4.46. Derivations use this floor so the result
 * holds on any renderer; the number shown to the user stays the nominal one,
 * which is what every other contrast checker reports for the same hex.
 */
export function contrastFloor(a: Oklch, b: Oklch): number {
  const ra = oklchToRgb(a);
  const rb = oklchToRgb(b);
  const nudge = (c: Rgb, d: number): Rgb => ({
    r: c.r + d / 255,
    g: c.g + d / 255,
    b: c.b + d / 255,
  });

  // Push the darker colour lighter and the lighter colour darker.
  const [dark, light] =
    luminance(ra) < luminance(rb) ? [ra, rb] : [rb, ra];
  return (luminance(nudge(light, -1)) + 0.05) / (luminance(nudge(dark, 1)) + 0.05);
}

export type WcagLevel = "AAA" | "AA" | "AA Large" | "Fail";

/** Grade a ratio for body text at the given size. */
export function grade(ratio: number, large = false): WcagLevel {
  if (ratio >= (large ? 4.5 : 7)) return "AAA";
  if (ratio >= (large ? 3 : 4.5)) return "AA";
  if (ratio >= 3) return "AA Large";
  return "Fail";
}

// ---------------------------------------------------------------------------
// Ink derivation - the reason nothing in the UI hardcodes a foreground colour
// ---------------------------------------------------------------------------

/**
 * Find a foreground for `surface` that clears `target` contrast.
 *
 * Rather than dropping to pure black or white, this keeps a whisper of the
 * surface's own hue and darkens (or lightens) only as far as it must. Softness
 * is preserved right up to the point where legibility would be spent.
 *
 * Guaranteed to succeed for any target <= 4.58, which is the worst case for
 * black-or-white against an sRGB colour (it occurs at luminance ~0.179).
 */
export function deriveInk(surface: Oklch, target = 4.5): Oklch {
  const tint = Math.min(surface.c, 0.04); // keep a trace of hue, never a cast
  const goDark = luminance(oklchToRgb(surface)) > 0.1791;

  let lo = goDark ? 0 : surface.l;
  let hi = goDark ? surface.l : 1;

  // Bail out to the extreme if even that cannot reach the target.
  const extreme = clampToGamut({ l: goDark ? 0 : 1, c: tint, h: surface.h });
  if (contrastFloor(extreme, surface) < target) return extreme;

  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    const candidate = clampToGamut({ l: mid, c: tint, h: surface.h });
    if (contrastFloor(candidate, surface) >= target) {
      // Still passing - move toward the surface for the softest ink that works.
      if (goDark) lo = mid; else hi = mid;
    } else {
      if (goDark) hi = mid; else lo = mid;
    }
  }

  // A solution sitting exactly on 4.500 is not good enough, because CSS
  // rounds: the colour that ships is not quite the colour we measured, and it
  // can land on the wrong side of the threshold. Every component rounds, not
  // just lightness, so rather than reason about which way each one moves we
  // check the serialised colour itself and step away from the surface until
  // the thing we will actually emit is the thing that passes.
  const solved = goDark ? lo : hi;
  let l = goDark
    ? Math.floor(solved / L_STEP) * L_STEP
    : Math.ceil(solved / L_STEP) * L_STEP;

  while (l >= 0 && l <= 1) {
    const shipped = quantise(clampToGamut({ l, c: tint, h: surface.h }));
    if (contrastFloor(shipped, quantise(surface)) >= target) return shipped;
    l += goDark ? -L_STEP : L_STEP;
  }
  return quantise(extreme);
}

// ---------------------------------------------------------------------------
// Ramp
// ---------------------------------------------------------------------------

/** Lightness stops, light to dark. Tighter at the pale end, where UI surfaces live. */
const STOPS = [0.97, 0.94, 0.89, 0.82, 0.74, 0.66, 0.58, 0.5, 0.41, 0.31, 0.21];

/**
 * Expand one seed into an 11-step scale.
 *
 * Chroma follows an arc that peaks near the middle: the sRGB gamut pinches at
 * both ends, so holding the seed's chroma flat would blow out the extremes and
 * clamping would flatten them into grey. The arc keeps every step vivid for its
 * own lightness.
 */
export function ramp(seed: Oklch): Oklch[] {
  return STOPS.map((l) => {
    const arc = Math.sin(Math.PI * (1 - l) ** 0.85);
    return clampToGamut({ l, c: seed.c * (0.35 + 0.65 * arc), h: seed.h });
  });
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export const toHex = (color: Oklch): string => {
  const { r, g, b } = oklchToRgb(color);
  const ch = (v: number) =>
    Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, "0");
  return `#${ch(r)}${ch(g)}${ch(b)}`;
};

/**
 * Precision of the CSS we emit. deriveInk rounds to this same grid, so the
 * ratio reported next to a colour is the ratio of the colour that ships.
 */
export const L_PLACES = 4;
export const L_STEP = 10 ** -L_PLACES;

const round = (v: number, places: number) => {
  const f = 10 ** places;
  return Math.round(v * f) / f;
};

/** Snap a colour onto the grid toCss can actually represent. */
export const quantise = ({ l, c, h }: Oklch): Oklch => ({
  l: round(l, L_PLACES),
  c: round(c, L_PLACES),
  h: round(h, 2),
});

export const toCss = ({ l, c, h }: Oklch): string =>
  `oklch(${l.toFixed(L_PLACES)} ${c.toFixed(L_PLACES)} ${h.toFixed(2)})`;

export function fromHex(hex: string): Oklch | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const s = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1];
  return rgbToOklch({
    r: parseInt(s.slice(0, 2), 16) / 255,
    g: parseInt(s.slice(2, 4), 16) / 255,
    b: parseInt(s.slice(4, 6), 16) / 255,
  });
}
