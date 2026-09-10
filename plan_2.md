# Tint — Studio Plan
### *"The instrument, opened up"*

Written 2026-09-02, after the story page landed. Read `HANDOFF.md` and
`DESIGN.md` first — this plan breaks one of their rules on purpose and leans
hard on several others.

---

> ## Status: built, 2026-09-02
>
> **Beats 1–10 and 12 shipped. Beat 11 (`⌘K`) was cut.** All four phases.
> 47 tests pass, contrast audits clean across sixteen studio states, runtime
> dependencies unchanged at three, about 6 kB gzipped for the whole thing.
>
> **Three rulings in this document were reversed while building it**, and the
> reversals are worth reading before trusting the rest of it:
>
> 1. **§7 item 1 is backwards.** It says a simulation must map colours *before*
>    `deriveInk` sees them. A dichromat sees the page that actually shipped,
>    filtered by their own eye — deriving ink from simulated colours solves for
>    a colour on nobody's screen. One SVG `feColorMatrix` over the finished
>    render is both more honest and far cheaper. See `HANDOFF.md` invariant 13.
> 2. **Beat 2's premise is false as stated.** "The contrast numbers do not
>    move" was measured and is wrong: protanopia moves some shelf pairs by 57%
>    and drops seven of them out of AA. The feature is *better* than the plan
>    thought — it catches two independent failures — but the wording it was
>    specified with would have been a lie printed on the status line. See
>    invariant 14.
> 3. **Beat 7 uses FLIP, not View Transitions.** `startViewTransition`
>    snapshots the whole document, so each swap would cross-fade the matrix,
>    the critique and the preview along with the two swatches that moved.
>
> One bug found on the way, recorded because the seed sweep agreed with it:
> ink solved against `--bg` alone is wrong on a dark ground, and shipped twenty
> elements at 4.18:1. See invariant 12 and the Harder Ground Rule in
> `DESIGN.md`.

---

## 0. The premise has changed, and it should be said out loud

`plan_1.md` locked this:

> The studio stays exactly as it is (it's a tool, tools don't perform).

`DESIGN.md` §5 turned that into the Split Motion Rule, and `HANDOFF.md` §7
repeats it: *"A tool does not perform."*

That rule was right for a product. It is wrong for **this** artefact, because
the brief has changed: *"this app is more of a showcase than a tool for us, we
wanna show our design skills."* Nobody is going to manage their brand colours
in Tint on a Tuesday. The people who open it are going to be looking at it for
ninety seconds, deciding whether the person who built it can do this job.

So the rule is being replaced, not deleted:

> **The studio may perform, but only by showing its own work.**
> Motion that reveals what the engine is doing: allowed, encouraged, make it
> beautiful. Motion that decorates a thing the engine is not doing: still
> banned.

That distinction is what keeps the interview answer intact. "Why does your tool
animate when you wrote that tools shouldn't?" — *"Because every animation in it
is a readout. The generator really does score ninety candidates; you can watch
it. The critique really is the generator's fitness function; you can see it
change its mind. None of it is decoration, and I can point at the function each
one is drawing."* That is a better answer than the one we have now, which is
that the most interesting engine in the project is invisible.

Everything below follows from that one sentence.

---

## 1. What is actually wrong with the studio today

Looked at, not assumed. At 1512×950 the whole thing is 1750px tall and the
bottom third is below the fold.

**1. Roughly 220 words of body copy are competing with the data.** The header
lead (40), the matrix footnote (35), the ramp footnote (18), the preview
footnote (30), three critique details (75), the footer (25). Every one of them
is true and well written, and every one of them is read exactly once. In a
tool that is fine. In a ninety-second showcase it is the thing that makes the
page read as *dense* rather than as *sharp*. This is the complaint.

**2. There is no focal point.** Six tiles, all `--surface`, all with a 13px
muted label top-left and a mono value top-right, all roughly the same visual
weight. The eye has nowhere to land, so it reads the text — which is problem 1.
`DESIGN.md` says *"tiles span different amounts because their content differs"*,
and right now they mostly don't.

**3. Nothing moves, ever.** Press Generate and five colours snap to five other
colours. The single most impressive fact about this codebase — that
`generate()` builds ninety candidates, scores every one of them with the same
function that writes the critique, and keeps the best — is completely invisible.
We built a search engine and rendered its output as a static swatch.

**4. The tool throws away its own reasoning.** `fromHarmony()` picks a scheme
(`split`, `triad`, `tetrad`…) on line 194 of `harmony.ts` and drops the name on
the floor. This is already logged as `HANDOFF.md` §9 item 6.

**5. The best feature looks like release notes.** The critique is the
opinionated core of the product and it renders as a scrolling list of
title-plus-paragraph rows.

**6. The app does not keep a promise the story makes.** Section 05 says
colour-blindness simulation is *"the next thing I would build"*. Right now
that is a promise, not a feature. (`HANDOFF.md` §9 item 4.)

---

## 2. What the research says

### 2.1 things.inc — what is actually stealable

Fetched and read rather than remembered. The site runs a **simulated boot
sequence** (a fake BIOS, peripherals loading) before it will show you anything;
a **day/night toggle** that swaps entire image sets; **multi-layer cloud
parallax** on scroll; a **hex-grid** of 22 room previews; and a **scavenger
hunt** — six collectible items with an `0/6` counter that persists as you move
around.

The transferable idea is not the pixel art. It is that **every interface
element is pretending to be a physical object with a mechanism**, and the site
lets you operate the mechanism. We already have this instinct — the swatch book
and the paint fan on the story page — and the studio has none of it.

### 2.2 What is winning awards right now

The Awwwards 2025 Site of the Year (Lando Norris, by OFF+BRAND) is WebGL, GSAP,
Rive, 3D helmet rotations and shader-driven cursor lighting. **We are not doing
any of that**, and we should be able to say why in one sentence: it costs a
third of our bundle again to draw things our product is not about.

But one line from that research is worth pinning above the desk:

> Award craft lives *between* states — page-to-page, hover-to-active,
> scroll-in. Cheap sites cut; award-winners move.

That is achievable with zero dependencies, and it is precisely what the studio
does not do. Every state change in the studio is currently a cut.

### 2.3 What makes tool interfaces feel premium

The consistent finding across Linear, Raycast, Vercel, Figma and Stripe:
**sub-100ms response on everything**, **keyboard-driven**, **a single accent
used with restraint**, and power hidden behind one shortcut rather than spread
across the chrome. Roughly three-quarters of design-led SaaS sites are
dark-with-one-neon-accent — which `DESIGN.md` explicitly rejects, and that
rejection is now a differentiator rather than a risk. Being the light,
paper-warm, non-neon one in that field is a position, not a compromise.

### 2.4 What the competition actually fails at

This is the most useful thing the research turned up, because it tells us what
to make visible.

| Tool | The structural hole |
|---|---|
| **Coolors** | Five swatches with **no defined roles** — the user decides what is background, accent, text. Its contrast checker tests **pairs in isolation**, so a button that is fine on paper and illegible on the real page passes. |
| **Huemint** | **Does not check accessibility at all.** Reviewers explicitly warn never to ship a Huemint palette without checking contrast by hand. |
| **Adobe Color / Paletton** | Consider WCAG during generation, but the check is a separate mode you visit, not a property of the output. |
| **Realtime Colors** | The closest competitor and genuinely good — live preview on a real layout, instant repaint, contrast indicators. Its palette still has no *opinion*: it will happily show you a bad one, prettily. |

Tint already beats all four **structurally** — roles are assigned, ink is
*derived* rather than checked, the whole interface is the proof, and the
critique is the generator's own fitness function. The studio currently
communicates none of that in the first ninety seconds. **Every beat below is
an attempt to make an existing structural advantage visible.**

### 2.5 What we can build with, for free

Three platform features have landed since this project's stack was chosen, and
all three do what an animation library would have been hired for:

- **`linear()` easing** — supported in every modern browser since 2024. Real
  spring and bounce curves in pure CSS, expressed as a list of stops, values
  over 1 overshooting. This is spring physics for zero bytes, and it is the
  single best fit for a project whose pitch is that it wrote its own maths.
- **Same-document View Transitions** — Chrome 111+, Safari 18+, Firefox 144+.
  Animates a DOM change we would otherwise have to FLIP by hand. Exactly what
  a palette reorder needs. Wrap in a capability check; browsers without it get
  the cut they get today.
- **CSS scroll-driven animations** (`animation-timeline`) — ~84% global, but
  still behind a flag in stable Firefox as of June 2026. **Enhancement only.**
  `motion.ts` stays as the mechanism; this is not a rewrite opportunity.

No new runtime dependency. The dependency list stays `react`, `react-dom`,
`lenis`.

---

## 3. North star

> ### "The instrument, opened up."
>
> The story page is a swatch book. The studio is the **machine that made it,
> with the back taken off** — a measuring instrument where you can see the
> movement working. Everything that moves is a readout.

Three rules that fall out of it:

1. **If it moves, it is showing you a number.** No easing for the sake of easing.
2. **Prose becomes a readout.** Explanations do not sit permanently in the
   layout; they appear where and when you are actually looking.
3. **The palette is the only saturated thing.** Unchanged, and now enforced by
   `DESIGN.md`'s Trace, Not a Wash rule.

---

## 4. The beats

Ranked by wow-per-line. Each one names what changes and roughly where.

---

### ★ Beat 1 — Watch it think *(the centrepiece)*

**Today:** press `space`, five colours snap to five others.

**Proposed:** press `space` and the palette bar plays the search. Around
600–700ms in which real candidate palettes flicker through the bar — not fake
ones, actual entries from the ninety `generate()` already builds — with the
verdict score ticking live beside them. Then the winner lands on a `linear()`
spring, the score counts up to its real value, and a single mono line writes
itself underneath:

> `90 candidates · scored · kept #37 — split-complement`

**Why it wows:** it is the most impressive thing the codebase does and it is
currently invisible. No competitor can copy it, because none of them score.
Watching a machine reject eighty-nine options and explain the one it kept is
the entire product argument delivered in under a second, without a word of prose.

**Cost:** `generate()` optionally returns its trail and the winning scheme
name — a return-type change in `harmony.ts`, not a rewrite. The animation is a
`setTimeout` walk over an array plus the `useCountUp` hook that already exists.

**Care:** the tool must stay fast. The winner is computed synchronously as it
is now; the animation is a replay, and pressing `space` again must interrupt it
instantly rather than queue. Under `prefers-reduced-motion` the winner appears
immediately with the readout line — the sentence is the content, the flicker is
the decoration.

---

### ★ Beat 2 — Colour-blind mode *(the biggest differentiator)*

**Today:** the story page promises this and the app does not do it.

**Proposed:** a three-position control — *Normal · Deuteranopia · Protanopia ·
Tritanopia* — that re-renders **the entire studio** through the simulation, not
a preview swatch. The palette bar, the site preview, the matrix, the chrome
itself. With the 260ms repaint already in place, the whole page washes into a
different world.

And then the payoff that only Tint can deliver: **the contrast numbers do not
move.** The ratios are luminance-based, so a palette that passed still passes,
while two swatches that looked distinct visibly collapse into each other. The
matrix grows a new kind of warning — *"these two are 4.9:1 apart and
indistinguishable to 8% of men."*

**Why it wows:** Huemint does not check accessibility at all; Coolors checks
pairs in isolation. This is the one check a printed ratio genuinely cannot make
for you, it is spectacular to look at, and it is a real feature rather than an
effect. It is also already flagged as the right next thing in `HANDOFF.md` §9.

**Cost:** three 3×3 matrices in `color.ts` (the standard Brettel/Viénot
transforms) plus a mode in `App.tsx` that maps colours before they are painted.
The maths is small and testable, which is the house style.

---

### ★ Beat 3 — Kill the prose, build the readout

**Today:** ~220 words of body copy spread across six tiles.

**Proposed:** one persistent **status line** across the bottom of the studio —
the convention every professional instrument uses, from Photoshop to Blender to
Figma. It narrates whatever the pointer or keyboard focus is on:

- hovering a matrix cell → `#F4A9BE on #FFF1F3 — 1.42:1 · fails AA · needs 3.17× more`
- hovering a ramp step → `step 600 · L 0.52 C 0.089 H 359 · clamped to sRGB at C 0.094`
- hovering the score → `seven checks · this palette flags three`
- idle → the ink readout the footer already shows

Every existing sentence survives — it moves from *always* to *when you are
looking at the thing it describes*. The grid loses about fifteen lines of type
and gains a focal hierarchy for free.

**Why it wows:** it is the single change that most directly answers "there's so
much text", and a live status line is instantly legible as *professional tool*
in a way that a paragraph never is.

**Cost:** one context or lifted state, a `useStatus()` hook, and `onPointerEnter`
/ `onFocus` handlers on the things worth describing. Roughly 40 lines plus
deletions. It should be net-negative on line count.

**Care:** a status line that only speaks on hover is invisible to a keyboard
and to a phone. It has to fire on `focus` as well, and on touch the tiles keep
a collapsed native `<details>` — the same disclosure pattern the story page
already uses for the geometry section.

---

### ★ Beat 4 — The matrix becomes the instrument

**Today:** an n×n grid of small cells in a mid-sized tile.

**Proposed:** promote it, and give it a crosshair. Hovering a cell dims every
other cell to a whisper, lights its row and column headers, and blows the pair
up into a live specimen — the two colours at real size with real text set on
them at the actual derived ink, and the ratio counting up. Move along a row and
the specimen follows you.

**Why it wows:** this is the most beautiful object in the app and the clearest
demonstration of the thing Coolors structurally cannot do — every pair at once,
in context, rather than one pair in an isolated checker. It is also the natural
home for the Beat 2 warnings.

**Cost:** presentation only. `MatrixTile.tsx` plus its grid area. No engine work.

---

### ★ Beat 5 — Say why

**Today:** `harmony.ts:194` picks a scheme and discards the name.

**Proposed:** a reasoning ribbon under the palette bar, in mono:

> `split-complement from #C97B94 · lightness spread 0.52 · 2 hue families · 3 locked`

Static, always visible, one line. It is the tool showing its working, and it is
what turns the critique from an assertion into an argument.

**Why it wows:** the research on what hiring managers actually read is
unambiguous — they are looking for evidence of decisions, not polished output.
A tool that narrates its own reasoning is that evidence, built into the artefact.

**Cost:** thread the scheme name out of `fromHarmony`. Genuinely small, and
Beat 1 needs the same change, so do them together.

---

### ★ Beat 6 — Re-weight the bento

**Today:** six tiles of near-identical visual weight; `SitePreview` — the
payoff, the thing that proves the palette works — is one of six.

**Proposed:** obey the system's own rule that size follows content. The site
preview and the matrix get the space; export and ramp get less. The palette bar
grows. The header lead paragraph goes (Beat 3 rehomes it) so the tool starts at
the top of the screen instead of 130px down.

**Cost:** `index.css` grid areas at all three breakpoints, plus the
`nth-child` rules. Watch out for `HANDOFF.md` §5 — **the bento is ordered by
child index**, so moving a tile in `App.tsx` silently rearranges the layout.

---

### ★ Beat 7 — Pick it up

**Today:** the palette bar is a passive strip.

**Proposed:** drag to reorder, on a real spring. `linear()` gives us the physics
free; a View Transition covers the reflow when `orderByLightness` puts things
back. Grabbing a swatch lifts it a couple of degrees off the sheet, its
neighbours make room, and it settles with a small overshoot.

**Why it wows:** it is the most tactile thing a palette tool can offer, it is
the thing people remember about Coolors, and doing it with pure-CSS springs
rather than a drag library is exactly the kind of detail this project exists to
demonstrate.

**Care:** invariant 9 — *nothing of the user's changes without a click*. Drag is
an explicit gesture, so this is fine, but the reorder must be undoable and must
not silently re-sort afterwards.

---

### ★ Beat 8 — Present mode

**Proposed:** one key — `f`, or a small icon on the palette bar — and the
palette expands to full-bleed columns with hex labels. Escape brings the tool
back.

**Why it wows:** it is the money shot for a screenshot, and it ties the two
routes together — the studio doing, on demand, the move the story page's pinned
strip does on scroll.

**Cost:** nearly free. `strip.ts` already computes exactly this geometry and is
unit-tested at both ends and across the scrub. This is reuse, not new work.

---

### ★ Beat 9 — The same palette, solved for dark

**Proposed:** a toggle that re-solves the palette against a dark ground —
`deriveInk` run the other way, the site preview flipped, every ratio recomputed
and still printed.

**Why it wows:** almost no palette tool does this well, the contrast machinery
is already there, and it is a second full-page wash on a page that has just
proved it can wash beautifully.

**⚠ Conflict to settle first:** `plan_1.md` decision #5 locks *"No dark mode —
palette swap is the theme system."* The resolution I would argue for is that
this is not a site theme, it is **a second answer for the same palette** — a
product feature that happens to look like dark mode. But it is a reversal of a
locked decision and it is your call, not mine.

---

### ★ Beat 10 — Power on

**Proposed:** the studio arrives rather than appears. The palette bar deals
itself in, the tiles land on a 40ms stagger, ~400ms total. Once per session, not
per load — the story page's entry sequence is on every load because it is
theatre; the studio's is polish and would grate by the third visit.

**Cost:** the classes already exist in `index.css` (`.chip-deal`, `.enter-up`).
Mostly wiring plus a `sessionStorage` flag.

---

### ★ Beat 11 — `⌘K`

**Proposed:** one shortcut for every action — generate, add, lock, export,
switch palette, toggle simulation, present. The research is consistent that
this is the shared signature of every tool that reads as premium.

**Honest ranking:** high craft signal, medium visual wow. Worth doing, worth
doing last.

---

### ★ Beat 12 — Put the palette in the URL

Not a wow. A multiplier on all of them. Right now a person who makes something
they like in Tint cannot show it to anybody. `HANDOFF.md` §9 item 7 notes it
was deliberately not built because it adds a state-sync loop — that reasoning
was correct for a tool and is wrong for a showcase, because sharing *is* the
distribution.

---

## 5. Deliberately not doing

| | Why |
|---|---|
| **GSAP, Framer Motion, Motion One** | ~34kB gzipped against a 94kB bundle, for effects that are arithmetic. Same answer as `plan_1.md`, and `linear()` has since made it even easier to defend. |
| **WebGL / shaders / 3D** | It is what won Awwwards this year and it is wrong here. A colour tool that renders its colours through a shader pipeline has introduced a colour-management question it cannot answer, in the one product where that must not be in doubt. |
| **Sound** | Genuinely effective, per the research. But this is a portfolio piece someone may open in an open-plan office or a lecture, and audio that fires unasked is a liability at exactly the wrong moment. |
| **A custom cursor** | Signature move of the award sites. It also breaks the one thing a colour tool must get right — precise pointing at small swatches. |
| **Dark-with-neon-accent** | Three-quarters of design-led SaaS looks like this. Being the light, paper-warm one is the position. |
| **Scroll hijacking in the studio** | Invariant 5. Still true. Lenis stays on the story route only. |
| **Rewriting `motion.ts` onto CSS scroll timelines** | Still flagged in stable Firefox as of June 2026. Enhancement, not foundation. |

---

## 6. Suggested order

**Phase A — the complaint, answered.** Beats 3, 6, 5. Removes the prose, gives
the grid a focal point, and makes the tool narrate itself. Mostly deletions.
The studio stops looking dense before anything starts moving.

**Phase B — the centrepiece.** Beats 1 and 4. The generator becomes visible and
the matrix becomes an instrument. This is where "wow" actually arrives.

**Phase C — the differentiator.** Beat 2, then 9 if it survives §4's conflict.
Real features, spectacular to look at, and nothing else on the market has them.

**Phase D — the finish.** Beats 7, 8, 10, 11, 12.

Each phase is shippable on its own, and A on its own already fixes the thing
that was actually complained about.

---

## 7. What must not break

Carried forward from `HANDOFF.md` §4, because every one of these is reachable
from something above:

1. **No hardcoded foreground colours.** Beat 2 is the risk here — a simulation
   mode must map colours *before* `deriveInk` sees them, never after, or the
   derivation is solving for a colour that is not on screen.
2. **Chroma-0 bench** wherever colour is judged. Beat 4 sits directly on it.
3. **`prefers-reduced-motion` is subscribed, not sampled** (invariant 11). Every
   beat needs its finished-state fallback, and the machine that Reduce Motion
   was left on for a fortnight is the machine this will be demoed from — see
   `HANDOFF.md` §6.
4. **Nothing of the user's changes without a click** (invariant 9). Beat 7's
   drag is an explicit gesture; the reorder must not silently re-sort after it.
5. **The bento is ordered by child index.** Beat 6 touches this directly.
6. **Colour is never the sole carrier of meaning.** Beats 2 and 4 both add
   colour-coded state; both need the word and the number as well.
7. **Contrast audit stays at zero failures.** Re-run `scripts/audit-contrast.js`
   after every phase, and remember it now settles transitions before measuring.

---

## 8. Decisions needed before coding

1. **Does the studio get to perform at all?** (§0.) Everything here assumes yes.
2. **Dark counterpart** — reverse `plan_1.md` decision #5, or leave it? (Beat 9.)
3. **How far do we go?** Phase A alone is a real improvement. A→D is a
   different-league artefact and a lot more surface to keep correct.
4. **Anything above that should be cut** because it does not sound like you.
