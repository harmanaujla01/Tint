---
name: Tint — Aesthetic & Concept Research
description: What to fix, what to sharpen, and what to build next — grounded in Tint's own design rules, not generic trends.
date: 2026-09-03
---

# Tint — Aesthetic & Concept Research

This is a working brief, not a rewrite. Tint already has an unusually strong,
opinionated design system (`DESIGN.md`) — the goal here is to make the page win
on its *own* terms, not to bolt on the Awwwards clichés `DESIGN.md` explicitly
bans (glassmorphism, purple-blue hero gradients, big-number stat rows, Dribbble
styling). Everything below is filtered through Tint's three load-bearing rules:

- **Borrowed Chrome** — no hardcoded foreground colour, ever.
- **No shadows** — depth is a lightness step.
- **The Readout Rule** — motion is only allowed if you can name the function it
  is drawing. Nothing is revealed *by* motion.

---

## 0. The bug you reported — fixed

**Symptom:** the horizontal rooms' animations play before the room is on screen,
so the motion is spent by the time you arrive.

**Root cause.** Every room arms its count-ups and staggered reveals from
`useInView(...)` (an `IntersectionObserver`) with rootMargin `"0px"`. But the
rooms don't scroll *up* into view — they travel *sideways* inside the pinned
track (`Track.tsx`, driven by `usePinnedTrack`). With a `"0px"` margin the
observer fires the instant a room's leading edge crosses the viewport's right
edge — which is a **full viewport away from centre**, exactly where the track
sets `--near ≈ 0` and paints the room at `opacity: 0.14`, scaled back and still
mostly clipped. The 1.1 s count-ups and the `enter-up` stagger then run and
finish during that dim approach. By the time you scroll the room to centre,
there is nothing left to watch.

This isn't just a bug — it's a violation of Tint's *own* rule that "motion only
paces content that already shipped" and that a room's "arrival is a pure CSS
consequence of where you are."

**Fix (shipped in `src/components/Rooms.tsx`).** One shared constant, five call
sites:

```ts
// The horizontal twin of the vertical page's INNER margin.
const ARRIVE = "0px -40% 0px -40%";
```

Insetting the observer root 40% on each side turns it into a narrow band down
the middle of the screen. `seen` now flips only once the room is ~40% of the way
to centre (`--near ≈ 0.4`), so the count-up lands *as* the room settles, not a
screen early. Typechecks clean; all 58 tests pass.

> **Verify note:** this Mac has *Reduce Motion* enabled, which disables the
> pinned track entirely (`usePinnedLayout` returns `false`) and renders the
> vertical fallback. So this fix could not be eyeballed in-browser here — it's
> confirmed by typecheck, the `track.test.ts` suite, and the logic. Verify on a
> ≥1100px viewport with Reduce Motion **off**: scrub slowly through the track
> and confirm each room's number counts up around the moment it centres.

**Tuning knob left for you:** `-40%` fires at `--near ≈ 0.4`. If you want the
count-up to resolve *exactly* at dead-centre, tighten toward `-45%`; if it feels
like it fires too late on a fast flick, loosen toward `-33%`. It's one number.

### A second motion bug found in passing (not yet fixed)

`src/index.css`, the `@media (prefers-reduced-motion: reduce)` block (~lines
312–348) accidentally **re-declares** `.bar-deal` and `.bento-arrive` with their
*full* animations instead of `animation: none`. So a reduced-motion user — the
exact person who asked the page to hold still — still gets the studio's deal and
tile-arrival motion. This contradicts the Split Motion Rule ("reduced motion
renders the finished state"). The fix is to replace those re-declarations with
`animation: none;` (as the neighbouring `.score-pop`/`.bento-repaint` lines
already do). Left unapplied because it's outside the reveal-timing ask — say the
word and it's a two-line change.

---

## 1. Motion — the honest next step

### The native option (biggest craft upgrade, medium effort)

The reveal system is hand-rolled `IntersectionObserver` + class toggles. That
was the right call when it was written, but **CSS scroll-driven animations**
(`animation-timeline: view()` / `scroll()`) went Baseline across all major
browsers in late 2024 and are the current award-circuit default. They run on the
compositor, off the main thread, so they cannot cause scroll-jank the way a
main-thread IO callback or a per-frame `getBoundingClientRect` can.

Two caveats that matter *specifically* for Tint:

1. **`view()` alone would reproduce the exact bug we just fixed** — it keys off
   an element's visibility in the viewport, so a sideways-travelling room would
   still trip at its leading edge. You'd need an explicit `animation-range`, or
   to drive the room reveals off the `--near` variable the track already
   publishes. `--near` is the honest source of truth here; prefer it.
2. Keep the JS path for the pinned track's *transform* (it's already off-React
   and correct). The win is narrower: retire IO for the simple vertical
   `enter-up` / `reveal-armed` reveals on the fallback page, where `view()` is a
   clean 1:1 replacement and deletes code.

Net: **less code, less main-thread work, same look.** That's the ponytail win
and the craft win at once. Scope it as "replace the vertical reveal observers
with `animation-timeline: view()`; leave the track's rAF transform alone."

### Cheaper motion wins (low effort, high polish-per-line)

- **Honour the `--near` depth in the far wall labels too.** The vertical hex
  labels on the wall columns are static; letting their opacity track `--near`
  would make the parallax read as one coherent depth system rather than a moving
  layer with fixed type on it.
- **Scroll-velocity easing on the count-ups.** Right now every count-up is a
  fixed 1.1 s cubic. Feeding it the same smoothed scroll velocity the drag tilt
  already uses would make a slow, deliberate scroll get a slow readout and a
  fast flick get a snappier one — the number "keeps pace with your hand."
- **A single settle cue when the track releases into the CTA.** The tail is 14%
  of stable time; a one-frame easing of the CTA's `tilt-in` keyed to
  `--travel === 1` would make the hand-off out of the track feel authored rather
  than incidental.

---

## 2. Aesthetics — sharpening what's already there

Tint's problem is not that it's ugly; it's that its restraint can read as
*flat* on first paint, before you've scrolled or repainted. Judges reward
"personality + craft" and "delight that makes work memorable"
([Case Study Club](https://www.casestudy.club/journal/ux-designer-portfolio),
[Muzli](https://muz.li/blog/top-100-most-creative-and-unique-portfolio-websites-of-2025/)).
Tint's delight is real but *earned late* (it lives in the repaint and the
track). Bring some of it forward without breaking a single rule:

1. **Make the first five seconds prove the thesis.** The hero already has the
   repaint chips. Consider auto-playing one repaint on load (once per session,
   like the bento arrival) — a single, slow, unprompted palette wash across the
   hero that stops on the opening palette. It literally demonstrates the product
   ("every colour re-solves") before the user does anything, and it's a legal
   readout: you can name the function (`buildChrome` over several hundred
   derived colours). This is the highest-leverage single change on the page.

2. **Type as the hero surface.** Cabinet Grotesk Bold at 62px is good; the
   award-circuit move is to let the *display* type carry more of the identity —
   a larger, tighter hero line, and the section numbers (`01`–`05`) set much
   bigger as a structural device rather than a 13px muted tag. This costs
   nothing (no new weight, no new font) and reads as confidence. Stay inside the
   Three Weights Rule.

3. **The hairline system can do more work.** With no shadows, the hairline *is*
   the depth grammar. Right now it's uniform. Letting the active/subject tile
   carry a slightly stronger hairline (still ≥3:1) — as the studio's active
   repaint pill already does — would give the eye somewhere to land, which
   `DESIGN.md` itself names as the bento's original weakness.

4. **Grain, used once more.** The paper-noise on the footer CTA is the single
   texture and it's lovely. One more *disciplined* use — e.g. a whisper of it on
   the pinned strip's full-bleed columns, masked and paid for out of contrast
   headroom exactly as the footer is — would tie the "physical swatch book"
   metaphor together at its most cinematic moment. Do **not** spread it further;
   the power is in its scarcity.

**What to keep resisting:** every generic "make it pop" instinct — gradients,
glows, floating cards, a dark hero. Tint's whole credibility is that it doesn't
do those. The brief is *more confident*, not *more decorated*.

---

## 3. Concept — "introduce something better"

The strongest concept upgrade is hiding in plain sight, and it's on-thesis:

### Move from WCAG 2 to APCA (the contrast frontier)

Tint's entire argument is "the number next to the colour." That number is
currently **WCAG 2.x's 4.5:1**. But WCAG 2's contrast maths is widely known to
be wrong for exactly Tint's audience: it mis-rates light-on-dark, it's blind to
font weight and size in the way real reading is, and it's being *replaced*.
**APCA (Accessible Perceptual Contrast Algorithm)** is the candidate method for
WCAG 3, and competing OKLCH tools already ship it —
[Accessibility.build](https://accessibility.build/tools/color-palette-generator)
grades on APCA, and the trend across 2026 OKLCH tools is live WCAG 2 **and**
APCA side by side.

For a tool whose thesis is "most palette tools stop at pretty; I do the
accessibility maths myself," **being the tool that shows you where WCAG 2 and
APCA disagree is a genuine, defensible product idea** — not a feature bolt-on.
It's the same move Tint already makes with colour-vision simulation ("the
reassuring number is a lie; here's the real one"). APCA is that argument again,
one level up: *the contrast standard itself is a lie in the cases you care most
about.* This is the "something better" the user asked for, and it's the one that
fits Tint's voice perfectly. `DESIGN.md`'s "No reassuring numbers" rule is
practically an APCA manifesto already.

Scope: `deriveInk()` and `critique()` already isolate the contrast maths in
`src/lib/`. Adding an APCA lightness-contrast (Lc) readout alongside the ratio
is additive, and the "where they disagree" view is a new figure, not a rewrite.

### Smaller concept moves

- **Export the *reasoning*, not just the tokens.** The page's whole value is
  that every colour is defended. Let the export carry the defence — a commented
  token file where each value ships with its measured ratio and the note that
  justified it. Nobody else's export does this; it's Tint's differentiator made
  portable.
- **A permalink that's a critique, not just a palette.** The share URL already
  encodes the palette. Encoding the *verdict* too — so a shared link opens on
  "score 71, two colours doing the same job" — turns every share into an
  argument, which is the product's personality.
- **Colour-blindness simulation is listed as "the next thing I'd build"** in
  room 05 and the studio already has `VisionControl`. Finishing it on the story
  page (not just the studio) closes the loop the case study explicitly opens.

---

## 4. Prioritised — do these in order

| # | Change | Effort | Why |
|---|--------|--------|-----|
| 1 | **Room reveal timing** (done) | — | Fixes the reported wasted motion; restores the page's own rule. |
| 2 | Reduced-motion `.bar-deal`/`.bento-arrive` → `animation: none` | trivial | A real accessibility bug; two lines. |
| 3 | Auto-play one hero repaint on load (once/session) | low | Proves the thesis in the first 5 s; biggest delight-per-line. |
| 4 | Bigger display type + structural section numbers | low | Confidence, zero new tokens. |
| 5 | APCA / Lc readout beside the WCAG ratio | medium | The on-thesis concept upgrade; the "something better." |
| 6 | Retire vertical reveal IO for `animation-timeline: view()` | medium | Less code, off-main-thread; keep the track's rAF transform. |
| 7 | Export the reasoning; encode the verdict in the share URL | medium | Turns the differentiator portable. |

---

## Sources

- [CSS scroll-driven animations — Chrome for Developers](https://developer.chrome.com/docs/css-ui/scroll-driven-animations)
- [Scroll-driven animation timelines — MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll-driven_animations/Timelines)
- [CSS Scroll-Driven Animations Killed IntersectionObserver — Talha Tahir](https://www.thetalhatahir.com/blog/css-scroll-animations-killed-intersection-observer)
- [Scrolling design patterns and when to use each — Lovable](https://lovable.dev/guides/scrolling-designs-patterns-when-to-use)
- [Best scrollytelling examples 2026 — Maglr](https://www.maglr.com/blog/best-scrollytelling-examples)
- [Top 20 UX designer portfolios 2026 — Case Study Club](https://www.casestudy.club/journal/ux-designer-portfolio)
- [100 best designer portfolios of 2026 — Muzli](https://muz.li/blog/top-100-most-creative-and-unique-portfolio-websites-of-2025/)
- [Accessible Color Palette Generator (WCAG 2.2 + APCA) — Accessibility.build](https://accessibility.build/tools/color-palette-generator)
- [Atmos — OKLCH palette playground](https://atmos.style/playground)
