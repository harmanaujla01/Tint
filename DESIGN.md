<!-- SEED: re-run /impeccable document once there's code to capture the actual tokens and components. -->
---
name: Tint
description: A palette studio that wears the palette it makes.
---

# Design System: Tint

## 1. Overview

**Creative North Star: "The Swatch Library"**

A physical paper swatch book. Chips packed tight in tidy rows, printed labels under each one, soft board covers, everything measurable and everything handled. The system is warm to look at and rigid underneath — the warmth is in the surfaces and the letterforms, never in the data.

This resolves the central tension of the product. Tint is soft *and* it is an accessibility instrument, and those pull against each other: pastels are low-contrast by nature, and a contrast tool that fails contrast is worthless. The swatch-book metaphor answers it structurally rather than cosmetically. A swatch book has soft covers and a neutral page; the chips are the only saturated things in it; every chip is labelled with its real value. Soft frame, neutral bench, honest numbers.

It explicitly rejects the two adjacent lanes. It is not a **dev-tool colour picker** (dark, cold, legible only to people who already know colour science) and it is not a **palette generator** (loud full-bleed colour fields, ad-dense chrome, decoration in place of data). It is also not **cream**: the surfaces are tinted toward the brand's own rose, deliberately and measurably, never toward generic warm-neutral.

**Key Characteristics:**
- Tight-packed tiles with large radii — a swatch page, not a card grid
- Neutral ground wherever colour is being judged; brand tint only in the frame
- Two type weights, two families, no display faces in the tool
- Flat and tonal — no shadows anywhere
- Every value printed as text, in mono
- The chrome is derived from the live palette, never hardcoded

## 2. Colors

**Strategy: Restrained.** Tinted neutral surfaces, brand colour under 10% of the screen. This is a functional requirement before it is an aesthetic one — the user's generated palette must be the only saturated thing in view, or they cannot judge it.

**The Trace, Not a Wash Rule.** The ground's chroma ceiling is `0.0055`, the surface's `0.003`. An earlier build allowed the ground `0.019`, which at L 0.94 is not a tint — it is a colour, and it covered the whole screen. Two things break at that level. The palette stops being the only saturated thing in view, so there is nothing neutral left to judge it against, and the rule above is violated by the frame that is meant to enforce it. And a full screen held a couple of percent off neutral is the specific thing that reads as tiring rather than as warm — the complaint it drew was "too pink, straining, childish", from a page whose colours were all individually correct. The hue survives: a rose palette still produces a measurably rose page. It is a trace now, not a wash.

**The Neutral Bench Rule.** Any surface a colour is judged against is chromatically neutral (chroma 0). No exceptions, ever. The scale strip and the contrast matrix sit on true neutral. Colour cannot be evaluated against a tinted ground, and a tool that tints the bench is lying to its user.

**The Borrowed Chrome Rule.** The interface derives its ink from the live palette at runtime. No foreground colour is hardcoded anywhere in the codebase. Every text and icon colour is produced by a function that takes a surface and returns an AA-passing foreground. If a colour appears as a literal in a component, it is a bug.

**The Harder Ground Rule.** Ink is solved against *every* surface it will sit
on, and kept only if it holds on all of them. `buildChrome` derives one
candidate against the page ground and one against the tile surface and keeps
whichever has the better worst case. This exists because which of the two is
harder **flips with the theme**: on paper the tiles are lighter than the ground,
so dark ink struggles on the ground; turn the palette over and the tiles are
still lighter but the ink is light too, so the tiles become the hard case.
Solving against the ground alone shipped twenty elements at 4.18:1. Any new
surface must be added to that comparison, not just used.

**The Other Answer Rule.** The dark studio is not a theme. It is the same
palette read from its other end — `paletteRoles` sorts the other way, so the
darkest colour becomes the page and text is derived upward, and every ratio is
recomputed and still printed. This deliberately reverses `plan_1.md` decision 5
("no dark mode — palette swap is the theme system"), which was right for a site
theme and wrong for what this is: a second, equally honest answer to the
question the user asked. The story route stays on paper, because it is a printed
artefact.

**The Filter Goes Last Rule.** Colour-vision simulation is applied to the
finished render, never to the colours before they are derived from. A person
with deuteranopia sees the page that actually shipped, filtered by their own
eye. Deriving ink from simulated colours would solve for a colour that is on
nobody's screen, and would also quietly make the interface *pass* a test it
should be failing.

**The One Hue Rule.** *(This replaces an earlier "Rose-and-Patina" rule, which specified a fixed teal accent. It was dropped during implementation: a hardcoded accent contradicts the Borrowed Chrome Rule outright — it is the one colour on screen that would refuse to follow the user's palette. The accent is now derived from the seed, pinned into the lightness band where a saturated colour still reads as an action.)*

Rose is the opening palette, not a fixed brand colour. The chrome now derives from the *palette's* accent role — the most saturated colour nearest the middle of the lightness range, which is the one carrying its identity — clamped to L 0.45–0.62. Build any palette and the frame follows it. The accent appears only on the interactive tenth of the screen — focus rings, the primary action. It never decorates.

### Resolved tokens

Every value below is *computed*, not chosen — these are what the opening "Blush Hour" palette produces, whose accent role resolves to `#f4a9be`. Change the palette and they all change. They are recorded here only so the document describes something real, and were read out of the running app rather than typed.

| Token | Value | Role | Verified |
|---|---|---|---|
| `--bg` | `oklch(0.9640 0.0051 359.52)` | Page ground | — |
| `--surface` | `oklch(0.9980 0.0011 359.52)` | Bento tiles | — |
| `--bench` | `oklch(0.9950 0.0000 0.00)` | Where colour is judged | chroma exactly 0 |
| `--line` | `oklch(0.8850 0.0071 359.52)` | Hairlines, dividers | — |
| `--ink` | `oklch(0.3750 0.0051 359.52)` | Headings | **9.23:1** on `--bg` |
| `--muted` | `oklch(0.5371 0.0051 359.52)` | Body, labels, numerals | **4.61:1** on `--bg` |
| `--accent` | `oklch(0.6200 0.1014 359.52)` | Primary action fill | — |
| `--accent-ink` | `oklch(0.2171 0.0400 359.52)` | Label on accent | **4.61:1** on `--accent` |

`--muted` is deliberately the *softest ink that still clears AA*: the quietest text on the page is provably 4.5:1 and no more. Nothing here was picked by eye and then hoped about.

**Verification.** Values are resolved at runtime and audited against the rendered page, not the source — a script walks every text node, composites the real background stack through a canvas, and computes the ratio from the actual 8-bit pixels. Two engine bugs were found this way and fixed (see the README). The one deliberately-failing pair in the story is tagged `data-contrast-demo` and excluded, so it cannot mask a regression.

Re-verified after the ground was lightened: six repaint palettes × the story, plus the studio and the story with the geometry disclosure open — 97 to 133 elements each, **zero failures, tightest margin 1.016×**. Separately, `buildChrome` was swept over 23,256 seeds covering the whole L × C × H space: worst `--ink` 9.224:1 against a 9 target, worst `--muted` 4.607:1 against 4.5, worst `--accent-ink` 4.566:1 against 4.5. There is no seed a user can reach that produces an interface below AA.

## 3. Typography

**Direction: one grotesk in three weights, plus mono numerals.** Warmth from the letterforms, precision from the figures. The split is the brand personality made typographic — soft surfaces, sharp instrument.

- **UI — Cabinet Grotesk** (Fontshare, self-hosted `.woff2`). A grotesk with enough quirk in the `a`, `g` and `y` to stay friendly at display size, and enough discipline to disappear at 12px. Mature where the work has to look considered, playful where it has to look like a person made it.
- **Data — system mono stack** (`ui-monospace`, SF Mono, Menlo). Every number: contrast ratios, OKLCH coordinates, hex values, step indices. If it is a measurement, it is mono. No webfont is downloaded for this — the platform mono is excellent and costs nothing.

**The Three Weights Rule.** 400 Regular for body, 500 Medium for labels and UI, 700 Bold for display and section headings. Nothing else, and `font-synthesis-weight: none` so a missing weight fails visibly rather than being faked by the browser. Hierarchy comes from size, weight, colour and space in that order.

**The Mono Means Measured Rule.** Mono is reserved for values the tool computed. It is never used for labels, headings, or decoration. A user should be able to tell what is data purely by letterform.

Scale is a fixed px/rem ramp — not fluid clamps. This is product UI viewed at consistent DPI; a heading that shrinks inside a panel looks broken, not responsive. Fluid type is permitted on the case-study page only, where the display sizes step at one breakpoint.

## 4. Elevation

**Flat. Tonal layering only.** There are no shadows in this system.

**The No-Shadow Rule.** Depth is expressed as a step in surface lightness, never as a cast shadow. Shadows tint whatever is beneath them, which corrupts the exact judgement the tool exists to support — and a drop shadow under a swatch changes how its colour reads.

Tiles separate from the ground by a lightness step and by the gutter itself. Where a boundary is genuinely needed, it is a 1px hairline meeting 3:1 against both adjacent surfaces.

*Anti-pattern test:* if a tile appears to float, the shadow is wrong and the surface step is too small.

This is why the story's active repaint pill is marked with a darkened hairline and a taller swatch strip rather than the glow a brief would normally ask for: a glow is a shadow with the sign flipped, and it would tint the very swatches the pill is showing you.

The one texture in the system is the paper grain on the footer CTA — a 5.5%-opacity noise fill, masked to fade downward. Grain moves pixels, so the ink on that panel is derived at 5:1 rather than the usual 4.5:1 and the overlay is paid for out of headroom. Measured on the shipped page: 5.14:1.

## 5. Components

Omitted — nothing is built yet. Populated on the next scan-mode run.

Two layout rules that must survive into implementation:

**The Swatch Page Rule.** Tiles pack tight: gutters of 4–6px against radii of 20–24px. That gutter-to-radius ratio *is* the identity; widening the gutter dissolves it into a generic card grid. Tiles span different amounts because their content differs — the site preview is tall, the scale strip is wide and short — never for visual variety. The palette bar sits *above* the bento at full width, because it is the subject rather than one tile among six.

**The Readout Rule.** *(This replaces an earlier "a tool does not perform".
That rule was right for a product and wrong for this, which is a portfolio
piece someone will look at for ninety seconds before deciding whether the
person who built it can do the job. It has been narrowed rather than dropped.)*

**The studio may perform, but only by showing its own work.** Motion that
reveals what the engine is doing is allowed, encouraged, and worth making
beautiful. Motion that decorates something the engine is not doing is still
banned. The test is whether you can name the function it is drawing:

| What moves | What it is drawing |
|---|---|
| The palette bar flickering on `space` | The ninety candidates `generate()` genuinely builds and scores, replayed from the real trail. The winner is computed synchronously first; the animation is a replay over a palette that has already landed. |
| The bar compressing, then springing open | The search running, then resolving. A real damped spring, expressed as a `linear()` sample list, so it costs nothing. |
| The score landing | The critique re-running. Legible before, during and after. |
| Swatches sliding out of the way of a drag | FLIP over their actual measured positions. |
| The whole page washing colour | Several hundred derived colours being re-solved at once. |

Nothing in the studio is revealed *by* motion, and nothing waits on it: pressing
`space` during a replay interrupts it rather than queueing.

**A readout is only a readout at a speed you can read.** The first replay ran
sixteen candidates in 620ms — about 39ms each, two refreshes. That is a truthful
picture of how fast the search is and a useless one to look at: nobody can see
what the generator chose between. Twenty candidates over 4.8s, decelerating from
162ms to 383ms and then holding the winner for two thirds of a second, is the
same information at a speed a person can take. It costs the tool nothing,
because the winner is already state before the first frame. `replay.test.ts`
asserts the shortest dwell, not the total duration — the total is a stylistic
choice, the dwell is the requirement.

**Direct manipulation reports the hand, not a pose.** A dragged swatch lifts on
a spring (`scale`) and tips in the direction it is being thrown, from the
smoothed pointer velocity, capped at 3.4° and returning to level when you hold
still. A card you are holding still lies flat; a constant tilt is a sticker of a
lifted card. The lift and tilt are separate CSS properties from the position for
exactly this reason — the position is nailed to the pointer with no transition,
while `scale` and `rotate` are allowed to lag. As one `transform` string you get
to pick one behaviour for all three, and picking "smoothed" makes the chip swim
behind the cursor.

**The Sideways Rule.** The horizontal act never asks for a horizontal gesture.
Physical scrolling stays vertical — wheel, trackpad, spacebar, Page Down, the
scrollbar — and that vertical progress is spent travelling sideways. There is
no drag-only interaction and no gesture to discover, and the threshold cue at
the end of the strip says *where you are* (`01 / 05 — Enter the proof`) rather
than telling anyone to scroll a new way. A cue that has to explain the
interaction is a confession that the handoff did not work.

Two numbers hold it together, and both are in `track.test.ts` rather than in
anyone's head. The track stands still for the first 8% and the last 14% of the
section: the lead-in is the handoff, so the turn reads as *entering* the
palette rather than the page suddenly sliding, and the tail is a full viewport
of stable time so 05 can be finished before the track releases. And the rooms
never move faster than about 1.5px sideways per 1px of scroll — above that a
small push throws a whole room past, which is the specific way sideways
scrolling usually feels broken. That ratio is in *pixels*: the first version of
the test compared screens of scroll to screens of travel, got a comfortable
1.25, and passed a track that was actually moving 1.28× faster than the hand,
because a screen is 900px tall and 1600px wide.

**The Wall Rule.** The case-study track puts the rooms *inside* the palette, and
a ground that carries a colour is a ground no ink was solved against. Hue is
free; lightness is not. Each field of the far wall is the page's own ground
wearing one palette colour's hue at a capped chroma, nudged up until it is at
least as bright as that ground — never mixed, because mixing moves lightness
with the hue and `--muted` is `deriveInk(ground, 4.5)`, sitting exactly on the
line by construction. The first version mixed 13% of each colour in and put
`--muted` at 3.76:1 on the darkest field, which is an AA failure on the page
whose entire argument is contrast. Full-strength palette colour is allowed in
exactly one place there — the columns standing at each field boundary — for
exactly one reason: nothing is ever written on them.

**A specimen has to be set at the size the rule applies to.** Room 01's failing
wall shows its ratio at 108px, where AA asks 3:1 and a failing pair is still
perfectly readable — so the number alone demonstrates nothing. The failure is
felt at body size, where 4.5:1 is the rule, so the same ink also gets a sentence
at 15px. Shipping deliberately illegible text is defensible only because it is a
specimen and nothing is *only* said in it: the label, the verdict and the
argument beside it are all at full contrast. `track.test.ts` asserts the failing
wall actually fails on all seventy shelf palettes, so the room cannot quietly
start arguing nothing.

**The Trace Rule.** Pointing at a colour shows you everywhere that colour is
being judged: its row and column in the contrast matrix, and the critique notes
that name it. Pointing at a note does the reverse. Both directions write to one
`highlight: number[]`, so they compose instead of competing. Two constraints.
Nothing is ever *hidden* — quietened things stay selectable, findable and
readable, because a tool that removes information to make a point has stopped
being a tool. And a trace with no matches is not a trace: point at a swatch no
note happens to mention and the naive version greys out every note at once,
which reads as the panel breaking rather than as "nothing here is about that
colour", so the quietening only runs when something matches.

**The Status Line Rule.** Explanations do not sit permanently in the layout.
They appear on one line at the bottom of the studio, describing whatever the
pointer or the keyboard focus is on. This is the convention every professional
instrument uses, and it took the studio's permanent body copy from roughly 220
words to about 50 without deleting a sentence — the text moved from *always* to
*when you are looking at the thing it describes*. Anything that speaks on hover
must also speak on `focus`, and anything that only existed as hover text stays
in the document as `sr-only`.

**The Split Motion Rule.** The studio uses native scroll and state-only motion (150–250ms, transform and opacity). The case-study page gets damped scroll (Lenis, `duration: 1.6`) and scroll-driven motion: an entry sequence, one pinned full-bleed section, and per-figure entrances. A tool that hijacks scrolling fights the user's trackpad and breaks find-on-page; a narrative page earns pacing. Both honour `prefers-reduced-motion`, and on the story page that means every animated thing renders its *finished* state — the pinned section collapses to a short one already showing full-bleed columns, and the entry sequence never mounts. The preference is subscribed to, not sampled once, so turning it on mid-visit stops the page.

**The Repaint Rule.** Every colour property on every element transitions over 260ms. The page's whole claim is that changing the palette re-solves several hundred derived colours at once, and a transition declared only on `body` cross-fades two of them while the other several hundred snap — which reads as a glitch rather than as a recalculation. It is colour properties only: nothing in that rule transitions layout, so the pinned strip's per-frame geometry is untouched. The duration is the studio's rather than a longer cinematic one, because the same rule paints the tool and a tool that takes a third of a second to answer a button feels broken.

The cost is that a contrast audit run while a repaint is in flight measures colours that are part-way between two palettes and reports failures that exist on no frame a user sees. `scripts/audit-contrast.js` cancels every transition before it takes its first sample, which also makes it trustworthy in a backgrounded tab, where transitions never advance at all.

**Springs are CSS, not physics code.** `linear()` takes a list of samples, so a
damped spring is a token: `--ease-spring` is a real second-order response at
damping 0.62, one 8% overshoot, then still. It has been in every modern browser
since 2024. This is the single best-fitting platform feature this project could
have been handed — spring motion for zero bytes, on a system whose credibility
rests on having written its own maths.

**No animation library.** Everything above is `src/lib/motion.ts` — about sixty lines of hooks over `IntersectionObserver` and one `getBoundingClientRect` per frame. Reaching for GSAP would cost roughly a third of the bundle again for effects that are arithmetic, on a system whose credibility rests on having written its own.

**Motion is never the only signal.** The two numbers that get a "stamp" entrance (`4.58:1` and the live verdict score) are fully legible before, during and after it. Nothing on the page is revealed *by* motion; motion only paces content that already shipped.

## 6. Do's and Don'ts

**Do**
- Print the number. Every ratio, every coordinate, as selectable text.
- Pair every pass/fail colour with an icon and a text label — a colour-blind developer is a core user of a contrast tool.
- Keep the bench neutral and the frame tinted.
- Derive foreground colours; verify at runtime.
- Build the empty, loading, invalid-input and no-result states before adding any feature.
- Say what the simulation actually costs. Two colours merging and a ratio falling are different failures with different fixes, and a palette only "survives" a mode when both hold.
- Give anything that speaks on hover a `focus` handler too, and leave the sentence in the document for anyone who can hear neither.

**Don't**
- **No Coolors / Adobe Color.** No loud full-bleed colour fields, no ad-dense chrome, no palette shouting where it should be examined.
- **No generic AI SaaS.** No purple-blue gradient hero, no glassmorphism, no tiny tracked uppercase eyebrow above every section, no big-number stat row.
- **No oklch.com coldness.** The rigour is not negotiable; the chill is. Someone who does not know what OKLCH stands for must still get a usable palette.
- **No Dribbble-shot styling.** No fake content, no missing empty states, no unhandled edge cases. If it only looks good with ideal data, it is not finished.
- **No cream, sand, beige, or parchment surfaces.** Tint toward the brand hue or use true neutral. Never warm-by-default.
- **No shadows.** See The No-Shadow Rule.
- **No hardcoded foreground colours.** See The Borrowed Chrome Rule.
- **No third font weight.**
- **No motion that is not a readout.** See The Readout Rule. If you cannot name the function it is drawing, it does not go in the studio.
- **No reassuring numbers.** The simulation was specified on the assumption that contrast ratios hold under dichromacy. They do not — protanopia moves some pairs by 57%. Measure the claim before printing it; that is the entire product.
