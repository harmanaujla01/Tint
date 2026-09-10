import {
  type Oklch,
  clampToGamut,
  contrast,
  contrastFloor,
  deriveInk,
  fromHex,
  toHex,
} from "./color.ts";
import { LIBRARY, LIBRARY_COLORS } from "./library.ts";

/**
 * The palette engine: build a palette around whatever the user gave us, then
 * judge it.
 *
 * The important structural choice is that generation and criticism share one
 * scoring function. `critique` is the product's opinion, and `generate` picks
 * the best of ninety candidates *by that same opinion*. So the tool never
 * suggests something it would then complain about, and improving the taste
 * means editing one function rather than two.
 */

export type Origin = "user" | "generated" | "library";
export type Swatch = { color: Oklch; locked: boolean; origin: Origin };
export type Palette = Swatch[];

/** User-supplied colours arrive locked. Nothing of theirs is ever replaced silently. */
export const swatch = (
  color: Oklch,
  origin: Origin = "generated",
  locked = origin === "user",
): Swatch => ({ color, origin, locked });

// ---------------------------------------------------------------------------
// Small geometry helpers
// ---------------------------------------------------------------------------

/** Shortest distance between two hues, 0..180. */
export const hueGap = (a: number, b: number): number => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

/** Interpolate, taking the short way round the hue circle. */
export function mix(a: Oklch, b: Oklch, t: number): Oklch {
  const dh = ((b.h - a.h + 540) % 360) - 180;
  return clampToGamut({
    l: a.l + (b.l - a.l) * t,
    c: a.c + (b.c - a.c) * t,
    h: (a.h + dh * t + 360) % 360,
  });
}

/** The colour carrying the palette's identity: the most saturated one. */
const dominant = (colors: Oklch[]): Oklch =>
  colors.reduce((best, c) => (c.c > best.c ? c : best), colors[0]);

const pick = <T,>(rng: () => number, list: T[]): T =>
  list[Math.floor(rng() * list.length) % list.length];

const between = (rng: () => number, lo: number, hi: number) =>
  lo + rng() * (hi - lo);

// ---------------------------------------------------------------------------
// Harmony
// ---------------------------------------------------------------------------

/**
 * Hue offsets, in the order slots get filled. These are the classical schemes,
 * with the later entries doubling back near earlier ones — a five-colour
 * complementary palette is not five hues 180deg apart, it is two families.
 */
const SCHEMES: Record<string, number[]> = {
  monochrome: [0, 0, 0, 0, 0, 0],
  analogous: [0, 20, -20, 38, -38, 54],
  complement: [0, 180, 14, 194, -16, 166],
  split: [0, 156, 204, 20, 168, 192],
  triad: [0, 120, 240, 16, 136, 256],
  tetrad: [0, 90, 180, 270, 24, 204],
};
const SCHEME_NAMES = Object.keys(SCHEMES);

/** What the scheme is called out loud. The keys are short; these are English. */
const SCHEME_LABELS: Record<string, string> = {
  monochrome: "monochrome",
  analogous: "analogous",
  complement: "complementary",
  split: "split-complement",
  triad: "triadic",
  tetrad: "tetradic",
};

/**
 * Where the lightness slots sit for an n-colour palette.
 *
 * Ends are pulled in from pure paper and pure ink deliberately: a palette
 * whose extremes are #fff and #000 has spent two of its five slots on colours
 * the user already had for free.
 */
function lightnessPlan(n: number): number[] {
  const hi = 0.945;
  const lo = 0.28;
  if (n === 1) return [0.6];
  return Array.from({ length: n }, (_, i) => hi - (hi - lo) * (i / (n - 1)));
}

/**
 * Chroma that a given lightness can actually carry. Same arc the ramp uses —
 * sRGB pinches at both ends, so holding chroma flat blows out the extremes.
 */
const chromaAt = (l: number, base: number) =>
  base * (0.35 + 0.65 * Math.sin(Math.PI * (1 - l) ** 0.85));

type Slot = { color: Oklch; anchor: number | null };

/**
 * One of the ninety. The label is the whole reason this type exists: the
 * generator used to know exactly why it had built what it built and then drop
 * that on the floor, so the tool could show you a palette and not tell you a
 * single thing about where it came from.
 */
type Candidate = { slots: Slot[]; label: string };

/** Give every anchor the lightness slot it is already closest to. */
function placeAnchors(anchors: Oklch[], plan: number[]): (number | null)[] {
  const taken: (number | null)[] = plan.map(() => null);
  const order = anchors
    .map((_, i) => i)
    .sort((x, y) => anchors[y].l - anchors[x].l);

  for (const a of order) {
    let bestSlot = -1;
    let bestDelta = Infinity;
    for (let s = 0; s < plan.length; s++) {
      if (taken[s] !== null) continue;
      const delta = Math.abs(plan[s] - anchors[a].l);
      if (delta < bestDelta) {
        bestDelta = delta;
        bestSlot = s;
      }
    }
    if (bestSlot >= 0) taken[bestSlot] = a;
  }
  return taken;
}

/** Resample a palette to n colours, interpolating or thinning as needed. */
function resize(colors: Oklch[], n: number): Oklch[] {
  const sorted = [...colors].sort((a, b) => b.l - a.l);
  if (sorted.length === n) return sorted;
  if (sorted.length === 1) return Array.from({ length: n }, () => sorted[0]);

  return Array.from({ length: n }, (_, i) => {
    const pos = (i / (n - 1)) * (sorted.length - 1);
    const lo = Math.floor(pos);
    const hi = Math.min(sorted.length - 1, lo + 1);
    return mix(sorted[lo], sorted[hi], pos - lo);
  });
}

/** Put the anchors back, each into the slot nearest its own lightness. */
function graft(base: Oklch[], anchors: Oklch[]): Slot[] {
  const slots: Slot[] = base.map((color) => ({ color, anchor: null }));
  const order = anchors.map((_, i) => i).sort((x, y) => anchors[y].l - anchors[x].l);

  for (const a of order) {
    let bestSlot = -1;
    let bestDelta = Infinity;
    for (let s = 0; s < slots.length; s++) {
      if (slots[s].anchor !== null) continue;
      const delta = Math.abs(slots[s].color.l - anchors[a].l);
      if (delta < bestDelta) {
        bestDelta = delta;
        bestSlot = s;
      }
    }
    if (bestSlot >= 0) slots[bestSlot] = { color: anchors[a], anchor: a };
  }
  return slots;
}

/**
 * Borrow a palette off the shelf, optionally rotating its hues so it lands on
 * the user's colour.
 *
 * Rotation is the useful trick here: a curated palette encodes lightness and
 * chroma *relationships* that took a person's eye to find. Spinning the whole
 * thing to the user's hue keeps those relationships and changes only the
 * colour family — far better than generating from scratch around their seed.
 */
function fromShelf(
  anchors: Oklch[],
  size: number,
  rng: () => number,
  rotate: boolean,
): Candidate {
  const shelf = pick(rng, LIBRARY);
  const source = shelf.colors.map((h) => fromHex(h)!);
  let colors = source;
  let label = shelf.name.toLowerCase();

  if (rotate && anchors.length > 0) {
    const base = dominant(anchors);
    const delta = base.h - dominant(source).h;
    colors = source.map((c) =>
      clampToGamut({ ...c, h: (c.h + delta + 360) % 360 }),
    );
    label = `${label}, spun to ${toHex(base)}`;
  }
  return { slots: graft(resize(colors, size), anchors), label };
}

/** Build from first principles: a scheme, a lightness plan, a chroma arc. */
function fromHarmony(anchors: Oklch[], size: number, rng: () => number): Candidate {
  const base = anchors.length > 0 ? dominant(anchors) : pick(rng, LIBRARY_COLORS);
  const name = pick(rng, SCHEME_NAMES);
  const scheme = SCHEMES[name];
  const plan = lightnessPlan(size);
  const placed = placeAnchors(anchors, plan);

  let offset = 0;
  const slots = placed.map((anchor, i) => {
    if (anchor !== null) return { color: anchors[anchor], anchor };
    const l = plan[i] + between(rng, -0.015, 0.015);
    const h = (base.h + scheme[offset++ % scheme.length] + between(rng, -7, 7) + 360) % 360;
    const c = Math.max(0.008, chromaAt(l, base.c) * between(rng, 0.8, 1.2));
    return { color: clampToGamut({ l, c, h }), anchor: null };
  });
  return { slots, label: `${SCHEME_LABELS[name]} from ${toHex(base)}` };
}

/**
 * Build a palette around the locked swatches.
 *
 * Ninety candidates, scored by the same function that writes the critique,
 * best one wins. Generating and then rejecting is far simpler than trying to
 * write rules that only ever produce good palettes first time — and it means
 * the taste lives in one readable place instead of being smeared across the
 * generator.
 */
export const CANDIDATES = 90;

/**
 * What the search actually did, kept rather than thrown away.
 *
 * `trail` is every candidate it looked at, in the order it looked at them,
 * which is what the palette bar replays when you press space. It is the same
 * work the tool was already doing — the only change is that it is no longer
 * discarded the instant the winner is known.
 */
export type Search = {
  palette: Palette;
  /** Why the winner looks the way it does, in English. */
  label: string;
  /** Every candidate's colours, in the order they were tried. */
  trail: Oklch[][];
  /** Every candidate's score, same order. */
  scores: number[];
  /** Which one it kept. */
  kept: number;
  score: number;
};

export function search(
  palette: Palette,
  size = 5,
  rng: () => number = Math.random,
): Search {
  const lockedSwatches = palette.filter((s) => s.locked);
  const anchors = lockedSwatches.map((s) => s.color);
  const n = Math.max(2, Math.max(size, anchors.length));

  let best: Candidate | null = null;
  let bestScore = -Infinity;
  let kept = 0;
  const trail: Oklch[][] = [];
  const scores: number[] = [];

  for (let i = 0; i < CANDIDATES; i++) {
    const candidate =
      anchors.length === 0
        ? i % 3 === 0
          ? fromHarmony(anchors, n, rng)
          : fromShelf(anchors, n, rng, false)
        : i % 2 === 0
          ? fromShelf(anchors, n, rng, true)
          : fromHarmony(anchors, n, rng);

    const colors = candidate.slots.map((s) => s.color);
    const score = critique(colors).score;
    trail.push(colors);
    scores.push(score);
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
      kept = i;
    }
  }

  return {
    palette: orderByLightness(
      best!.slots.map((slot) =>
        slot.anchor !== null
          ? lockedSwatches[slot.anchor]
          : swatch(slot.color, "generated", false),
      ),
    ),
    label: best!.label,
    trail,
    scores,
    kept,
    score: bestScore,
  };
}

/** The winner on its own, for the callers that do not care how it was found. */
export function generate(
  palette: Palette,
  size = 5,
  rng: () => number = Math.random,
): Palette {
  return search(palette, size, rng).palette;
}

/** A seedable generator, so each direction is a different, reproducible run. */
const mulberry = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/**
 * Three (or `count`) genuinely different palettes for the same input, so
 * choosing a look feels like directing rather than gambling. Each is a full
 * `search` with its own seed; a result is kept only if its colours differ from
 * every direction already chosen, so two seeds landing on the same winner do
 * not waste a slot. `search` preserves locked colours, so every direction keeps
 * whatever the user pinned.
 */
export function directions(
  palette: Palette,
  size = 5,
  count = 3,
  rng: () => number = Math.random,
): Search[] {
  const sig = (s: Search) =>
    s.palette.map((sw) => toHex(sw.color)).sort().join("-");
  const chosen: Search[] = [];
  const seen = new Set<string>();
  // ponytail: bounded retry (count*8). If locks constrain the space so hard
  // that fewer than `count` distinct palettes exist, return what was found.
  for (let i = 0; i < count * 8 && chosen.length < count; i++) {
    const found = search(palette, size, mulberry(Math.floor(rng() * 2 ** 32)));
    const key = sig(found);
    if (seen.has(key)) continue;
    seen.add(key);
    chosen.push(found);
  }
  return chosen;
}

/**
 * Regenerate only the named slots, holding everything else exactly as it is.
 * This is what the "fix this" buttons in the critique run.
 */
export function regenerate(
  palette: Palette,
  indices: number[],
  rng: () => number = Math.random,
): Palette {
  const target = new Set(indices);
  const wasLocked = new Map<Swatch, boolean>();

  // Everything not being replaced is held in place by locking it for the
  // duration of the call, then restored to whatever the user had set.
  const held = palette
    .filter((_, i) => !target.has(i))
    .map((s) => {
      const pinned = { ...s, locked: true };
      wasLocked.set(pinned, s.locked);
      return pinned;
    });

  return generate(held, palette.length, rng).map((s) =>
    wasLocked.has(s) ? { ...s, locked: wasLocked.get(s)! } : s,
  );
}

/** Light to dark. A palette read in lightness order shows its own spread. */
export const orderByLightness = (palette: Palette): Palette =>
  [...palette].sort((a, b) => b.color.l - a.color.l);

// ---------------------------------------------------------------------------
// The critique — the picky part
// ---------------------------------------------------------------------------

export type Severity = "good" | "warn" | "bad";

export type Note = {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  /** Swatch indices the note is about. */
  targets: number[];
  /** Indices a one-click fix would regenerate. Absent when there is no fix. */
  replace?: number[];
};

export type Critique = { score: number; notes: Note[] };

/** Mid-lightness, barely-there chroma, in the olive band. The muddy zone. */
const isMuddy = (c: Oklch) =>
  c.l > 0.33 && c.l < 0.68 && c.c > 0.015 && c.c < 0.075 && c.h > 55 && c.h < 125;

/**
 * Judge a palette.
 *
 * Every check answers a question someone would actually ask of a palette
 * before shipping it, and every one of them prints a number rather than a
 * vibe — same rule the contrast work follows. `locked` only steers *where*
 * a suggested fix points: a colour the user chose is never the thing the
 * tool offers to throw away if there is any other candidate.
 */
export function critique(colors: Oklch[], locked: boolean[] = []): Critique {
  const notes: Note[] = [];
  const n = colors.length;
  if (n === 0) return { score: 0, notes };

  const free = colors.map((_, i) => !locked[i]);

  /**
   * Where a suggested fix points. Unlocked swatches first — a colour the user
   * chose is never the thing we offer to throw away while there is any other
   * candidate. But when *everything* is locked we still point somewhere,
   * because withholding the fix does not protect their colours, it just leaves
   * them stuck; the button reads "Replace anyway" and they decide.
   */
  const aim = (candidates: number[]) => {
    const unlocked = candidates.filter((i) => free[i]);
    return unlocked.length > 0 ? unlocked : candidates;
  };
  const penalise = (note: Note, cost: number) => {
    notes.push(note);
    return cost;
  };
  let penalty = 0;

  // — 1. Lightness spread ————————————————————————————————————
  const ls = colors.map((c) => c.l);
  const spread = Math.max(...ls) - Math.min(...ls);
  if (spread < 0.55) {
    const lightest = ls.indexOf(Math.max(...ls));
    const darkest = ls.indexOf(Math.min(...ls));
    const ends = aim([lightest, darkest]);
    penalty += penalise(
      {
        id: "spread",
        severity: spread < 0.32 ? "bad" : "warn",
        title: `Lightness spread is ${spread.toFixed(2)}`,
        detail:
          spread < 0.32
            ? "These colours are all about as light as each other, so almost none of them can sit on top of another. A palette needs somewhere to put text."
            : "Usable palettes tend to span 0.55 or more in lightness. Widening the ends gives you a background and a text colour for free.",
        targets: [lightest, darkest],
        replace: ends,
      },
      (0.55 - spread) * 90,
    );
  } else {
    notes.push({
      id: "spread",
      severity: "good",
      title: `Lightness spread is ${spread.toFixed(2)}`,
      detail:
        "Wide enough that the palette carries its own background and text colours.",
      targets: [],
    });
  }

  // — 2. Colours doing the same job ————————————————————————————
  for (let a = 0; a < n; a++)
    for (let b = a + 1; b < n; b++) {
      if (Math.abs(colors[a].l - colors[b].l) > 0.07) continue;
      // Hue is noise at zero chroma, so two near-neutrals at the same
      // lightness are the same colour whatever their reported hue says.
      const bothNeutral = colors[a].c < 0.025 && colors[b].c < 0.025;
      if (!bothNeutral && hueGap(colors[a].h, colors[b].h) > 26) continue;
      const swap = aim([b, a]).slice(0, 1);
      penalty += penalise(
        {
          id: `crowd-${a}-${b}`,
          severity: "warn",
          title: `${toHex(colors[a])} and ${toHex(colors[b])} do the same job`,
          detail:
            "Same hue family, same lightness. One of these is spending a palette slot without adding an option.",
          targets: [a, b],
          replace: swap,
        },
        9,
      );
    }

  // — 3. Can anything be read on anything? ————————————————————
  let bestPair = 1;
  let passing = 0;
  for (let a = 0; a < n; a++)
    for (let b = a + 1; b < n; b++) {
      const ratio = contrast(colors[a], colors[b]);
      bestPair = Math.max(bestPair, ratio);
      if (ratio >= 4.5) passing++;
    }

  if (bestPair < 4.5) {
    penalty += penalise(
      {
        id: "text",
        severity: "bad",
        title: `Best pair is only ${bestPair.toFixed(2)}:1`,
        detail:
          "No two colours here clear 4.5:1, so nothing in this palette can be text on anything else in it. You would have to bring in a black or a white from outside.",
        targets: [],
        replace: aim(colors.map((_, i) => i)),
      },
      30,
    );
  } else if (passing < Math.max(2, n - 2)) {
    penalty += penalise(
      {
        id: "text",
        severity: "warn",
        title: `${passing} readable pair${passing === 1 ? "" : "s"}`,
        detail: `Only ${passing} of the ${(n * (n - 1)) / 2} combinations clear 4.5:1. That works, but it leaves you very few legal ways to put text on colour.`,
        targets: [],
      },
      8,
    );
  } else {
    notes.push({
      id: "text",
      severity: "good",
      title: `${passing} readable pairs`,
      detail: `Of ${(n * (n - 1)) / 2} combinations, ${passing} clear 4.5:1 — plenty of legal text-on-colour choices.`,
      targets: [],
    });
  }

  // — 4. One colour shouting over the others ————————————————————
  const chromas = [...colors.map((c) => c.c)].sort((a, b) => a - b);
  const median = chromas[Math.floor(chromas.length / 2)];
  for (let i = 0; i < n; i++) {
    if (colors[i].c < median * 2.6 + 0.05) continue;
    // If the loud colour is theirs, offer to lift the others to meet it
    // instead — and only point back at it when there is nothing else free.
    const others = colors.map((_, j) => j).filter((j) => j !== i && free[j]);
    penalty += penalise(
      {
        id: `chroma-${i}`,
        severity: "warn",
        title: `${toHex(colors[i])} is far more saturated than the rest`,
        detail:
          "Chroma this far above the others reads as a colour from a different palette. Either bring it down, or lift the others to meet it.",
        targets: [i],
        replace: free[i] ? [i] : others.length > 0 ? others : [i],
      },
      10,
    );
  }

  // — 5. Mud ————————————————————————————————————————————————
  for (let i = 0; i < n; i++) {
    if (!isMuddy(colors[i])) continue;
    penalty += penalise(
      {
        id: `mud-${i}`,
        severity: "warn",
        title: `${toHex(colors[i])} sits in the muddy band`,
        detail:
          "Mid lightness, low chroma, olive hue — the corner of the space where a colour reads as dirt rather than as a decision. A little more chroma or a shift off the yellow-green axis fixes it.",
        targets: [i],
        replace: [i],
      },
      8,
    );
  }

  // — 6. Hue gaps in the awkward zone ————————————————————————
  const chromatic = colors.map((c, i) => ({ c, i })).filter((x) => x.c.c > 0.035);
  for (let a = 0; a < chromatic.length; a++)
    for (let b = a + 1; b < chromatic.length; b++) {
      const gap = hueGap(chromatic[a].c.h, chromatic[b].c.h);
      if (gap < 28 || gap > 55) continue;
      const swap = aim([chromatic[b].i, chromatic[a].i]).slice(0, 1);
      penalty += penalise(
        {
          id: `hue-${chromatic[a].i}-${chromatic[b].i}`,
          severity: "warn",
          title: `${gap.toFixed(0)}° between ${toHex(chromatic[a].c)} and ${toHex(chromatic[b].c)}`,
          detail:
            "Too far apart to read as one hue, too close to read as a deliberate contrast. This gap is the one that looks like a mistake rather than a choice.",
          targets: [chromatic[a].i, chromatic[b].i],
          replace: swap,
        },
        7,
      );
    }

  // — 7. Somewhere to rest ————————————————————————————————————
  const quietest = Math.min(...colors.map((c) => c.c));
  if (quietest > 0.055) {
    const quiet = colors
      .map((c, i) => ({ c, i }))
      .sort((x, y) => x.c.c - y.c.c)
      .map((x) => x.i);
    penalty += penalise(
      {
        id: "neutral",
        severity: "warn",
        title: "Every colour here is saturated",
        detail:
          "With no near-neutral, every surface in an interface built from this competes for attention. Most working palettes keep one quiet colour to sit behind the others.",
        targets: [],
        replace: aim(quiet).slice(0, 1),
      },
      5,
    );
  }

  const order: Record<Severity, number> = { bad: 0, warn: 1, good: 2 };
  notes.sort((a, b) => order[a.severity] - order[b.severity]);

  return { score: Math.max(0, Math.min(100, Math.round(100 - penalty))), notes };
}

// ---------------------------------------------------------------------------
// Roles — how the palette maps onto an actual interface
// ---------------------------------------------------------------------------

export type Roles = {
  surface: Oklch;
  raised: Oklch;
  accent: Oklch;
  onAccent: Oklch;
  heading: Oklch;
  body: Oklch;
  /** True when the palette supplied the text colour itself. */
  headingFromPalette: boolean;
  bodyFromPalette: boolean;
  onAccentFromPalette: boolean;
};

/**
 * Assign interface jobs to palette colours, and solve for anything the
 * palette cannot cover.
 *
 * The honesty here is the point: where the palette has a colour dark enough to
 * be body text on its own lightest colour, that colour is used and reported as
 * the palette's. Where it does not, `deriveInk` fills the gap and the preview
 * says so out loud — which tells the user something real about their palette
 * rather than quietly papering over the hole.
 */
export function paletteRoles(colors: Oklch[], dark = false): Roles {
  // Light: the palette's lightest colour is the page and text is solved down
  // from it. Dark: the same palette, read from the other end. Nothing else in
  // this function changes, which is the argument for the feature — a dark
  // answer is not a second palette, it is the same one turned over.
  const sorted = [...colors].sort((a, b) => (dark ? a.l - b.l : b.l - a.l));
  const surface = sorted[0];
  const raised = sorted[1] ?? surface;

  // The accent wants chroma, and wants to be in the band where a fill still
  // reads as something you can press.
  const accent = [...colors].sort(
    (a, b) => b.c * (1 - Math.abs(b.l - 0.55)) - a.c * (1 - Math.abs(a.l - 0.55)),
  )[0];

  // Prefer the palette's own furthest colour for text, but only if it earns it.
  // On a dark ground that is the lightest colour rather than the darkest; the
  // test is the same either way, because contrast has no direction.
  const opposite = sorted[sorted.length - 1];
  const headingFromPalette = contrastFloor(opposite, surface) >= 7;
  const bodyFromPalette = contrastFloor(opposite, surface) >= 4.5;

  const onAccentCandidates = [surface, opposite].filter(
    (c) => contrastFloor(c, accent) >= 4.5,
  );

  return {
    surface,
    raised,
    accent,
    heading: headingFromPalette ? opposite : deriveInk(surface, 7),
    body: bodyFromPalette ? opposite : deriveInk(surface, 4.5),
    onAccent: onAccentCandidates[0] ?? deriveInk(accent, 4.5),
    headingFromPalette,
    bodyFromPalette,
    onAccentFromPalette: onAccentCandidates.length > 0,
  };
}
