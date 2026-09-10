# Tint

A colour palette studio with an opinion. Give it a colour, a handful of hexes, a
screenshot or a description of a mood; it builds the palette around what you
gave it, tells you what is wrong with the result, and exports the tokens.

The rule that shaped everything else: **the interface is painted in whatever
palette you are currently building.** There is no safe fallback grey to hide
behind, so no foreground colour is hardcoded anywhere in the codebase — every
one is solved at render time against the surface it lands on. If the contrast
maths is wrong, the product visibly breaks.

## Running it

```bash
npm install && npm run dev
```

`npm test` runs the engine's test suite. `npm run build` produces a static
`dist/` that can be hosted anywhere — there is no server.

## What's in here

| Path | What it is |
|---|---|
| `src/lib/color.ts` | The colour engine. OKLCH ↔ sRGB, gamut mapping, WCAG contrast, ramp generation, ink derivation. ~275 lines, zero dependencies. |
| `src/lib/harmony.ts` | The palette engine: generation, and the critique that scores it. |
| `src/lib/library.ts` | Seventy tagged palettes, the mood search over them, and the paste parser. |
| `src/lib/extract.ts` | k-means over an image's pixels, clustered in OKLab (hue is an angle, so it clusters in cartesian form or 359° and 1° read as opposites). |
| `src/lib/palette.ts` | Derives the app's own chrome; token export. |
| `src/lib/motion.ts` | The story's whole animation stack: reduced-motion, in-view, scroll progress, drift, count-up. Sixty lines, no library. |
| `src/lib/strip.ts` | Geometry for the pinned strip, kept pure so it can be tested. |
| `src/lib/*.test.ts` | 31 tests, run by `node --test` with Node's native TypeScript stripping. No test framework installed. |
| `src/CaseStudy.tsx` | The story, at `#/` — the page people land on. |
| `src/components/Figures.tsx` | The story's diagrams. All computed from the live palette, none drawn by hand. |
| `src/components/Illustrations.tsx` | The paper-collage decorations, drawn as SVG in the live palette. |

## Six decisions worth defending

**Chroma reduction, not channel clipping.** OKLCH can describe colours a screen
can't show. Clipping the RGB channels changes hue *and* lightness silently; the
step you get back isn't the step you asked for. `clampToGamut` binary-searches
chroma downward with lightness and hue held fixed, giving up exactly one
property instead of three.

**The softest ink that passes.** `deriveInk(surface)` doesn't drop to black. It
searches for the *least* contrasty foreground that still clears 4.5:1, keeping a
trace of the surface's hue, so pastel surfaces stay soft right up to the point
where legibility would be spent. That only works because a passing ink always
exists: sweeping all of sRGB, the worst case for black-or-white text is
**4.58:1**, at luminance ≈ 0.179. AA is therefore always reachable — and AAA
sometimes genuinely isn't.

**One function both generates and judges.** `critique()` is the product's
opinion — seven checks, each printing the number it is unhappy about. `generate()`
builds ninety candidates and keeps the best *by that same function*, so the tool
never suggests a palette it would then complain about, and the taste lives in one
readable place instead of smeared across a generator.

**Your colours are never edited behind your back.** Anything you paste, drop or
pick arrives locked, and stays. If two of your colours are redundant the critique
says so and offers a one-click swap labelled *Replace anyway* — it does not
quietly merge them. An earlier version de-duplicated pasted colours perceptually
before they reached the palette; that was a silent edit, and it was removed.

**No animation library.** The landing page has an entry sequence, a pinned
scroll strip that grows the palette into full-bleed columns, staggered
entrances, counting numbers and a parallax drift — and no GSAP. All of it is
`src/lib/motion.ts`: one `getBoundingClientRect` per frame, a few
`IntersectionObserver`s, and geometry interpolated in `calc()` because the two
ends are in different units. That is ~34kB gzipped not spent, on a project
whose argument is that it wrote its own maths. The same reasoning that keeps
the colour library out keeps this out.

**Verify the rendered page, not the source.** A script walks every text node in
the live DOM, composites the real background stack through a canvas, and
computes contrast from the actual 8-bit pixels. It found two bugs the unit tests
could not.

## The two bugs that audit found

Both were cases of the engine being right about a colour it wasn't actually
shipping.

1. **Contrast was computed on continuous floats.** Screens are 8-bit, and every
   contrast checker works from a hex code. Measuring in float produced ratios up
   to ~0.02 optimistic — reporting 4.50 for a pair that renders at 4.49.
   `luminance()` now quantises to 8 bits first, so Tint's number matches what
   any other checker gives for the same hex.

2. **Renderers don't agree on the last bit.** For a blue seed, this engine
   rounds green to 107 where Chrome renders 108. At green's 0.72 luminance
   weight, that single bit is worth ~0.05 of ratio — enough to turn a computed
   4.51 into a rendered 4.46. `deriveInk` now solves against `contrastFloor()`,
   the worst contrast the pair could have under ±1 LSB of rounding, so the
   result holds regardless of who does the rasterising. The number *shown* stays
   the nominal one, because that's the number other tools report.

After both fixes, and again after the palette rebuild: 14 hostile inputs across
both routes, ~125 elements each, zero failures, tightest margin 1.012×. And
again after the story rebuild: all six repaint palettes across both routes,
zero failures, tightest margin 1.014×. The one deliberately-failing pair in the
case study is tagged `data-contrast-demo` and counted separately, so it cannot
hide a real regression.

## Deliberately not here

No accounts, no database, no backend — nothing in this app needs a server, so it
doesn't have one. Images are clustered in the browser and never uploaded. No
colour library: the OKLab conversions, gamut mapping and WCAG maths are the
point of the project. No smooth-scroll on the studio itself — damped scrolling
fights a trackpad and breaks find-on-page, so it's confined to the story page
where pacing is the goal.

There is no model behind the mood search either. "Something calm and coastal" is
answered by scoring a description against seventy hand-tagged palettes — faster,
identical every time, and it keeps an API key out of a static site.

Next thing worth building: colour-blindness simulation over the same palette. The
maths sits in the same place, and it's the one check a printed ratio can't make
for you.

## Stack

Vite · React · TypeScript · Tailwind CSS · Lenis (case-study scroll only).
No animation library, no colour library, no router, no state library, no test
framework.

Type is [Cabinet Grotesk](https://www.fontshare.com/fonts/cabinet-grotesk) by
Indian Type Foundry, self-hosted under the Fontshare licence; numerals use the
platform mono stack.
