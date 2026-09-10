import {
  type Oklch,
  type Rgb,
  contrast,
  oklchToRgb,
  rgbToOklch,
  toGamma,
  toLinear,
} from "./color.ts";

/**
 * Colour vision deficiency, simulated.
 *
 * The story page has been promising this for a while, and it turns out to
 * catch two different things rather than the one it was designed for.
 *
 * The expected one: WCAG contrast is a luminance ratio, and dichromacy mostly
 * collapses a plane of the colour space rather than changing brightness. So a
 * palette can pass every ratio in the matrix and still have two swatches that
 * eight percent of men cannot tell apart. That is `collapses`.
 *
 * The one that was assumed away, and is not true: ratios do *not* simply hold.
 * Swept over the seventy shelf palettes, protanopia moves some pairs by 57%
 * and drops seven of them out of AA outright — reds are where the protan
 * transform takes the most luminance, and a red-on-dark pair that measures
 * 4.6:1 can be seen at 3.9:1. So the tool reports the drift as well, and the
 * status line does not get to say "every ratio holds" unless it does.
 *
 * Either way this is a check no competitor makes: Huemint does not check
 * accessibility at all, and Coolors tests pairs in isolation, which cannot see
 * either failure.
 *
 * The transforms are Machado, Oliveira and Fernandes (2009) at full severity,
 * which is the set browsers' own accessibility tooling uses. They are defined
 * on *linear* RGB — applying them to gamma-encoded values, which is the usual
 * mistake in CSS filter recipes, gives visibly wrong colours.
 *
 * Two consumers, one source of truth: `MATRICES` is handed straight to an SVG
 * `feColorMatrix` so the browser can repaint the entire studio through it for
 * free, and `simulate` runs the same numbers in JS so the matrix tile can say
 * *which* pairs collapsed.
 */

export type Vision = "normal" | "deuteranopia" | "protanopia" | "tritanopia";

export const VISIONS: { id: Vision; label: string; short: string; note: string }[] = [
  { id: "normal", label: "Normal", short: "Normal", note: "unsimulated" },
  {
    id: "deuteranopia",
    label: "Deuteranopia",
    short: "Deuter",
    note: "no green cone · about 1 in 16 men",
  },
  {
    id: "protanopia",
    label: "Protanopia",
    short: "Protan",
    note: "no red cone · about 1 in 100 men",
  },
  {
    id: "tritanopia",
    label: "Tritanopia",
    short: "Tritan",
    note: "no blue cone · about 1 in 10,000, and not sex-linked",
  },
];

/** Row-major 3×3, operating on linear sRGB. */
export const MATRICES: Record<Exclude<Vision, "normal">, number[]> = {
  protanopia: [
    0.152286, 1.052583, -0.204868,
    0.114503, 0.786281, 0.099216,
    -0.003882, -0.048116, 1.051998,
  ],
  deuteranopia: [
    0.367322, 0.860646, -0.227968,
    0.280085, 0.672501, 0.047413,
    -0.01182, 0.04294, 0.968881,
  ],
  tritanopia: [
    1.255528, -0.076749, -0.178779,
    -0.078411, 0.930809, 0.147602,
    0.004733, 0.691367, 0.3039,
  ],
};

/**
 * The same matrix as an SVG `feColorMatrix` value: 4×5, alpha untouched.
 * Emitted rather than hand-written so the two paths can never drift.
 */
export const feMatrix = (m: number[]): string =>
  [
    m[0], m[1], m[2], 0, 0,
    m[3], m[4], m[5], 0, 0,
    m[6], m[7], m[8], 0, 0,
    0, 0, 0, 1, 0,
  ].join(" ");

const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Run one colour through the transform. Round-trips via linear sRGB. */
export function simulate(color: Oklch, vision: Vision): Oklch {
  if (vision === "normal") return color;
  const m = MATRICES[vision];
  const { r, g, b } = oklchToRgb(color);
  const [lr, lg, lb] = [toLinear(clamp(r)), toLinear(clamp(g)), toLinear(clamp(b))];
  const out: Rgb = {
    r: toGamma(clamp(m[0] * lr + m[1] * lg + m[2] * lb)),
    g: toGamma(clamp(m[3] * lr + m[4] * lg + m[5] * lb)),
    b: toGamma(clamp(m[6] * lr + m[7] * lg + m[8] * lb)),
  };
  return rgbToOklch(out);
}

/**
 * Perceptual distance between two colours, in OKLab. Roughly: below 0.05 two
 * swatches side by side read as the same colour, above 0.10 nobody would
 * confuse them.
 */
export function separation(a: Oklch, b: Oklch): number {
  const rad = (h: number) => (h * Math.PI) / 180;
  const [ax, ay] = [a.c * Math.cos(rad(a.h)), a.c * Math.sin(rad(a.h))];
  const [bx, by] = [b.c * Math.cos(rad(b.h)), b.c * Math.sin(rad(b.h))];
  return Math.hypot(a.l - b.l, ax - bx, ay - by);
}

export const COLLAPSED = 0.055;
export const DISTINCT = 0.09;

/**
 * True when two colours are clearly different to normal vision and effectively
 * the same under this simulation. This is the warning the matrix grows: not
 * "this pair fails contrast", which the ratio already said, but "this pair
 * passes contrast and is still the wrong choice".
 */
export function collapses(a: Oklch, b: Oklch, vision: Vision): boolean {
  if (vision === "normal") return false;
  return (
    separation(a, b) > DISTINCT &&
    separation(simulate(a, vision), simulate(b, vision)) < COLLAPSED
  );
}


// ---------------------------------------------------------------------------
// What a simulation costs a palette
// ---------------------------------------------------------------------------

export type Review = {
  /** Pairs that are plainly different colours and become the same one. */
  collapsed: number;
  /** Pairs that clear AA as measured and do not clear it as seen. */
  dropped: number;
  /** Largest relative change in any pair's contrast ratio, 0..1. */
  drift: number;
  /** Contrast between each pair as this eye would see it. */
  seen: number[][];
};

/**
 * Run the whole palette through one transform and report what it cost.
 *
 * Both failures are counted separately because they need different fixes:
 * a collapsed pair wants more lightness or hue separation between two colours
 * that are currently distinguished by the channel this eye does not have, and
 * a dropped pair wants more lightness, full stop.
 */
export function review(colors: Oklch[], vision: Vision): Review {
  const seen = colors.map((a) =>
    colors.map((b) => contrast(simulate(a, vision), simulate(b, vision))),
  );
  if (vision === "normal") return { collapsed: 0, dropped: 0, drift: 0, seen };

  let collapsed = 0;
  let dropped = 0;
  let drift = 0;
  for (let a = 0; a < colors.length; a++)
    for (let b = a + 1; b < colors.length; b++) {
      if (collapses(colors[a], colors[b], vision)) collapsed++;
      const real = contrast(colors[a], colors[b]);
      if (real >= 4.5 && seen[a][b] < 4.5) dropped++;
      drift = Math.max(drift, Math.abs(seen[a][b] - real) / real);
    }
  return { collapsed, dropped, drift, seen };
}
