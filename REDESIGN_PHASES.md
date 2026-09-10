# Tint Studio Redesign — Phased Build

The full product/visual vision lives in the redesign brief. This file turns it
into buildable phases. Guiding constraint: **the colour engine already exists**
— extraction, generation, roles, contrast, critique, vision simulation,
sharing and export are all written and tested in `src/lib/`. Every phase is a
UI reshell over that engine, not new colour science.

## Engine already in place (reuse, do not rebuild)

| Need | Lives in |
|---|---|
| Image → colours (k-means) | `lib/extract.ts` — `pixelsFrom`, `kmeans` |
| Mood / hex / CSS parsing | `lib/library.ts` — `searchMood`, `parseColors`, `LIBRARY` |
| Palette generation + trail | `lib/harmony.ts` — `search`, `generate`, `regenerate`, `CANDIDATES` |
| Palette roles | `lib/harmony.ts` — `paletteRoles` → `Roles` |
| Contrast / WCAG grade | `lib/color.ts` — `contrast`, `grade`, `deriveInk` |
| Critique (issues + fixes) | `lib/harmony.ts` — `critique` |
| Colour-vision simulation | `lib/vision.ts` — `simulate`, `review`, `MATRICES` |
| Chrome (surfaces from palette) | `lib/palette.ts` — `buildChrome`, `applyChrome` |
| Share link | `lib/share.ts` — `encode`, `decode`, `publish` |
| Export tokens | `lib/palette.ts` — `exportTokens` (css/tailwind/json) |
| Site preview / full-screen | `components/SitePreview.tsx`, `components/Present.tsx` |

## The new hierarchy (target)

```
1. Make a palette      (Creation Desk)
2. See it working      (Make It Real — Website / Social / Presentation)
3. Know it is usable   (Roles + "Good to go")
4. Take it with you    (Share card / export / Palette Shelf)
5. Inspect             (matrix, ramp, critique details, vision, raw exports)
```

---

## Phase 1 — Studio shell & hierarchy  ✅ done

Restructure the studio around the four-step hierarchy so every later phase has
a zone to drop into. No new colour features.

- New warm `StudioHeader`: `Tint` wordmark, editable **project title**, visible
  **Share** action (copies the live link), `How it works` back-to-story link.
- Remove the technical tagline (`OKLCH · WCAG · no colour library`) from the
  greeting; it moves to the Inspect area in Phase 7.
- Reorder `main` into named zones following the hierarchy. Existing tiles are
  slotted in as placeholders and get replaced zone-by-zone in later phases.
- Advanced controls (Present, Dark, Vision) stay on the status-bar rail for now;
  Phase 7 folds them into Inspect.

**Files:** `components/StudioHeader.tsx` (new), `src/App.tsx`, `src/index.css`.
**Done when:** studio loads with the new header + a live Share button, project
title is editable and travels in the share link, build is green, nothing
regressed.

## Phase 2 — Creation Desk + three Directions  ✅ done

- Promote the unified intake (already in `IntakeTile`) into a generous hero
  **Creation Desk**: photo drop with preview, mood prompt + examples, one seed
  picker, starter moods underneath.
- Produce **three distinct directions** instead of one: call `search` three
  times with seeded RNGs (preserving locked colours), label each with its
  `label`, show 5–6 swatches, a personality phrase, `Choose this look`, and a
  per-colour lock.

**Reuse:** `IntakeTile` logic, `search`/`generate`, `swatch` locks.
**Done when:** any input yields three genuinely different, choosable palettes.

## Phase 3 — "Make It Real" preview switcher  ✅ done

- One dominant preview with a Website / Social / Presentation switcher.
- Website reuses `SitePreview`. Social + Presentation are new compositions
  driven off `buildChrome` + `paletteRoles` (same role vars, new layouts).

**Reuse:** `SitePreview`, `buildChrome`, `paletteRoles`.
**Done when:** selecting a palette repaints all three contexts.

## Phase 4 — Roles + "Good to go"  ✅ done

- Plain-language role list (Background / Surface / Main text / Main colour /
  Accent / Highlight) from `paletteRoles`.
- One friendly quality card: "Good to go" or "One thing to fix", derived from
  `critique`. `See details` reveals ratios/OKLCH/critique notes.

**Reuse:** `paletteRoles`, `critique`, `contrast`, `grade`.
**Done when:** the card states the outcome in ordinary language with a details
escape hatch.

## Phase 5 — Direct image sampling  ⏭️ skipped

Skipped by decision: dominant-colour extraction (already shipped) covers the
common case; click/region picking is a lot of picker UI for the edge case.
Revisit only if users report missing the small colour they loved.


- Click-to-pick, magnified pixel picker, drag-select a region, pin colours
  before generating the rest.

**Reuse/extend:** `extract.ts` (add per-pixel/region sampling), `swatch` locks.
**Done when:** a user can pin the small colour k-means missed.

## Phase 6 — Palette Shelf + Share card  ✅ done

- Browser-only saved collection (localStorage): save, name, reopen, duplicate,
  share. No accounts.
- One action renders a shareable PNG card (name, swatches, a preview, hexes,
  subtle "Made with Tint") via canvas.

**Reuse:** `encode` for the link, existing previews for the card art.
**Done when:** palettes persist locally and export as a card image.

## Phase 7 — Inspect area  ✅ done

- Move matrix, ramp, critique details, vision simulation and raw exports into a
  collapsed **Inspect** area. Return the tech tagline here as proof.

**Reuse:** `MatrixTile`, `RampTile`, `CritiqueTile`, `VisionControl`, `ExportTile`.
**Done when:** the first layer is clean; depth is one click away.

## Phase 8 — Motion & platforms  ✅ done

- Purposeful studio motion (direction comes forward, swatch highlights its role,
  changed colour ripples its roles). Test desktop, mobile, keyboard,
  reduced-motion.

**Done when:** motion reads as feedback, mobile keeps the desk-first flow, and
reduced-motion is honoured.

---

## Boundaries (all phases)

Client-side and privacy-first. No accounts, no external AI APIs. Reuse the
existing engine. Keep advanced colour science visible but optional.
