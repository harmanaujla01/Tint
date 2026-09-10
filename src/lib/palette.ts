import {
  type Oklch,
  clampToGamut,
  contrastFloor,
  deriveInk,
  luminance,
  oklchToRgb,
  ramp,
  toCss,
  toHex,
} from "./color.ts";

/**
 * The chrome the app wears. Every colour here is *derived* from the user's
 * seed at runtime — there is no hardcoded foreground anywhere in the app.
 * That is the whole architectural bet: if deriveInk is correct, the interface
 * stays legible against any seed a user can type. If it is wrong, you can see
 * it immediately, because the app itself breaks.
 */
export type Chrome = {
  bg: Oklch;
  surface: Oklch;
  bench: Oklch;
  line: Oklch;
  ink: Oklch;
  muted: Oklch;
  accent: Oklch;
  accentInk: Oklch;
  /** Which way round this chrome was solved. Only the browser's own widgets care. */
  dark: boolean;
};

/** Trace of the seed's hue, nowhere near enough chroma to compete with it. */
/**
 * A ground at a fixed lightness, carrying a trace of a colour's hue.
 *
 * Exported because the case-study track needs the same guarantee the chrome
 * does: whatever colour goes in, the lightness that comes out is the one asked
 * for, so every ink already solved against that lightness still holds. Mixing a
 * palette colour into the ground instead moves the lightness with it — the
 * first version of the track's far wall did exactly that and put `--muted` at
 * 3.76:1 on the darkest field.
 */
export const tint = (l: number, seed: Oklch, factor: number, ceiling: number): Oklch =>
  clampToGamut({ l, c: Math.min(seed.c * factor, ceiling), h: seed.h });

/** How much of a colour's chroma the case-study's far wall carries, and its cap. */
export const WALL_CHROMA = 0.5;
export const WALL_CEILING = 0.014;

/**
 * One field of the case-study track's far wall: the ground wearing a palette
 * colour's hue, and never one step darker than the ground itself.
 *
 * The lightness pin is not enough on its own. `--muted` is `deriveInk(ground,
 * 4.5)`, which by construction sits *exactly* on 4.5:1 — so any luminance loss
 * at all is an AA failure, and chroma costs a little luminance even at a fixed
 * perceptual lightness. Holding `l` steady got Blush Hour to 4.490. The fix is
 * to give the luminance back in lightness: nudge upward until the field is at
 * least as bright as the ground, which makes every dark ink already solved
 * against the ground strictly safer on the wall rather than marginally worse.
 */
export function wallField(ground: Oklch, seed: Oklch): Oklch {
  const bright = (c: Oklch) => luminance(oklchToRgb(c));
  const floor = bright(ground);
  for (let l = ground.l; l <= 1; l += 0.004) {
    const field = tint(l, seed, WALL_CHROMA, WALL_CEILING);
    if (bright(field) >= floor) return field;
  }
  return ground;
}

export function buildChrome(seed: Oklch, dark = false): Chrome {
  // The gap between bg and surface is what makes the bento read as cut
  // paper rather than one flat field. Too close and the tiles disappear.
  //
  // The chroma ceilings are the point of this block. An earlier set let the
  // ground carry up to 0.019 chroma, which at this lightness is not a tint —
  // it is a colour, and it covered the entire screen. Two things went wrong
  // with that. It broke the system's own restraint rule ("the user's palette
  // must be the only saturated thing in view"), so a pink palette produced a
  // pink page and the swatches had nothing to be judged against. And a full
  // screen held a couple of percent off neutral is the specific thing that
  // reads as tiring rather than as warm. The hue is still there — a rose
  // palette still makes a page that is measurably rose — it is now a trace
  // rather than a wash.
  //
  // The dark ground is the same three tints read from the other end, and the
  // ceilings are raised a little because chroma reads far quieter against a
  // dark surface than a pale one: 0.0055 on near-white is a visible blush,
  // and on near-black it is nothing at all. `deriveInk` needs no dark branch —
  // it already decides which way to travel from the surface's own luminance,
  // so the same call that darkens ink on paper lightens it here.
  const bg = dark
    ? tint(0.188, seed, 0.14, 0.014)
    : tint(0.964, seed, 0.05, 0.0055);
  const surface = dark
    ? tint(0.232, seed, 0.11, 0.012)
    : tint(0.998, seed, 0.02, 0.003);
  const line = dark
    ? tint(0.345, seed, 0.16, 0.02)
    : tint(0.885, seed, 0.07, 0.011);

  // An accent has to survive as a button fill, so its lightness is pinned
  // into the band where a saturated colour still reads as an action.
  const accent = clampToGamut({
    l: Math.min(0.62, Math.max(0.45, seed.l)),
    c: Math.max(seed.c, 0.06),
    h: seed.h,
  });

  /**
   * Solve ink against the harder of the two grounds it will actually sit on.
   *
   * Which one that is flips with the theme, and getting it wrong is invisible
   * in the numbers and obvious on the page. On paper the tiles are *lighter*
   * than the ground, so dark ink is hardest to read on the ground and solving
   * against `bg` covers everything. Turn it over and the tiles are still
   * lighter than the ground, but the ink is now light too — so the tiles are
   * the hard case and solving against `bg` leaves every tile label short.
   *
   * That is not hypothetical: it shipped, and `scripts/audit-contrast.js`
   * found twenty elements at 4.18:1 against a 4.5 requirement on the first
   * dark render. Rather than branch on `dark` and invite the same mistake
   * again, both candidates are solved for and the one that holds up on both
   * grounds wins. On paper it picks the same colour it always did.
   */
  const onBoth = (target: number): Oklch => {
    const holds = (ink: Oklch) =>
      Math.min(contrastFloor(ink, bg), contrastFloor(ink, surface));
    const [a, b] = [deriveInk(bg, target), deriveInk(surface, target)];
    return holds(a) >= holds(b) ? a : b;
  };

  return {
    bg,
    surface,
    // The Neutral Bench Rule: chroma 0. Colour is judged against nothing.
    // Which end of the scale the bench sits at follows the ground; that it
    // carries no hue at all does not.
    bench: { l: dark ? 0.155 : 0.995, c: 0, h: 0 },
    line,
    // Headings get room to spare; muted is the *softest* ink that still
    // clears AA, so the quietest text on the page is provably 4.5:1.
    ink: onBoth(9),
    muted: onBoth(4.5),
    accent,
    accentInk: deriveInk(accent, 4.5),
    dark,
  };
}

export function applyChrome(chrome: Chrome) {
  const root = document.documentElement.style;
  root.setProperty("--bg", toCss(chrome.bg));
  root.setProperty("--surface", toCss(chrome.surface));
  root.setProperty("--bench", toCss(chrome.bench));
  root.setProperty("--line", toCss(chrome.line));
  root.setProperty("--ink", toCss(chrome.ink));
  root.setProperty("--muted", toCss(chrome.muted));
  root.setProperty("--accent", toCss(chrome.accent));
  root.setProperty("--accent-ink", toCss(chrome.accentInk));
  // So scrollbars, form controls and the canvas behind a short page follow the
  // ground rather than staying stubbornly white under a dark palette.
  root.setProperty("color-scheme", chrome.dark ? "dark" : "light");
}

export const STEP_NAMES = [
  "50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950",
] as const;

// ---------------------------------------------------------------------------
// Token export. Three formats, because three different people ask for it:
// the CSS author, the Tailwind user, and the design-tokens pipeline.
// ---------------------------------------------------------------------------

export type Format = "css" | "tailwind" | "json";

const slugify = (name: string) =>
  name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "brand";

/**
 * Emit the palette, and optionally an eleven-step scale under each colour.
 *
 * The flat palette is what someone pasting into a stylesheet this afternoon
 * wants; the scales are what a design system needs six months later. Both come
 * off the same colours, so the two never drift apart.
 */
export function exportTokens(
  name: string,
  colors: Oklch[],
  format: Format,
  withScales = false,
): string {
  const slug = slugify(name);

  // Entries are [token-name-suffix, colour], flat palette first.
  const entries: [string, Oklch][] = colors.map((c, i) => [`${i + 1}`, c]);
  if (withScales)
    for (const [i, c] of colors.entries())
      for (const [j, step] of ramp(c).entries())
        entries.push([`${i + 1}-${STEP_NAMES[j]}`, step]);

  if (format === "css")
    return `:root {\n${entries
      .map(([k, c]) => `  --${slug}-${k}: ${toCss(c)};`)
      .join("\n")}\n}`;

  if (format === "tailwind")
    return `@theme {\n${entries
      .map(([k, c]) => `  --color-${slug}-${k}: ${toCss(c)};`)
      .join("\n")}\n}`;

  // DTCG — the format Figma Variables and Style Dictionary both read.
  return JSON.stringify(
    {
      [slug]: Object.fromEntries(
        entries.map(([k, c]) => [k, { $value: toHex(c), $type: "color" }]),
      ),
    },
    null,
    2,
  );
}
