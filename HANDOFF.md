# Handoff — Tint

Written 2026-09-02, after the story-page rebuild. Everything below was checked
against the working tree rather than remembered. Read this and `README.md`
before changing anything.

---

## 1. What this is

**Tint** is a colour palette studio with an opinion. You give it a colour, a
handful of hexes, a screenshot or a description of a mood; it builds a palette
around what you gave it, then tells you what is wrong with the result.

It is a **portfolio piece** for Harman, aimed at *both* frontend/UI engineering
and product design / design engineering roles. That framing drives real
decisions: the maths is hand-written because it is the interview story, and the
stack is deliberately small because she has to be able to defend every part of
it. "Could this be a library?" is usually the wrong question here; "can she
explain this in an interview?" is the right one.

It **replaced** a project called KairoHQ (an AI project-management app). That
pivot is settled — do not revive it.

### Two folders, one frozen

| Path | Status |
|---|---|
| `tint/` | **The project.** All current work. Standalone. |
| `kairohq/` | **Do not touch.** Her original repo, cloned. |

`kairohq/` sits on branch `feat/tint` with uncommitted leftovers from before
the pivot. Those files were **copied** into `tint/`, not moved. Its remote is
`https://github.com/harmanaujla01/kairohq.git`.

**Standing constraint from the user: never push to that remote.** If leftovers
there ever need clearing, ask first — it is her repo.

---

## 2. Where it stands

```
npm test         47/47 pass
npx tsc -b       clean
npm run build    101.0 kB gzipped JS · 8.2 kB gzipped CSS
```

The studio rebuild described in `plan_2.md` has landed — eleven of its twelve
beats, everything except `⌘K`, which was cut. Runtime dependencies are still
exactly three; the whole of it cost about 6 kB gzipped.

Contrast audited over sixteen studio states — light and dark × four colour
vision modes, plus four freshly generated palettes on each ground — and the
story route with its disclosure open: **zero failures, 130 elements per studio
state, tightest margin 1.015×**. Separately, `buildChrome` swept over 73,260
seeds spanning the whole L × C × H space, on **both** grounds and against
**both** surfaces text actually sits on:

| | worst `--ink` | worst `--muted` | worst `--accent-ink` |
|---|---|---|---|
| light, on `--bg` | 9.224 | 4.607 | 4.565 |
| light, on `--surface` | 10.150 | 5.069 | — |
| dark, on `--bg` | 10.080 | 5.053 | 4.565 |
| dark, on `--surface` | 9.199 | 4.612 | — |

That second surface column is not padding. Solving ink against `--bg` alone
shipped twenty elements at 4.18:1 on the first dark render, and the sweep that
only checked `--bg` said everything was fine. See invariant 12.

**Still not a git repository.** `tint/` has a `.gitignore` and no `.git`.
Probably the first job next session — check with her where it should live and
what it should be called.

### Stack

Vite 7 · React 19 · TypeScript · Tailwind CSS v4 · Lenis. Runtime dependencies
are exactly `react`, `react-dom`, `lenis`. Everything else is a devDependency.

No router (hash routing, ~10 lines in `App.tsx`), no state library, no colour
library, no animation library, no test framework — `node --test` with Node's
native TypeScript stripping.

**Next.js was explicitly rejected** and should not come back without a new
reason. Nothing here needs a server: no auth, no database, no API key. Images
are clustered in the browser; the mood search is a tag search over seventy
built-in palettes, not a model.

---

## 3. The map

Two routes, one shared palette in `App.tsx`:

| Route | What it is |
|---|---|
| `#/` | **The story.** The landing page — a scroll piece that argues the product. |
| `#/studio` | **The tool.** Palette bar over a six-tile bento. |

Both are painted in whatever palette is currently loaded, and the story's
repaint pills change it live.

### Files

| Path | What it is |
|---|---|
| `src/lib/color.ts` | The colour engine. OKLCH ↔ sRGB, gamut mapping, WCAG, `ramp`, `deriveInk`. The oldest and most-tested file here. |
| `src/lib/harmony.ts` | **The palette engine.** Generation, the critique, role assignment. |
| `src/lib/library.ts` | 70 tagged palettes, the mood search over them, the paste parser. |
| `src/lib/extract.ts` | k-means over image pixels, clustered in OKLab. |
| `src/lib/palette.ts` | Derives the app's own chrome; token export. |
| `src/lib/motion.ts` | The story's entire animation stack, plus `typing()`, which every bare-letter shortcut has to ask before it eats a keystroke. |
| `src/lib/strip.ts` | Pinned-strip geometry, kept pure so it can be tested. Used by the story's pinned section **and** by the studio's present mode. |
| `src/lib/vision.ts` | Colour-vision simulation. One set of matrices, fed both to an SVG filter and to the JS that reports what the simulation costs. |
| `src/lib/replay.ts` | Replays the generator's search over the palette bar. `frameAt` is pure, so the timing is testable without a browser. |
| `src/lib/drag.ts` | Drag-to-reorder for the palette bar: pointer tracking plus a hand-rolled FLIP onto the `linear()` spring. |
| `src/lib/share.ts` | The palette in the address bar, in both directions. |
| `src/lib/status.ts` | The status line. Written straight into the DOM, deliberately — see below. |
| `src/lib/track.ts` | The pinned horizontal track: the desktop gate, the scroll→sideways mapping, and the rail's jump targets. The geometry is pure and tested; the loop writes transforms straight onto the node. |
| `src/App.tsx` | Shell, palette state, hash routing. |
| `src/CaseStudy.tsx` | `#/` — the story. Lenis, entrances, the jump rail. The biggest file (717 lines) and mostly content. |
| `src/index.css` | Tokens, the bento grid, and every keyframe. 450 lines. |
| `src/components/Figures.tsx` | The story's diagrams. All *computed* from the live palette. |
| `src/components/Illustrations.tsx` | The paper-collage decorations. Drawn as SVG, in the live palette. |
| `src/components/Preloader.tsx` | The entry sequence. |
| `src/components/ScrollStrip.tsx` | The pinned full-bleed strip, and the `01 / 05 — Enter the proof` threshold cue at the end of its hold. |
| `src/components/Track.tsx` | The horizontal case-study installation: the pinned track, the far wall, the chapter rail, and the `Room` shell. Renders its `fallback` instead below 1100px or under reduced motion. |
| `src/components/Rooms.tsx` | The five rooms themselves. Every figure in them is measured off the live palette. |
| `src/components/StatusBar.tsx` | The studio's bottom rail: the readout, and the controls that change how the whole studio is displayed. |
| `src/components/Reasoning.tsx` | The one line under the palette bar saying why the palette looks like that. |
| `src/components/VisionControl.tsx` | The SVG filter definitions and the mode switch. |
| `src/components/Present.tsx` | Full-screen palette, reusing `strip.ts`'s geometry. |
| `src/components/*.tsx` | One file per studio tile, plus `Tile`/`Stat`/`Grade`/`Icon`. |
| `scripts/audit-contrast.js` | Paste-into-console contrast auditor. See §6. |
| `plan_1.md` | Her plan for the story rebuild. See §7 for the two parts of it that were deliberately not followed. |
| `plan_2.md` | The plan for the studio rebuild. Beats 1–10 and 12 shipped; beat 11 (`⌘K`) was cut. Two of its rulings were reversed during the build — see invariants 13 and 14. |

### The story's five sections

They are the same five chapters in both layouts. On a desktop screen they are
*rooms* on a pinned horizontal track (`Track.tsx`); below 1100px, and under
reduced motion, `CaseTrack` renders its `fallback` and they are vertical
sections instead. The ids are the same either way, so every anchor keeps
working.

Three things make the track a place rather than a slide deck on its side, and
all three are in `track.ts` with their invariants in `track.test.ts`: the travel
is eased per segment so rooms *land* (`SETTLE`), the far wall moves at a
fraction of the rooms' speed so there are two planes (`PARALLAX`), and each room
is handed its own distance from centre as `--near` so it can sit back and dim
without React hearing about a single frame.


`problem` · `oklch` · `ink` · `opinion` · `left-out`, numbered 01–05, with the
gamut argument folded into a `<details>` under 02. The jump rail on the right
is driven by its own `IntersectionObserver` — separate from the reveal
observer, because it has to keep firing after a section has been seen.

---

## 4. Invariants

Fourteen things that are load-bearing. Breaking one should be a decision, not an
accident.

**1. No hardcoded foreground colours, anywhere.** Every text colour comes from
`deriveInk(surface)`. A colour literal in a component is a bug. This is the
whole product argument — there is no safe grey to fall back to, so if the
contrast maths is wrong the product visibly breaks.

**2. Colour is judged on a chroma-0 bench.** Swatches and the matrix sit on
`--bench`, chroma exactly 0. A tinted bench lies to the user about the colour
they are evaluating.

**3. `contrastFloor`, not `contrast`, for any *derivation*.** Displayed numbers
use plain `contrast()`, because that is what every other checker reports. Do
not merge these into one function — they are different jobs.

**4. Luminance quantises to 8 bits.** Deliberate. See README bug #1.

**5. Smooth scroll lives only on the story route.** The studio uses native
scroll. A tool that hijacks scrolling fights the trackpad and breaks
find-on-page. Note that this is *narrower* than it used to be: it used to be
stated as "a tool does not perform", and `plan_2.md` replaced that with **the
studio may perform, but only by showing its own work**. Every animation in the
studio is a readout of something the engine is actually doing. Scroll is still
the user's.

**6. Reveals enhance an already-visible default.** `reveal-armed` is added by
JS. If the script never runs, the content still ships.

**7. Three type weights: 400 / 500 / 700.** `font-synthesis-weight: none` is
set, so a missing weight fails loudly rather than being faked.

**8. Colour is never the sole carrier of meaning.** Pass/fail prints the
number. The critique prints the severity as a word as well as drawing it.

**9. The user's colours are never edited silently.** Anything pasted, dropped
or picked arrives `origin: "user"` and `locked: true`, and survives every
generate. The critique may *offer* to replace one — the button then reads
"Replace anyway" — but nothing goes without a click. An early version
perceptually de-duplicated pasted colours in `IntakeTile`; that was a silent
edit and it was removed. Do not reintroduce it.

**10. `critique()` is both the judge and the generator's fitness function.**
`generate()` scores ninety candidates with it and keeps the best. Add a check
and generation gets pickier for free — and the tool still never suggests what
it would then complain about. Do not fork these into two scoring functions.

**11. `prefers-reduced-motion` is subscribed to, never sampled.** Use
`useReducedMotion()` from `src/lib/motion.ts`, not the plain `reducedMotion()`
predicate. This one was a real bug and took a while to find: a component
reading the preference during render and a hook reading it again in an effect
can get different answers, and the page ends up in a state neither branch
describes — reduced-motion layout with full-motion progress, or the reverse.
Subscribing also means turning the setting on mid-visit actually stops the page.

**12. Ink is solved against every ground it will sit on, not just `--bg`.**
`buildChrome` derives two candidates — one against the page ground, one against
the tile surface — and keeps whichever holds up on both. Which of the two is
the harder one *flips with the theme*: on paper the tiles are lighter than the
ground and dark ink struggles on the ground, and on a dark ground the tiles are
still lighter but the ink is light too, so the tiles become the hard case. This
shipped wrong. Twenty elements rendered at 4.18:1 against a 4.5 requirement the
first time the dark ground was switched on, and the seed sweep missed it
because the sweep was also only checking `--bg`. Add a surface and you must add
it to both.

**13. The colour-vision simulation is a filter over the finished render, never
a transform applied before derivation.** `plan_2.md` §7 said the opposite and
it was wrong. A person with deuteranopia sees the page that actually shipped,
filtered by their own eye; deriving ink from simulated colours solves for a
colour that is on nobody's screen. So `deriveInk` keeps working on the real
palette and an SVG `feColorMatrix` goes over the top — which is also why the
contrast auditor, reading computed styles, is unaffected by the mode. What the
simulation does to contrast is measured separately, by `review()`.

**14. Contrast under simulation is *not* preserved, and the tool must not say
it is.** The feature was specified on the assumption that dichromacy leaves
luminance alone, so the ratios would hold while the colours collapsed. Swept
over the seventy shelf palettes, protanopia moves some pairs by 57% and drops
seven of them out of AA outright. `review()` reports both failures separately
and `vision.test.ts` asserts the drift is real, so that a future change cannot
quietly restore the comfortable version of the claim.

---

## 5. Two layouts with non-obvious rules

### The bento is ordered by child index

Grid areas are assigned by **child order** in `src/index.css`:

```css
.bento > :nth-child(1) { grid-area: intake; }
```

So reordering the tiles in `App.tsx` silently rearranges the layout. The bento
*is* an ordered layout, so the order is the API. If you add a tile, add its
area to all three breakpoint blocks and a matching `nth-child` rule.

Gutters are 6px against 22px radii. That ratio is the visual identity;
widening the gutter turns it into a generic card grid.

### The story's motion is CSS classes toggled by hooks

Nothing animates itself. `src/lib/motion.ts` exposes five hooks —
`useReducedMotion`, `useInView`, `useScrollProgress`, `useDrift`,
`useCountUp` — and components use them to add an `entered` class or write an
inline style. The CSS classes are all in `src/index.css`:

| Class | Used for |
|---|---|
| `.preload*` | The entry sequence |
| `.chip-deal` | The fan dealing itself in (nested *outside* `.chip`, because both animate `transform` and one would win) |
| `.enter-l` / `.enter-r` / `.enter-up` + `.entered` | Section entrances |
| `.stamp` | The two big numbers landing with an overshoot |
| `.rule-grow`, `.note-rule`, `.lay-in`, `.plot-fade`, `.plot-draw` | Figure-level entrances |
| `.tilt-in`, `.paper-noise` | The footer CTA |
| `.geometry` | The gamut disclosure |

Every one of them has a `prefers-reduced-motion` override that renders the
*finished* state. The reduced path is the full content with none of the travel,
never a blank frame.

The pinned strip is the only thing with real geometry: a 220/280vh section with
a `position: sticky` inner layer, and chip boxes interpolated in `calc()`
because the two ends are in different units — a fixed-size row centred on the
screen at rest, an exact percentage split when finished. That maths lives in
`src/lib/strip.ts`.

Two constants in that file carry the whole feel of the section and are worth
understanding before touching:

- **`SPREAD` (0.12)** — how much of the scrub is spent staggering the chips.
  It was 0.5, and at any intermediate frame that put the chips at wildly
  different widths. Since every chip's left edge travels from the centre of
  the screen to its own column, the leading chips raced left while the
  trailing ones sat near the middle: the group slid off to the left, overlapped
  itself, and left a bite of empty page on the right. Raise it again and that
  comes back.
- **`LANDING` (0.8)** — the point in the scrub by which every chip is home.
  The last fifth is a hold on the finished picture, which is where the sub-line
  and the per-column hex labels land. Without it the payoff frame existed for
  one frame, at the instant the section unpinned.

The strip is driven by `useScrollProgress`, which runs a `requestAnimationFrame`
loop gated by an `IntersectionObserver` rather than listening for `scroll`.
Damped scrolling, trackpad inertia and touch momentum all keep moving the page
between scroll events; a scrub driven off those events stutters, and behind a
smooth-scroll library that animates the position itself it can fail to move at
all. The loop only runs while the section is on screen, which is a small part
of the page.

---

## 6. How to actually verify a change

Unit tests check the maths. They do **not** check that what shipped is what the
maths described — both historical engine bugs got through them.

```bash
npm test
```

Then, with a server running, paste `scripts/audit-contrast.js` into the browser
console. It walks every text node, composites the real background stack through
a canvas, and computes ratios from actual 8-bit pixels.

Expect `failed: 0`. `demos` counts elements inside `[data-contrast-demo]` — the
story renders one deliberately-failing pair in order to argue against it, and
it is excluded so it cannot mask a regression. `margin` is the tightest
ratio/requirement seen; 1.012–1.027 is normal, because `--muted` is *designed*
to sit on 4.5:1.

The script now **cancels every CSS transition before it takes its first
sample**. Colour transitions are declared on every element so that a repaint
reads as one wash, which means an audit run within a quarter-second of a
palette change was measuring colours part-way between two palettes and
reporting failures that exist on no frame a user sees. This is also what makes
the audit trustworthy in a backgrounded tab — see the trap below.

**Fuzz it across inputs.** The claim is "any palette", so test hostile ones.
Drive the intake textarea with a native value setter and re-run the audit.
Verified at the palette rebuild: 14 hostile inputs × both routes, ~125 elements
each, zero failures, worst margin 1.012. Keep `#0000ff` in any sweep — it
caught engine bug #2. Re-verified after the story rebuild: six repaint palettes
× both routes, zero failures, worst margin 1.014.

Also worth re-running: 25 consecutive Generates with an audit after each, and
clicking every fix button the critique offers.

**Audit every ground, not every colour.** Since the dark counterpart landed,
one pass over the light studio is no longer coverage. The studio has sixteen
states — two grounds × four colour-vision modes — and the ground is the axis
that actually matters, because it decides which surface is hardest to be legible
on (invariant 12). The colour-vision modes are a CSS filter over the finished
render, so the auditor's computed-style reads are identical across all four of
them; run them anyway, cheaply, because that identity is itself the thing worth
checking. The quickest way is a loop that clicks the rail controls and calls the
audit between each, which is how the 4.18:1 dark failures were found.

Note that the auditor cannot see the simulation and should not try to. What a
colour-vision mode does to contrast is a different question, measured by
`review()` in `vision.ts` and asserted in `vision.test.ts`.

### Running it

```bash
npm run dev
```

`.claude/launch.json` has two entries: `tint` (dev server) and `tint-built`
(`vite preview` over `dist/`). Both take their port from `PORT` via
`vite.config.ts`. Prefer `tint-built` when checking anything layout-related — a
long-lived dev server can hold a stale Tailwind scan and silently fail to
generate utility classes from files created after it started, which looks
exactly like a CSS bug.

### Check `prefers-reduced-motion` before concluding anything is broken

This cost a whole round trip. A report that "the scroll strip does not move on
a real screen" turned out to be **macOS Reduce Motion switched on**, which the
page correctly honours by rendering the strip's finished state and skipping
every entrance and the entry sequence. Nothing was wrong with the code.

```bash
defaults read com.apple.universalaccess reduceMotion
```

`1` means every animation on the story page is deliberately off, on that
machine, in every browser. Check this **first** whenever motion is reported
missing. In the browser: `matchMedia("(prefers-reduced-motion: reduce)").matches`.

The reduced path is deliberately the strict reading of the preference — no
travel *and* no cross-fades — and both `DESIGN.md` and invariant 11 record that
as a decision. Softening it to opacity-only transitions would be within the
WCAG guidance and would give a reduced-motion visitor a page that still
reveals. That is a decision for the user, not a fix to apply quietly.

### The trap, if you verify through an automated browser

A pane that is not actually rendering (`document.visibilityState === "hidden"`)
does not run the rendering steps. That means **no `requestAnimationFrame`, no
scroll events, no CSS transitions completing, and `getBoundingClientRect`
handing back stale layout**.

In that state:

- Scroll-driven anything appears frozen — it is not; nothing is being told to
  move. Read `element.getAttribute("style")` instead of measured rects.
- The auditor reports failures that are not real: a text colour stuck part-way
  through the 240ms palette transition, measured against a background that
  already finished. Symptom is a handful of elements at ~4.4:1 that pass when
  you audit the same page a second time. **Re-audit before believing a
  failure**, and confirm against the engine in Node if it persists.
- Screenshots come back blank at scrolled positions.

None of this is a bug in the app, and it cost real time to work out twice.

---

## 7. History that still matters

Two rebuilds. You do not need the archaeology, but you do need to know that old
notes describe a different app.

### The palette rebuild — seed-first became palette-first

| Before | Now |
|---|---|
| `#/` was the studio, `#/story` the write-up | `#/` is the story, `#/studio` is the tool |
| One seed colour | A palette of 3–8 swatches, each lockable |
| 11×11 matrix as the centrepiece | Palette-scoped matrix, demoted to a tile |
| `SeedTile`, `ExtractTile`, `PreviewTile` | Deleted. Now `PaletteBar`, `IntakeTile`, `CritiqueTile`, `SitePreview` |
| `exportTokens(name, seed, format)` | `exportTokens(name, colors[], format, withScales)` |
| `stepRoles()` | Deleted, was unused |

The ramp did not go away — it is a drill-down on the selected swatch
(`RampTile`), and the export can emit an 11-step scale under every colour.

### The story rebuild — a write-up became a scroll piece

The studio was not touched. A tool does not perform.

| Before | Now |
|---|---|
| Six numbered sections | **Five**; the gamut section is a `<details>` under 02, every word kept |
| Opened straight into the hero | A ~1.8s entry sequence, on every load |
| Fan deck beside the headline | Fills the right column, deals itself in, drifts on scroll |
| Nothing between hero and 01 | **The pinned strip** — the palette grows into full-bleed columns |
| Figures faded up with their section | Each has its own entrance |
| Footer hex strip | Chips; and the CTA is tilted with a paper grain over it |
| Lenis `duration: 1.15` | `1.6` — the strip needs travel to read |

### Two things in `plan_1.md` that were deliberately not done

**GSAP + ScrollTrigger.** ~34kB gzipped against a 94kB bundle, for effects that
amount to one `getBoundingClientRect` per frame and some `calc()`. On a project
whose pitch is that it wrote its own maths and can defend every dependency,
that is the wrong trade. `src/lib/motion.ts` is the replacement and it is 177
lines including the comments.

**Three generated illustrations.** There is no image-generation tool in this
environment, and a raster image cannot repaint itself when the palette changes,
which everything else on the page does. `Illustrations.tsx` draws them as flat
paper-collage SVG in the live palette instead. If a future session *does* have
an image tool, the answer is probably still no.

### The polish pass — the page stopped looking pink

Four things were changed after the story rebuild, all of them because someone
looked at the page rather than at the code.

| Complaint | What it actually was |
|---|---|
| "The whole page looks too pink, straining, childish" | `buildChrome` allowed the ground `0.019` chroma at L 0.943. Every pixel of the screen was a couple of percent off neutral, so the palette had nothing to be judged against. Now L 0.964 at a `0.0055` ceiling — see the Trace, Not a Wash rule in `DESIGN.md`. |
| "The swatch book is hidden behind the swatch fan" | It was, exactly and completely: 190 lines of drawing stacked concentrically under an opaque fan. The book now lies low and left with its printed page showing, and the fan rides up out of its right-hand page. |
| "The scroll strip does not move" | Reduce Motion was on. See §6. Separately the scrub was rebuilt — it was genuinely ugly in the middle, see §5. |
| "No scroll animations, no cool effects" | Same cause. Everything `plan_1.md` asked for was already built and was being correctly suppressed. |

The repaint itself was also only half-built: `body` cross-faded its own two
colours while every element inside it snapped, because a transition only runs
where it is declared and every surface, hairline and figure reads its colour
from a variable on a different node. It is now declared on everything, at the
studio's 260ms. That is the page's headline claim finally being demonstrated
rather than asserted.

### Bugs found in the polish pass, worth not reintroducing

1. **A Tailwind class glued to a template interpolation is never generated.**
   `` `... pl-4${seen ? " entered" : ""}` `` — the extractor scans raw source
   and takes `pl-4$` as the candidate, which matches nothing. Those note rows
   had had no left padding at all, and the vertical rule between the two cards
   in 01 (`sm:w-px`) had never rendered. Every conditional class in the tree is
   now written with a space before the `${`. It fails silently and it looks
   like a design choice, so it is worth grepping for: `grep -rn '[a-z0-9]\${' src/`.
2. **`ch` resolves against the element's own font, not its children's.** The
   strip's card was `max-w-[22ch]` on a 16px node wrapping a 58px heading, so
   the display line rendered in a 224px box, one word per line. Sized in `rem`
   now.
3. **A trailing space inside an `inline-block` is trimmed.** The strip's
   headline is one span per word for the staggered reveal, and each span held
   its own trailing space — the line rendered as "Everycolouron thispageisearned."
   The space now sits between the spans.
4. **Endpoint tests can pass over a broken middle.** `strip.test.ts` checked
   t=0 and t=1 and was happy while the whole scrub between them was a clumped
   mess. There is now a test that walks the scrub in a box of known width and
   asserts the row stays centred and un-overlapped, and the way it was actually
   found was a throwaway script that rendered six frames of the real geometry
   to an HTML file. Do that before believing a scroll animation is fine.

### Bugs found in the story rebuild, worth not reintroducing

1. **The resting chip row was anchored to the left edge**, half of it
   off-canvas — `left` interpolated from `0%` where it needed `50%`. The first
   version of the unit test encoded the bug rather than catching it.
2. **`prefers-reduced-motion` was sampled instead of subscribed.** Now
   invariant 11.
3. **The hero illustration bled right**, which would have given a 360px phone a
   sideways-scrolling page. It now bleeds left only — left overflow on an
   absolutely-positioned element does not create scrollable width; right
   overflow does.

---

### The studio rebuild — a tool that shows its working

`plan_2.md` in full, minus `⌘K`. The premise that changed first: the studio was
locked as "a tool, and tools don't perform", and the brief moved to a showcase,
so the rule became **the studio may perform, but only by showing its own work**.
Every animation added is a readout of something the engine was already doing and
throwing away.

Three of the plan's own rulings were reversed while building it, and each
reversal is the interesting part:

| The plan said | What shipped, and why |
|---|---|
| Map colours through the simulation *before* `deriveInk` sees them | The opposite. A dichromat sees the page that actually shipped, filtered by their own eye — deriving ink from simulated colours solves for a colour on nobody's screen. One SVG `feColorMatrix` over the finished render is both more honest and ~200 lines cheaper. Invariant 13. |
| Contrast ratios don't move under simulation; that's the payoff | Measured, and false. Protanopia moves some shelf pairs by 57% and drops seven out of AA. The feature reports *two* failures now — colours that merge, and ratios that fall — and the status line only claims a palette survived when it did. Invariant 14. |
| Use a View Transition for the drag reflow | FLIP instead. `startViewTransition` snapshots the whole document, so every swap would cross-fade the matrix, the critique and the preview alongside the two swatches that moved. Twenty lines of measure-invert-play moves exactly what moved. |

One bug found on the way, worth not reintroducing: **ink solved against `--bg`
alone is wrong on a dark ground.** Twenty elements shipped at 4.18:1. The seed
sweep agreed everything was fine, because the sweep was also only checking
`--bg`. See invariant 12.

And one number: the studio's permanent body copy went from roughly 220 words to
about 50. None of it was deleted — the critique's reasoning is `sr-only` and on
the status line, and every removed footnote came back as a live readout of the
specific thing under the pointer.

---

## 8. Known gaps and honest caveats

- **No git history.** See §2.
- **No deploy.** It is a static `dist/`; Netlify/Vercel/Pages all work with zero
  config. This is the biggest remaining gap — a portfolio piece nobody can open
  is not a portfolio piece.
- **The story copy is first-person as *her*.** It is all true of the code, but
  she has to read it and be able to defend every claim. Still the single
  biggest risk to the project's actual purpose.
- **The pinned strip's scrub has now been looked at, but still not watched.**
  The geometry was rendered at eight points across the scrub into a standalone
  HTML file and screenshotted, which is what caught the clumping described in
  §7, and the middle is now covered by a unit test. Nobody has yet seen it
  animate in a browser — that needs a machine without Reduce Motion and a
  visible window.
- **Nothing in the studio's new motion has been watched running.** Every piece
  of it is driven by `requestAnimationFrame`, and rAF does not fire at all in a
  hidden or occluded browser pane — timers throttle to ~300 ms and rAF simply
  never runs, so an automated check sees the first frame and nothing else. What
  *was* verified, and how: the search replay's frame maths is a pure function
  (`frameAt`) tested at one-millisecond resolution across the whole 620 ms;
  present mode was opened, measured at full viewport, and its geometry is the
  already-tested `chipBox`; the drag was driven end to end with synthetic
  pointer events, which reordered the row and updated the address bar. The
  `linear()` spring, the FLIP settle and the power-on stagger have been
  reasoned about and not seen. They need a visible window on a machine with
  Reduce Motion off — same caveat as the pinned strip, above.

- **Drag-to-reorder is pointer-only.** `useReorder` bails on
  `pointerType === "touch"`. On a narrow screen the palette bar is a vertical
  stack, so dragging along it is the same gesture as scrolling the page, and
  taking that over to reorder five swatches is a bad trade. Tap-to-select and
  the per-swatch controls are unaffected. If it is ever wanted on touch, it
  needs a long-press to arm and a real handle, not a lowered threshold.

- **The address bar carries the palette, not the view.** Colours, locks and the
  name are shared; the simulation mode, the dark ground, the selected swatch
  and the scroll position are not. That is deliberate — those are ways of
  looking at a palette rather than part of it — but it does mean you cannot
  send somebody "look at this one under protanopia".

- **Keyboard traversal is not fully audited.** Focus styles are defined and
  controls are real buttons and inputs; the story's `<details>` and repaint
  pills are native elements. But Space is bound to Generate in the studio, and
  although the handler bails when focus is in a field or on a button, that
  deserves a proper pass.
- **The story's entry sequence runs on every load; the studio's runs once per
  session.** Not an inconsistency. The story's preloader is theatre and the
  second visit is usually the same person showing the page to someone else, so
  session-gating would hide the first thing they wanted to show. The studio's
  arrival is polish in front of a tool, and polish you cannot skip is an
  obstacle by the third visit — it is gated on `sessionStorage["tint:arrived"]`.
- **The ramp's `STOPS`, the chroma arc, the harmony offsets and the critique's
  penalty weights are tuned by eye**, not derived. They behave well across
  every palette tested. That is a defensible design choice — do not claim it is
  principled.
- **The critique's thresholds are opinions.** The awkward-hue-gap band (28–55°)
  and the muddy band are judgement calls. Defensible, but a designer may
  disagree — that is a good interview conversation, not a bug.
- **Generated palettes almost always score 100**, because generation optimises
  the score. Correct, but it makes the critique panel look inert until the user
  brings their own colours. Demo it with a hostile paste.
- **Extraction has no loading state for very large images.** It downsamples to
  120px first, but a big file still blocks briefly on decode.
- **The footer CTA's grain is not measured by the auditor.** The audit
  composites `backgroundColor` only, so the 5.5%-opacity noise overlay is
  invisible to it. That is why the CTA's ink is derived at 5:1 rather than
  4.5:1 — the overlay is paid for out of headroom. Measured on the shipped
  page: 5.14:1. If you add another texture over a fill, do the same.

---

## 9. Next things worth doing, roughly in order

Items 4 through 7 of the previous list — colour-blindness simulation, the dark
counterpart, saying *why*, and the palette in the URL — all shipped in the
`plan_2.md` pass. What is left:

1. `git init`, first commit, decide where it lives.
2. **Deploy it.** See §8. Still the biggest gap by a distance: a portfolio piece
   nobody can open is not a portfolio piece, and the studio now has a share link
   that has nowhere to point.
3. **Watch the studio's motion on a real screen.** See §8 — none of the new
   animation has been seen running, only reasoned about and unit-tested. Needs a
   visible window with Reduce Motion off. Do the pinned strip in the same pass.
4. Keyboard traversal pass, especially the palette bar's per-swatch controls and
   the matrix, which is now a grid of ~25 focusable cells. Each one announces
   its pair and ratio through `aria-label`, which is right, but tabbing through
   all of them to reach the tile after it is not.
5. **`⌘K`.** The one beat of `plan_2.md` that was cut. Ranked honestly in the
   plan as high craft signal and medium visual wow, and it is still true.
6. **A second opinion in the critique.** Generated palettes almost always score
   100 because generation optimises the score (see §8). The simulation review is
   the first check the generator does *not* optimise against — a palette can
   score 100 and still merge two colours under deuteranopia. Feeding `review()`
   into `critique()` would close that, and would make the generator pick
   colour-blind-safe palettes for free, since they share one scoring function
   (invariant 10). This is the most interesting remaining piece of work.

---

## 10. How the user works

- **She is not writing this code; her friend is driving.** Explanations should
  be concrete and defensible rather than exhaustive.
- The aesthetic brief was "pastel pinks, nice", plus the bento layout and calm
  scroll of `things.inc`, and later "copy the *idea* of coolors.co, not its
  look". The story page leads with a paint fan deck and computed diagrams
  rather than columns of prose because of that.
- She answers direction questions well when given a real choice with a
  recommendation. Two decisions of hers that shaped the app and should not be
  quietly reversed: **the story is the landing page**, and **nothing of the
  user's changes without a click** (invariant 9).
- Cabinet Grotesk was her pick. Source files live at
  `../CabinetGrotesk_Complete/`; only the three `.woff2` weights are vendored
  into `public/fonts/`, with the licence alongside them.
