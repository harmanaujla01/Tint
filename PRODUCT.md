# Product

## Register

product

## Users

Two audiences, and the design has to serve both without compromise.

**Primary — the working user.** Junior-to-mid frontend developers and design-engineering hybrids who need a colour palette for a real project and know they should be checking contrast, but find the process tedious enough that they skip it. They arrive with a brand colour they've been handed, an image they like the feel of, a few hexes lifted off a site they admire, or nothing but an adjective. They are in a task, mid-build, and want tokens they can paste into a stylesheet in under two minutes. They are not colour scientists and should not need to be.

**Secondary — the evaluator.** A hiring manager or interviewer following a link from a CV, on a phone, between meetings, giving it roughly thirty seconds. They never sign up. They must reach a working, impressive state on the first screen with zero setup, and be able to tell within seconds that someone competent built this.

The second audience is why there is no auth, no account, and no empty first-run state.

## Product Purpose

Turn whatever the user arrives with — one colour, a few hexes off a screenshot, an image, or a sentence describing a mood — into a complete, accessible palette that can be used immediately.

The loop is: **bring → build → judge → export.**

- **Bring** anything: a single hex, a pasted CSS block, an image clustered in the browser, or a description like "something calm and coastal", answered by searching seventy hand-tagged palettes. One box reads the input and works out which of those it was.
- **Build** the rest of the palette around it. Locked colours are honoured exactly; the generator scores ninety candidates and keeps the best.
- **Judge** the result out loud. Seven checks — lightness spread, redundant colours, readable pairs, a colour shouting over the others, mud, awkward hue gaps, no neutral to rest on — each printing the number it is unhappy about, each offering a one-click fix.
- **Export** as CSS custom properties, a Tailwind v4 theme block, or design-token JSON, optionally with an eleven-step OKLCH scale under every colour.

The eleven-step perceptual ramp is still here, and still the technical centrepiece — it is now a drill-down on the selected colour rather than the whole product.

Success is a visitor who came to look and left with a palette they actually used.

The landing page carries a second job, aimed at the evaluator: it is a scroll piece rather than a write-up. A fan deck turns into focus and types the wordmark in; a pinned section grows the live palette into full-bleed columns behind the line *every colour on this page is earned*; the figures deal themselves out as you reach them. None of it is decoration bolted on — every illustration and every figure is drawn from the palette currently in play, so the page is also the largest live demonstration of the product's central claim.

The defining behaviour: **the application's own interface is rendered from the user's current palette.** Change the seed and the chrome re-tints live. This is not decoration — it forces the product to solve its own problem honestly, because no foreground colour can be hardcoded. Every piece of ink must be derived at runtime and must pass AA against whatever surface it lands on.

## Brand Personality

Calm, precise, quietly confident. Three words: **soft, exact, honest.**

Soft surfaces and a sharp instrument. The interface is warm and unintimidating to look at, and utterly rigid underneath — tight grid, aligned baselines, mono numerals, real numbers. Nothing is approximate.

The voice states facts without hedging or cheerleading. "4.51:1 — passes AA, fails AAA" rather than "Looking good!". It never congratulates the user, and it never scolds them. It reports.

Reference: Things / Craft — soft tinted surfaces, tight typography, generous air, everything exactly aligned. Warm without being cute.

## Anti-references

- **Coolors / Adobe Color** — the direct competitors, and a deliberate split. Their *interaction* model is right and worth borrowing: a big palette bar, lock a colour, hit space, iterate fast. Their *aesthetic* is the anti-reference — loud full-bleed blocks, ad-dense chrome, generic tool furniture, and no opinion about whether the palette it just gave you is any good. Their palettes shout; ours are examined, and ours answer back.
- **Generic AI SaaS** — purple-blue gradient hero, glassmorphism, tiny tracked uppercase eyebrows above every section, a big-number stat row. The fastest way to read as machine-generated.
- **oklch.com and dev-tool colour pickers** — technically credible, entirely cold, legible only to people who already understand colour science. We want the same rigour reachable by someone who doesn't.
- **Dribbble-shot styling** — photogenic in a screenshot, collapses on contact with real data. No fake content, no missing empty states, no unhandled edge cases.
- **Cream, sand, beige, parchment surfaces.** The saturated neutral default. If a surface is tinted, it is tinted toward the brand's own hue, deliberately, and never toward generic warmth.

## Design Principles

1. **Practice what you preach.** The tool passes its own audit, and shows the receipts. An accessibility tool that fails accessibility is worthless, and the case study should include the tool run on itself.

2. **The user's colour is the only loud thing.** Every pixel of saturation on screen belongs to their palette, not to ours. The chrome recedes so the subject can be judged.

3. **Neutral where it is judged, brand where it is framed.** Colour cannot be evaluated against a tinted ground. Swatches sit on true neutral; the surrounding frame is where brand identity lives.

4. **Show the number.** Never assert "accessible" — display the ratio and the threshold it was measured against. Honest data beats a reassuring green tick, and it teaches the user something they keep.

5. **Nothing of the user's changes without a click.** The tool is picky and says so, but it is never the one editing. A colour the user brought is locked on arrival and survives every generate; the critique can *offer* to replace it, labelled plainly as destructive, and that is the user's call. A tool that silently improves your input teaches you nothing and cannot be trusted with the input you cared about.

6. **Finished beats featureful.** Every state exists — empty, loading, invalid input, unsupported file, no result — before any new feature is considered. A complete small thing outranks an impressive broken one.

## Accessibility & Inclusion

**WCAG 2.2 AA throughout, verified, not claimed.** Body text ≥4.5:1, large text and UI component boundaries ≥3:1, across every surface including the dynamically re-tinted chrome. Because the chrome derives from arbitrary user input, this is enforced in code at runtime rather than checked once at design time.

- **Colour is never the sole carrier of meaning.** Pass/fail states use an icon and a text label alongside colour. Non-negotiable here specifically: a colour-blind developer is a core user of a contrast tool, and signalling "fail" in red alone would be a self-refuting bug.
- **Keyboard complete.** Every control reachable and operable without a pointer, with a visible focus ring that itself meets 3:1 against both adjacent surfaces.
- **`prefers-reduced-motion` respected** on every transition, with a crossfade or instant fallback rather than no state change.
- **Numeric values always visible** as text, never conveyed only by swatch position or size.
- Image upload has a typed/pasted equivalent path, so the tool is fully usable without drag-and-drop.
