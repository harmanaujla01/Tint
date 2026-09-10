import { clamp01, ease, lerp } from "./motion.ts";

/**
 * Geometry for the pinned strip.
 *
 * Pulled out of the component because it is the only part of that section
 * with anything to get wrong, and because a `.tsx` file cannot be imported
 * by the test runner. The two ends of the animation are in different units —
 * chips start as a fixed-size row in the middle of the screen and finish as
 * an even percentage split of it — so each edge is interpolated as a
 * percentage *and* a pixel offset, and the component adds them in `calc()`.
 */

/** The resting chip, in px. */
export const CHIP_W = 44;
export const CHIP_H = 62;
export const CHIP_GAP = 10;
export const CHIP_RADIUS = 10;

/**
 * How far chip `i` is through its own move. Later chips start later, so the
 * columns arrive in order rather than as one block, and every chip still
 * reaches 1 well before the section does.
 *
 * Two numbers here were wrong for a long time, and neither showed up in a
 * test, because the tests only ever checked the two endpoints. Rendering the
 * middle of the scrub is what caught them.
 *
 * `SPREAD` used to be 0.5 — half the whole scrub spent staggering. At any
 * intermediate frame the chips were then at wildly different widths, and
 * since every chip's left edge travels from the centre of the screen to its
 * own column, the leading chips raced left while the trailing ones were still
 * near the middle: the group slid off to the left, overlapped itself, and
 * left a bite of empty page on the right. It read as a bug rather than as a
 * reveal. At 0.12 the chips still arrive in order — you can see the ripple —
 * but they stay a group, and the gaps between them close evenly.
 *
 * `LANDING` exists because the payoff frame needs to be held. With everything
 * finishing exactly at p = 1, the full-bleed columns appeared for one frame
 * at the instant the section unpinned. The last fifth of the scroll is now a
 * hold on the finished picture, which is where the sub-line and the hex
 * labels get their moment.
 */
const SPREAD = 0.12;
const LANDING = 0.8;

export function chipProgress(p: number, i: number, n: number): number {
  const stagger = SPREAD / Math.max(1, n);
  const span = LANDING - stagger * (n - 1);
  return ease(clamp01((p - i * stagger) / span));
}

/**
 * The part of the scrub that happens after the section has pinned, 0..1.
 *
 * The columns are given a runway so they start opening while the section is
 * still rising into view — otherwise the approach to this section is a full
 * viewport of empty page with a row of chips creeping up from the bottom
 * edge. But the sentence, its sub-line and the threshold cue all belong to
 * the *held* frame and must not start until the section is actually pinned,
 * so they run off this remap instead of off raw progress. Doing it as maths
 * rather than as retuned thresholds matters because the size of the runway
 * moves with the viewport and the breakpoint: a hand-picked "start at 0.34"
 * is correct on exactly one screen.
 *
 * `pinAt` is where in that 0..1 the pin falls. At 1 there is no held stretch
 * left to remap onto — a section barely taller than the screen — so progress
 * is handed back untouched rather than divided by zero.
 */
export const afterPin = (p: number, pinAt: number) =>
  pinAt >= 1 ? clamp01(p) : clamp01((p - pinAt) / (1 - pinAt));

export type ChipBox = {
  leftPct: number;
  leftPx: number;
  widthPct: number;
  widthPx: number;
  topPct: number;
  topPx: number;
  heightPct: number;
  heightPx: number;
  radius: number;
};

export function chipBox(i: number, n: number, t: number): ChipBox {
  // Offset of this chip's left edge from the centre of the row, at t = 0.
  const startX = (i - n / 2) * (CHIP_W + CHIP_GAP) + CHIP_GAP / 2;
  return {
    // Both edges start measured from the centre of the box and finish
    // measured from its left edge. Starting this at 0 rather than 50 hangs
    // the resting row off the left of the screen — half of it off-canvas.
    leftPct: lerp(50, (i * 100) / n, t),
    leftPx: lerp(startX, 0, t),
    widthPct: lerp(0, 100 / n, t),
    widthPx: lerp(CHIP_W, 0, t),
    topPct: lerp(50, 0, t),
    topPx: lerp(-CHIP_H / 2, 0, t),
    heightPct: lerp(0, 100, t),
    heightPx: lerp(CHIP_H, 0, t),
    radius: lerp(CHIP_RADIUS, 0, t),
  };
}
