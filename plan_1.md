# Tint — Vision & Implementation Plan
### *"The scroll should feel like opening a swatch book by hand"*

---

## What We're Building

The landing page (`CaseStudy.tsx`) transforms from a technical blog post into a **scroll experience** — a piece of art that happens to also explain how the tool works. Your classmates should not be able to stop scrolling. The studio stays exactly as it is (it's a tool, tools don't perform). Only the landing page changes.

The two inspirations map cleanly:

| Inspiration | What we steal from it |
|---|---|
| **Things.inc** | The pacing. The illustrations. The physical-object metaphor. The emotional warmth. The scroll theatre. |
| **Coolors.co** | The idea that pressing a key generates something beautiful. The palette-as-identity mechanic. |

---

## Design North Star

> **"A physical swatch book coming to life."**

When you scroll, you're turning pages of a swatch book. Each section is a new spread. The palette chips drift, stack, fan, and sort themselves as you go. The illustrations feel like something you could hold — soft paper, a little bit of depth, no glass or neon anywhere.

The page must wear the live palette (it already does). That becomes part of the theatre: as you scroll, the page's own colours are changing because the chips above are moving.

---

## Section Architecture (Scroll Experience)

### 0 — Preloader / Entry (NEW)
> *Runs on every page load — always impressive, always the first thing seen.*

A centred palette fan slowly spins into focus against the raw background. The word **"Tint"** types itself in. Then the fan collapses into the navbar as the page drops in.

- ✅ **DECIDED: every page load** — no session gating
- `prefers-reduced-motion`: instant fade-in, skip animation entirely
- Duration: ~1.8s total, Lenis scroll locked during preloader

---

### 1 — Hero (REWORK)
> *Currently: headline + ChipFan + repaint buttons. Good bones, weak theatre.*

**What changes:**
- The ChipFan gets much bigger — it fills the right half of the hero on desktop, ~340px wide
- The fan chips physically **deal themselves** on load: they slide in from below, one by one, 80ms staggered
- The repaint buttons stay but get redesigned as **pill swatches** — wider, with a subtle hover lift and a small "active" glow derived from that palette's accent
- A subtle **parallax**: the fan drifts 15px upward as you scroll into the first section, like a card being placed on a table

**Illustration opportunity #1:** Generate a soft isometric illustration of a physical swatch book open on a desk. Place this behind the chip fan, slightly desaturated, used as a textural layer not a focal point.

---

### 2 — The Live Demo Statement (NEW SECTION — replaces dead air between hero and 01)
> *The big cinematic moment. Borrowed from Things.inc's "tunnel" beat.*

**A full-viewport-width strip** — pinned for ~250px of scroll travel.

While the user scrolls, the 5 palette chips **grow from tiny swatches into full-height columns** that fill the screen edge-to-edge. Think: Coolors.co's generator, but animated as a scroll-driven reveal.

Text reads (in large display type, revealed word-by-word as chips expand):
> **"Every colour on this page is earned."**

Then a second line fades in:
> *"Change the palette. Watch everything recalculate."*

This is the hook. This is what makes them keep scrolling.

**Implementation:** Scroll-driven animation using CSS `animation-timeline: scroll()` + JS fallback via GSAP ScrollTrigger (already used in Things.inc, GSAP is tiny). The chips animate `flex-grow` and the text uses `clip-path: inset(0 100% 0 0)` revealed on scroll progress.

---

### 3 — Section 01: "Soft palettes fail quietly" (REWORK)
> *Currently: two cards with contrast numbers. Good content, flat presentation.*

**What changes:**
- The two demo cards (naive vs. solved) **enter from opposite sides** as you scroll into view — left card slides from left, right card from right, meeting in the centre
- A thin horizontal line animates between them like a dividing ruler
- The contrast ratio numbers **count up** from 1.0 to their real value when the card enters view (a number ticker feels like an instrument being read)

**Illustration opportunity #2:** A small painted icon — a magnifying glass held over a faded text block. Soft, paper-textured, in the palette's own ink colour. Generated and placed as a decorative accent top-right of the section.

---

### 4 — Section 02: "Why OKLCH" (REWORK — KEEP FULL TEXT)
> *Text stays. Page height = scroll breathing room = better animation pacing.*

**What changes:**
- The lead paragraph and body copy are **kept in full** — the text gives the page mass and makes each scroll-triggered reveal feel earned
- The `RampComparison` figure becomes the **hero of the section** — it fills the full content width
- Both ramp strips get a **simultaneous reveal**: they slide in left-to-right like two rulers being laid side by side
- The measured-lightness plot below animates its bars up from zero on scroll entry
- The gamut section (03) collapses into a "↓ Show the geometry" footnote below this section

No illustration needed — the figure *is* the illustration.

---

### 5 — Section 03: "Gamut" (✅ COLLAPSED TO FOOTNOTE)
> *Decided: collapses into a "↓ Show the geometry" disclosure at the bottom of Section 02.*

The `GamutSlice` and `HueWheel` move into a `<details>` element styled as a soft inset note. Text label: *"The geometry, if you want it"*. This preserves every word of the original — it just lives behind one click for readers who want it.

---

### 6 — Section 04: "The number it all rests on" (REWORK)
> *The 4.58:1 statistic is powerful. Currently buried.*

**What changes:**
- The `4.58:1` number becomes a **massive display figure** — `clamp(72px, 15vw, 160px)` — that enters the frame like a stamp being pressed down (scale from 0.7 → 1.0, short spring physics)
- The `InkSearch` animation runs automatically when it enters view (no click needed)
- **Full text kept** — the paragraph about the 5,000-surface test sweep stays; it gives weight and the scroll speed means people will read it

**Illustration opportunity #3:** A small illustration of a pair of eyes squinting at tiny text — playful, paper-textured, used as a marginal decoration. Generated in the style of the swatch-book metaphor.

---

### 7 — Section 05: "A tool with an opinion" (REWORK)
> *The live score is the best feature on the page. Bury it less.*

**What changes:**
- The verdict score gets the same "stamp" entrance treatment as the 4.58:1 number
- The `notes` list items **stagger in** one by one, 60ms apart, each sliding up 12px
- The notes use a thin left-border animation — the border grows from 0% height to 100% as each item enters

---

### 8 — Section 06: "What I left out" (KEEP, STYLE)
> *Good content, honest tone. Just needs better visual framing.*

**What changes:**
- Wrapped in a soft inset box — `background: var(--surface)`, the same treatment as the export tile
- A small "scratch-out" decorative element (X mark, hand-drawn style) added as a marginal illustration

---

### 9 — Footer CTA (UPGRADE)
> *Currently: accent-coloured box with "Now go and break it". Good, needs more energy.*

**What changes:**
- The box gets a **gentle radial noise texture** — a CSS `background-image: url("noise.svg")` at low opacity, giving it the paper warmth of Things.inc's surfaces
- The palette hex strip at the bottom gets more visual prominence — displayed as actual mini-swatches rather than raw hex text
- On desktop, the CTA box **tilts 1.5deg** on scroll enter via a CSS `rotate` transform (like a card dropped on a table)

---

## Illustration Strategy

Three generated illustrations, all in the same style. Generated using the Imagen tool in this session.

**Target style prompt base:**
> *Flat paper collage illustration, warm cream and rose tones, physical swatches, soft torn-paper texture, no gradients, no shadows, editorial illustration style, 2:1 aspect ratio*

| # | Subject | Placement |
|---|---|---|
| 1 | Open swatch book on a desk with colour chips splayed | Hero background layer |
| 2 | Magnifying glass over faded low-contrast text | Section 01 margin |
| 3 | Two eyes squinting, plus a large "4.58" stamped below | Section 04 accent |

All three are generated at correct aspect ratios, converted to WebP, and placed in `/public/illustrations/`.

---

## Animation Stack (FINAL)

| Layer | Tool | Decision |
|---|---|---|
| **Pinned fullscreen strip** (Section 2) | ✅ **GSAP ScrollTrigger** | Decided — worth it for the wow factor |
| Preloader fan + typewriter | GSAP timeline | Runs every page load |
| Stagger reveals (all sections) | GSAP ScrollTrigger + stagger | Unified with GSAP for consistency |
| Number tick-up (ratios, stamp) | GSAP CountTo / custom | Clean integration with scroll trigger |
| Chip fan deal-in | GSAP stagger fromTo | Replaces CSS delay approach |
| Parallax drift (hero fan) | GSAP ScrollTrigger scrub | Buttery smooth with Lenis |
| Lenis scroll speed | `duration: 1.6` | **Slow and cinematic** — Things.inc uses ~1.15, we go slightly slower |

### Scroll Philosophy
> Every section has **breathing room** — minimum `8vh` padding top and bottom. The text is kept full-length intentionally: long sections mean more scroll travel, which means more time for the animations to be appreciated. Fast scrolling is for tools. This is a story.

---

## Decisions — LOCKED

| # | Question | Decision |
|---|---|---|
| 1 | Gamut section | ✅ Collapse to footnote |
| 2 | Pinned fullscreen strip | ✅ GSAP ScrollTrigger |
| 3 | Preloader | ✅ Every page load |
| 4 | Illustration style | ✅ Warm paper collage (analogue, tactile) |
| 5 | Dark mode | ✅ No dark mode — palette swap is the theme system |
| 6 | Text content | ✅ Keep all text — page height = scroll pacing |
| 7 | Scroll speed | ✅ Slow and cinematic — Lenis `duration: 1.6` |

---

## What Stays Exactly the Same

- All the color science logic
- The studio bento layout
- The right-rail section navigator (dots)
- The repaint palette buttons (restyled, not removed)
- The `DESIGN.md` rules — especially no shadows, no hardcoded colours, neutral bench
- Lenis smooth scroll (already installed)
- Cabinet Grotesk + system mono typefaces

---

## Verification Plan

After implementation:
1. Run the existing contrast audit script against all 6 named palettes
2. Check `prefers-reduced-motion` — every animation must have a fallback
3. Verify scroll experience on a phone (the pinned strip degrades gracefully to a standard reveal)
4. Check first-paint score — illustrations are WebP, lazy-loaded below the fold
