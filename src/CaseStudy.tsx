import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Lenis from "lenis";
import { PaperTexture } from "@paper-design/shaders-react";
import {
  type Oklch,
  clampToGamut,
  contrast,
  deriveInk,
  fromHex,
  ramp,
  toCss,
  toHex,
} from "./lib/color.ts";
import { type Origin, type Palette, critique, paletteRoles } from "./lib/harmony.ts";
import { LIBRARY } from "./lib/library.ts";
import { buildChrome } from "./lib/palette.ts";
import { useCountUp, useFanSweep, useInView, useReducedMotion } from "./lib/motion.ts";
import { ChipFan, GamutSlice, HueWheel, InkSearch, RampComparison } from "./components/Figures.tsx";
import { Magnifier, ScratchOut, Squint } from "./components/Illustrations.tsx";
import { Preloader } from "./components/Preloader.tsx";
import { ScrollStrip } from "./components/ScrollStrip.tsx";
import { CaseTrack } from "./components/Track.tsx";
import { rooms as buildRooms } from "./components/Rooms.tsx";
import { usePinnedLayout } from "./lib/track.ts";

/**
 * Five sections, not six. The gamut argument used to be its own stop on the
 * page; every word of it is still here, folded into a disclosure under 02
 * where hue and lightness are already the subject. A reader who wants the
 * geometry opens it; a reader who does not is one scroll closer to the tool.
 */
const SECTIONS = [
  { id: "problem", index: "01", title: "Soft palettes fail quietly" },
  { id: "oklch", index: "02", title: "Why OKLCH, shown not argued" },
  { id: "ink", index: "03", title: "The number it all rests on" },
  { id: "opinion", index: "04", title: "A tool with an opinion" },
  { id: "left-out", index: "05", title: "What I left out" },
];

/** A few off the shelf, so the page can be repainted in one click. */
const TRY = ["Blush Hour", "Deep Harbour", "Terracotta", "Forest Night", "Cyberpunk", "Champagne"]
  .map((n) => LIBRARY.find((p) => p.name === n)!)
  .filter(Boolean);

/** Fires after the section heading above it, so the two do not overlap. */
const INNER = "0px 0px -22% 0px";

/** A block that rises into place when it is reached. The two sideways
    variants live in CSS and are used directly by the cards in 01, which need
    to know which side they came from. */
function Enter({ className = "", children }: { className?: string; children: React.ReactNode }) {
  const [ref, seen] = useInView<HTMLDivElement>(INNER);
  return (
    <div ref={ref} className={`enter-up ${seen ? "entered" : ""} ${className}`}>
      {children}
    </div>
  );
}

function Section({
  id,
  index,
  title,
  lead,
  children,
  figure,
  aside,
}: {
  id: string;
  index: string;
  title: string;
  lead: string;
  children?: React.ReactNode;
  figure?: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <section
      id={id}
      data-reveal
      className="relative mx-auto w-full max-w-[860px] scroll-mt-16 px-6 py-[8vh]"
    >
      {/* Marginal decoration. Hidden below the width where there is no
          margin to put it in, rather than shrunk into the text column. */}
      {aside && (
        <div className="pointer-events-none absolute top-[7vh] right-[-88px] hidden w-[104px] xl:block">
          {aside}
        </div>
      )}
      <div className="mb-4 flex items-baseline gap-3">
        <span className="tabular text-[13px] text-[var(--muted)]">{index}</span>
        <h2 className="text-[27px] font-bold tracking-[-0.03em] sm:text-[34px]">{title}</h2>
      </div>
      <p className="max-w-[58ch] text-[17px] leading-[1.6] text-[var(--ink)] sm:text-[19px]">
        {lead}
      </p>
      {figure && <div className="my-7">{figure}</div>}
      {children && (
        <div className="flex flex-col gap-3 text-[15px] leading-[1.65] text-[var(--muted)] sm:text-[16px]">
          {children}
        </div>
      )}
    </section>
  );
}

/**
 * One of the two demo cards in 01. The ratio counts up from zero when the
 * card arrives — a number climbing to rest reads as an instrument taking a
 * reading, which is what it is.
 */
function ContrastCard({
  label,
  ink,
  surface,
  ratio,
  from,
}: {
  label: string;
  ink: Oklch;
  surface: Oklch;
  ratio: number;
  from: "left" | "right";
}) {
  const [ref, seen] = useInView<HTMLDivElement>(INNER);
  const shown = useCountUp(ratio, seen, 1000);

  return (
    <div
      ref={ref}
      className={`rounded-[16px] p-5 ${from === "left" ? "enter-l" : "enter-r"} ${seen ? "entered" : ""}`}
      style={{ background: toCss(surface) }}
    >
      <p
        className="tabular text-[11px] tracking-[0.04em] uppercase"
        style={{ color: toCss(deriveInk(surface, 4.5)) }}
      >
        {label}
      </p>
      <p
        className="mt-2 text-[16px] leading-[1.5]"
        style={{ color: toCss(ink) }}
        // The left-hand card is *meant* to fail — it is the thing being
        // argued against. Flagged so the contrast auditor counts it as a
        // demonstration rather than a regression.
        data-contrast-demo={ratio < 4.5 ? "" : undefined}
      >
        Body copy sitting on the lightest colour in your palette. This is the
        sentence a user has to read.
      </p>
      <p
        className="tabular mt-3 flex items-baseline gap-2 text-[28px] font-bold"
        style={{ color: toCss(deriveInk(surface, 7)) }}
      >
        {shown.toFixed(2)}:1
        <span className="text-[13px] font-medium">
          {ratio >= 4.5 ? "passes AA" : "fails AA"}
        </span>
      </p>
    </div>
  );
}

export function CaseStudy({
  palette,
  onUse,
}: {
  palette: Palette;
  onUse: (colors: Oklch[], origin: Origin, from?: string) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(SECTIONS[0].id);
  const reduced = useReducedMotion();
  // The horizontal act runs, so the vertical apparatus around it stands down.
  const pinned = usePinnedLayout();
  const [booted, setBooted] = useState(false);
  const onBooted = useCallback(() => setBooted(true), []);

  const colors = useMemo(() => palette.map((s) => s.color), [palette]);
  const roles = useMemo(() => paletteRoles(colors), [colors]);
  const steps = useMemo(() => ramp(roles.accent), [roles.accent]);
  const verdict = useMemo(() => critique(colors), [colors]);
  // The same ground App.tsx paints the page with, so the track's far wall can
  // be built at exactly its lightness rather than near it.
  const ground = useMemo(() => buildChrome(roles.accent).bg, [roles.accent]);

  const rivet = useFanSweep<SVGGElement>(700);
  const [rampRef, rampSeen] = useInView<HTMLDivElement>(INNER);
  const [inkRef, inkSeen] = useInView<HTMLDivElement>(INNER);

  // Which shelf palette is currently on the page, if any. Intake reorders by
  // lightness, so the comparison is on the set of colours, not the sequence.
  const current = useMemo(() => colors.map(toHex).sort().join(), [colors]);
  const keyOf = (hexes: string[]) =>
    hexes.map((h) => toHex(fromHex(h)!)).sort().join();

  // Damped scroll, the one place it belongs. A tool fights smooth scroll —
  // it breaks find-on-page and lags a trackpad. A story wants the damping,
  // and this one wants it slow: the pinned strip needs travel to read.
  useEffect(() => {
    if (!booted || reduced) return;
    const lenis = new Lenis({
      duration: 1.6,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });
    let frame = requestAnimationFrame(function loop(time) {
      lenis.raf(time);
      frame = requestAnimationFrame(loop);
    });
    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, [booted, reduced]);

  // Sections are visible by default; the reveal is only armed once JS is
  // running, so a headless render or a failed script still ships the content.
  useEffect(() => {
    const nodes = root.current?.querySelectorAll("[data-reveal]");
    if (!nodes || reduced) return;

    nodes.forEach((n) => n.classList.add("reveal-armed"));
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("reveal-in");
            io.unobserve(e.target);
          }
        }),
      { rootMargin: "0px 0px -12% 0px" },
    );
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [reduced]);

  // The rail needs to know where you are. Separate observer from the reveal
  // one because this one must keep firing after a section has been seen.
  useEffect(() => {
    // Pointless while the track is pinned: all five rooms are on screen at
    // once, so "which one is in view" has no answer. The chapter rail inside
    // the track owns that question there.
    if (pinned) return;
    const io = new IntersectionObserver(
      (entries) => {
        const seen = entries.filter((e) => e.isIntersecting);
        if (seen.length > 0) setActive(seen[0].target.id);
      },
      { rootMargin: "-25% 0px -60% 0px" },
    );
    for (const s of SECTIONS) {
      const el = document.getElementById(s.id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, [pinned]);

  // A failing pair, built the way a designer would build it by hand: a mid
  // grey off the surface's own hue. Derived, not typed in, so the example
  // stays honest whatever palette the reader is holding.
  const naive = { l: 0.63, c: Math.min(roles.surface.c, 0.012), h: roles.surface.h };
  const solved = deriveInk(roles.surface, 4.5);

  // The CTA carries a paper grain over its fill, and grain moves pixels. Its
  // ink is derived at 5:1 rather than the role's 4.5:1 so the overlay is paid
  // for out of headroom instead of out of the reader's eyes.
  const ctaInk = deriveInk(roles.accent, 5);

  // The five rooms, rebuilt whenever the palette moves — every figure in them
  // is measured off `colors`, so repainting the page from the hero re-solves
  // all five.
  const rooms = useMemo(
    () => buildRooms({ colors, roles, verdict }),
    [colors, roles, verdict],
  );

  return (
    // `clip`, not `hidden`: the sideways entrances rest 48px outside the
    // viewport and hand a narrow screen a scrollable page, but `overflow:
    // hidden` would make this a scroll container and un-stick every pinned
    // layer inside it. `clip` cuts the overflow without doing that.
    <div ref={root} className="min-h-dvh overflow-x-clip">
      <PaperGround ground={ground} />

      {/* Renders nothing under reduced motion, and reports done on its
          first frame — so `booted` still flips and the rest of the page
          does not have to special-case the curtain never appearing. */}
      {!booted && <Preloader colors={colors} onDone={onBooted} />}

      <nav
        className="sticky top-0 z-20 backdrop-blur-md"
        style={{ background: "color-mix(in oklch, var(--bg) 82%, transparent)" }}
      >
        <div className="mx-auto flex max-w-[1100px] items-center justify-between px-6 py-3.5">
          <span className="text-[17px] font-bold tracking-[-0.03em]">Tint</span>
          <a
            href="#/studio"
            className="rounded-full px-3.5 py-1.5 text-[13px] font-medium"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
          >
            Open the studio
          </a>
        </div>
      </nav>

      {/* Jump-to rail. The story is a scroll, but nobody should be forced to
          take the whole scroll to reach the part they came for. */}
      {/* The vertical jump rail. Stands down while the track is pinned: its
          targets are then rooms inside a transformed track, where
          `scrollIntoView` scrolls the wrong axis, and the chapter rail is
          already doing this job properly. */}
      <aside
        hidden={pinned}
        className="fixed top-1/2 right-5 z-10 hidden -translate-y-1/2 xl:block"
      >
        <ul className="flex flex-col gap-1">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth" });
                }}
                className="group flex items-center justify-end gap-2 py-1"
                aria-current={active === s.id ? "true" : undefined}
              >
                <span className="max-w-0 overflow-hidden text-[12px] whitespace-nowrap text-[var(--muted)] opacity-0 transition-all duration-300 ease-[var(--ease-out-quint)] group-hover:max-w-[190px] group-hover:opacity-100">
                  {s.title}
                </span>
                <span
                  className="block h-[3px] rounded-full transition-all duration-300 ease-[var(--ease-out-quint)]"
                  style={{
                    width: active === s.id ? 26 : 13,
                    background: active === s.id ? "var(--ink)" : "var(--line)",
                  }}
                />
              </a>
            </li>
          ))}
        </ul>
      </aside>

      {/* — Hero ————————————————————————————————————————————— */}
      <header className="mx-auto max-w-[1100px] px-6 pt-[6vh] pb-[6vh]">
        <div className="flex flex-col items-center gap-10 lg:flex-row lg:items-center lg:gap-10">
          <div data-reveal className="min-w-0 flex-1">
            <p className="tabular mb-4 text-[13px] tracking-[0.04em] text-[var(--muted)] uppercase">
              A palette tool · built from scratch
            </p>
            <h1 className="text-[42px] leading-[1.02] font-bold tracking-[-0.04em] sm:text-[62px]">
              A colour tool that has to survive its own advice
            </h1>
            <p className="mt-5 max-w-[50ch] text-[17px] leading-[1.6] text-[var(--muted)] sm:text-[19px]">
              Tint builds a palette from a colour, a screenshot or a mood — then
              tells you what is wrong with it. Everything you can see, including
              this sentence, is painted in the palette below. There is no safe
              grey to hide behind.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-2">
              <a
                href="#/studio"
                className="rounded-full px-5 py-2.5 text-[15px] font-medium transition-transform duration-200 ease-[var(--ease-out-quint)] hover:-translate-y-px"
                style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
              >
                Open the studio
              </a>
              <a
                href={pinned ? "#proof" : "#problem"}
                onClick={(e) => {
                  e.preventDefault();
                  document
                    .getElementById(pinned ? "proof" : "problem")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
                className="rounded-full border px-5 py-2.5 text-[15px] font-medium"
                style={{ background: "var(--surface)" }}
              >
                How it works
              </a>
            </div>

            <div className="mt-8">
              <p className="mb-2.5 text-[13px] text-[var(--muted)]">
                Repaint this page — every colour on it re-solves
              </p>
              <div className="flex flex-wrap gap-2">
                {TRY.map((p) => {
                  const on = keyOf(p.colors) === current;
                  return (
                    <button
                      key={p.name}
                      onClick={() =>
                        onUse(p.colors.map((h) => fromHex(h)!), "library", p.name.toLowerCase())
                      }
                      aria-pressed={on}
                      className="flex cursor-pointer items-center gap-2.5 rounded-full border py-1.5 pr-4 pl-1.5 text-[13.5px] font-medium transition-transform duration-200 ease-[var(--ease-out-quint)] hover:-translate-y-px"
                      style={{
                        background: "var(--surface)",
                        // The system has no shadows, so "selected" is said
                        // with the hairline and a taller swatch strip rather
                        // than with a glow.
                        borderColor: on ? "var(--ink)" : "var(--line)",
                      }}
                    >
                      <span className="flex gap-px overflow-hidden rounded-full" aria-hidden>
                        {p.colors.map((hex) => (
                          <span
                            key={hex}
                            className="w-[9px] transition-all duration-300 ease-[var(--ease-out-quint)]"
                            style={{ background: hex, height: on ? 22 : 18 }}
                          />
                        ))}
                      </span>
                      {p.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* One object, not a cluttered desk scene. A single well-drawn fan
              deck carries the hero on its own. The shelf line that used to run
              under it is gone: the deck no longer stands on its base, it turns
              about a rivet in the middle of its own board, and a shelf under a
              circle the blades sweep through is a line they cut across. */}
          <div className="relative w-full shrink-0 lg:w-[50%]">
            {/* Never drifts position on the page. What moves is the blades:
                each one folds round to the closing angle on its own beat as
                you scroll, and the deck shuts a blade at a time. */}
            <div className="relative w-full">
              <ChipFan colors={colors} deal={booted && !reduced} spinRef={rivet} />
            </div>
          </div>
        </div>
      </header>

      {/* — The pinned strip ————————————————————————————————— */}
      <ScrollStrip colors={colors} />

      {/* — The proof, in five rooms ——————————————————————————
          Pinned and horizontal on a desktop screen; the same five scenes
          stacked vertically everywhere else and under reduced motion. The
          fallback is the page as it has always been — narrow screens keep a
          working story while the rooms are being built. */}
      <CaseTrack
        chapters={rooms}
        colors={colors}
        ground={ground}
        fallback={
          <>
            {/* — 01 ————————————————————————————————————————————— */}
            <Section
              id="problem"
              index="01"
              title="Soft palettes fail quietly"
              lead="Pastels are chosen because they feel calm, and they fail accessibility for exactly that reason: everything sits close together in lightness."
              aside={<Magnifier tint={roles.surface} className="w-full" />}
              figure={
                <div className="grid items-stretch gap-[6px] sm:grid-cols-[1fr_auto_1fr]">
                  <ContrastCard
                    label="Picked by eye"
                    ink={naive}
                    surface={roles.surface}
                    ratio={contrast(naive, roles.surface)}
                    from="left"
                  />
                  {/* The ruler laid down between them. */}
                  <Divider />
                  <ContrastCard
                    label="Solved by Tint"
                    ink={solved}
                    surface={roles.surface}
                    ratio={contrast(solved, roles.surface)}
                    from="right"
                  />
                </div>
              }
            >
              <p>
                Both cards above are live. The left one is what happens when a grey is
                chosen because it looks about right; the right one is the softest ink
                that provably clears 4.5:1 on the same surface. Change the palette at
                the top and both numbers move.
              </p>
              <p>
                Most palette tools stop at generating pretty colours, and the step that
                decides whether the palette is usable happens later, in a different
                tab, after the decision is already made. Tint puts the number next to
                the colour at the moment you pick it.
              </p>
            </Section>

            {/* — 02 ————————————————————————————————————————————— */}
            <Section
              id="oklch"
              index="02"
              title="Why OKLCH, shown not argued"
              lead="Both strips step through eleven lightness values. The plot underneath is the measured lightness of what actually came out."
              figure={
                <div ref={rampRef}>
                  <RampComparison seed={roles.accent} steps={steps} shown={rampSeen} />
                </div>
              }
            >
              <p>
                HSL's lightness is a number about the maths, not about your eye. Its
                steps clump and then lurch, and how badly depends on the hue you
                started from. OKLCH is built on measurements of human perception, so
                equal steps in <em>L</em> look like equal steps — which is why a ramp
                generated once can be trusted across every hue a user might type.
              </p>

              <details className="geometry mt-3">
                <summary>The geometry, if you want it</summary>
                <div className="mt-[6px] flex flex-col items-center gap-6 rounded-[16px] bg-[var(--bench)] p-5 sm:flex-row sm:items-center">
                  <div className="flex shrink-0 flex-col items-center gap-4">
                    <GamutSlice color={roles.accent} />
                    <HueWheel colors={colors} size={140} />
                  </div>
                  <div className="flex flex-col gap-3 text-[15px] leading-[1.6] text-[var(--muted)]">
                    <p>
                      That shape is not a diagram of the sRGB gamut — it is the gamut,
                      at your accent's hue, measured by the same binary search the app
                      runs on every colour it makes.
                    </p>
                    <p>
                      The lazy fix for an out-of-range colour is to clamp red, green
                      and blue into range. But clipping a channel changes the hue and
                      the lightness at once, silently, and the step you get back is
                      not the step you asked for.
                    </p>
                    <p className="text-[var(--ink)]">
                      Tint searches chroma downward instead, holding lightness and hue
                      fixed. It gives up exactly one property — saturation — and keeps
                      the two the ramp's structure depends on.
                    </p>
                  </div>
                </div>
              </details>
            </Section>

            {/* — 03 ————————————————————————————————————————————— */}
            <Section
              id="ink"
              index="03"
              title="The number it all rests on"
              lead="Because the interface is painted in your palette, no text colour in it can be written down in advance. Every one is solved at render time."
              aside={<Squint tint={roles.surface} className="w-full" />}
              figure={
                <div ref={inkRef} className="rounded-[16px] bg-[var(--bench)] p-5">
                  <InkSearch surface={roles.surface} shown={inkSeen} />
                </div>
              }
            >
              <p>
                <code className="tabular text-[14px]">deriveInk()</code> searches for
                the <em>softest</em> ink that still clears 4.5:1 against the surface it
                will sit on — so pastel surfaces keep their gentleness right up until
                legibility would be spent. That only works if a passing ink always
                exists. It does, and the bound is provable.
              </p>

              <Enter className="my-2 flex flex-wrap items-center gap-x-8 gap-y-4 rounded-[18px] bg-[var(--surface)] px-6 py-7">
                <Stamp className="tabular leading-[0.82] font-bold tracking-[-0.05em] text-[var(--ink)]">
                  <span style={{ fontSize: "clamp(72px, 15vw, 160px)" }}>4.58</span>
                  <span className="text-[24px] font-medium text-[var(--muted)]">:1</span>
                </Stamp>
                <p className="max-w-[34ch] flex-1 text-[14px] leading-[1.55]">
                  The worst case for black-or-white text across every colour sRGB can
                  produce, at a relative luminance of about 0.179. Above the 4.5 AA
                  needs, below the 7 AAA needs — so AA is always reachable for any
                  seed, and AAA sometimes simply is not.
                </p>
              </Enter>

              <p>
                A test sweeps roughly five thousand surfaces across every hue,
                lightness and chroma level and asserts the derived ink clears AA on all
                of them. It is the one test that has to pass, because it is the claim
                the architecture is built on.
              </p>
            </Section>

            {/* — 04 ————————————————————————————————————————————— */}
            <Section
              id="opinion"
              index="04"
              title="A tool with an opinion"
              lead="Generating colours is easy. Knowing which ones to throw away is the part that makes it a tool rather than a random number generator."
              figure={
                <div className="rounded-[16px] bg-[var(--bench)] p-5">
                  <div className="flex flex-wrap items-end gap-4">
                    <Stamp className="tabular text-[56px] leading-[0.85] font-bold tracking-[-0.04em] text-[var(--ink)] sm:text-[72px]">
                      {verdict.score}
                    </Stamp>
                    <p className="pb-1.5 max-w-[30ch] text-[14px] text-[var(--muted)]">
                      what Tint thinks of the palette you are currently reading this in
                    </p>
                  </div>
                  <ul className="mt-5 flex flex-col gap-[6px]">
                    {verdict.notes.slice(0, 4).map((n, i) => (
                      <NoteRow key={n.id} note={n} delay={i * 60} />
                    ))}
                  </ul>
                </div>
              }
            >
              <p>
                Seven checks, each answering something a person would actually ask
                before shipping a palette: is there enough lightness between these to
                put text on them, are two of them doing the same job, is one shouting
                over the rest, is anything sitting in the muddy band where a colour
                reads as dirt rather than as a decision.
              </p>
              <p>
                The same function scores the ninety candidates the generator builds
                before it shows you one. So Tint never suggests a palette it would then
                complain about — and the taste lives in one readable place rather than
                smeared across a generator.
              </p>
            </Section>

            {/* — 05 ————————————————————————————————————————————— */}
            <Section
              id="left-out"
              index="05"
              title="What I left out"
              lead="No accounts, no server, no colour library, and no model behind the mood search."
            >
              <Enter className="relative rounded-[18px] bg-[var(--surface)] px-6 py-6 sm:px-7 sm:py-7">
                <ScratchOut className="pointer-events-none absolute top-4 right-5 w-9 opacity-70" />
                <div className="flex max-w-[62ch] flex-col gap-3">
                  <p>
                    Nothing here needs saving on a server, so there is nothing to sign
                    into. Images are clustered in the browser and never uploaded. The
                    seventy built-in palettes are tagged, and “something calm and
                    coastal” is answered by searching those tags — which is faster,
                    cheaper and more predictable than asking a model, and it keeps an
                    API key out of a static site.
                  </p>
                  <p>
                    The OKLab conversions, the gamut mapping, the harmony schemes and
                    the WCAG maths are about five hundred lines with no dependencies.
                    Writing them was the point. The next thing I would build is
                    colour-blindness simulation over the same palette — the maths sits
                    in the same place, and it is the one check a printed ratio
                    genuinely cannot make for you.
                  </p>
                </div>
              </Enter>
            </Section>

          </>
        }
      />

      {/* The track holds room 05 still for a full viewport, then releases —
          and used to drop straight into this footer with no landing. One
          plain hairline first: the reader has just spent five screens inside
          the palette, and a beat of quiet page before the CTA reads as
          arriving somewhere rather than as the scroll running out. */}
      <div className="mx-auto h-px w-[calc(100%-3rem)] max-w-[860px] bg-[var(--line)]" aria-hidden />

      <footer className="mx-auto max-w-[860px] px-6 pt-[9vh] pb-[14vh]">
        <Tilt>
          <div
            className="paper-noise relative flex flex-wrap items-center justify-between gap-5 overflow-hidden rounded-[22px] px-7 py-9"
            style={{ background: toCss(roles.accent) }}
          >
            <div className="relative">
              <p
                className="text-[24px] font-bold tracking-[-0.03em] sm:text-[30px]"
                style={{ color: toCss(ctaInk) }}
              >
                Now go and break it
              </p>
              <p
                className="mt-1.5 max-w-[42ch] text-[15px] leading-[1.5]"
                style={{ color: toCss(ctaInk) }}
              >
                Drop in the ugliest colour you can think of. The page has to stay
                readable — that is the whole bet.
              </p>
            </div>
            <a
              href="#/studio"
              className="relative rounded-full px-5 py-3 text-[15px] font-medium"
              style={{ background: toCss(roles.surface), color: toCss(deriveInk(roles.surface, 7)) }}
            >
              Open the studio
            </a>
          </div>
        </Tilt>

        {/* The palette in play, as chips rather than as a line of hex. */}
        <div className="mt-6 flex flex-wrap gap-3">
          {colors.map((c, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <span
                className="block h-11 w-14 rounded-[10px]"
                style={{ background: toCss(c) }}
                aria-hidden
              />
              <span className="tabular text-[11.5px] text-[var(--muted)]">{toHex(c)}</span>
            </div>
          ))}
        </div>

        {/* A close, not a cutoff. The last thing on the page names the page,
            the way a colophon closes a printed one — small enough that
            nobody reads it as a second CTA, present enough that the scroll
            arrives somewhere instead of just stopping. */}
        <p className="tabular mt-16 text-center text-[11px] tracking-[0.16em] text-[var(--muted)]">
          TINT
        </p>
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small pieces the sections above lean on
// ---------------------------------------------------------------------------

/**
 * The page's ground, as a sheet of paper rather than a fill.
 *
 * The whole system is a paper collage — flat colour, cut edges, a rivet, no
 * shadows anywhere — and it has been assembling that collage on a surface with
 * no material to it. This is the sheet the rest is laid on.
 *
 * Three rules it has to keep, all of which are why it is tuned this far down:
 *
 * Its colours are *borrowed*, not chosen: back is the page's own ground and
 * front is the same colour a few steps darker, so repainting the palette
 * repaints the paper with it and no hex is written here.
 *
 * It is static — `speed={0}`. It is a texture, not an effect, and a surface
 * that breathes would be movement competing with every reveal on the page.
 * That also means nothing to answer for under reduced motion, and no frame
 * loop running behind a page that already has two.
 *
 * And it stays on the story page only. The studio is where colour is *judged*,
 * and the bench a swatch is judged against has to be inert — texture under a
 * ramp is exactly the thing the neutral bench rule exists to forbid.
 */
function PaperGround({ ground }: { ground: Oklch }) {
  // The tooth is the ground's own hue, one step darker and slightly *more*
  // saturated — not merely darker. The ground is a near-white with almost no
  // chroma in it, so a grain that only drops lightness is a neutral grey
  // speckle, and a page-wide dusting of neutral speckle reads as the whole
  // surface going grey. Carrying a little more of the hue instead makes it the
  // same paper in shadow, and the ground stays the colour the palette says.
  const fibre = toHex(
    clampToGamut({ ...ground, l: Math.max(0, ground.l - 0.09), c: ground.c + 0.03 }),
  );

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 opacity-50" aria-hidden>
      <PaperTexture
        width="100%"
        height="100%"
        speed={0}
        colorBack={toHex(ground)}
        colorFront={fibre}
        // Tooth and fibre only. The crumples, folds and speckle are the
        // large-scale half of this shader, and at any strength that reads
        // they stop being a surface and become a picture of crumpled paper
        // sitting behind the argument — which also drags the whole ground
        // grey, on the one page that cannot afford to look grey.
        contrast={0.32}
        roughness={0.5}
        fiber={0.42}
        fiberSize={0.22}
        crumples={0}
        crumpleSize={0.5}
        folds={0}
        foldCount={1}
        fade={0.18}
        drops={0}
      />
    </div>
  );
}

/** The ruler between the two cards in 01. Horizontal until there is a column
    gap to sit in, then vertical. */
function Divider() {
  const [ref, seen] = useInView<HTMLDivElement>(INNER);
  return (
    <div ref={ref} className="flex items-center justify-center sm:w-5">
      <span
        className={`rule-grow block h-px w-full rounded-full bg-[var(--line)] sm:h-full sm:w-px ${seen ? "entered" : ""}`}
      />
    </div>
  );
}

/** A figure that lands rather than fades — used on the two numbers the page
    is actually about. */
function Stamp({ className = "", children }: { className?: string; children: React.ReactNode }) {
  const [ref, seen] = useInView<HTMLParagraphElement>(INNER);
  return (
    <p ref={ref} className={`stamp ${seen ? "entered" : ""} ${className}`}>
      {children}
    </p>
  );
}

/** One critique note. The left rule grows to full height as the row arrives;
    the severity is still written out as a word, because a rule that is dashed
    rather than solid is not something everyone can see. */
function NoteRow({
  note,
  delay,
}: {
  note: { title: string; detail: string; severity: "good" | "warn" | "bad" };
  delay: number;
}) {
  const [ref, seen] = useInView<HTMLLIElement>(INNER);
  const word = note.severity === "bad" ? "Problem" : note.severity === "warn" ? "Worth a look" : "Good";

  return (
    <li
      ref={ref}
      // On `--bg` rather than `--surface`: the panel around these rows is the
      // near-white bench, and a surface-on-bench card is a 0.3% lightness step
      // — invisible. The ground is the only thing separating one note from
      // the next, so it has to be a step you can actually see.
      className={`note-rule enter-up relative overflow-hidden rounded-[10px] bg-[var(--bg)] py-3 pr-4 pl-5 ${seen ? "entered" : ""}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <p className="flex flex-wrap items-baseline gap-x-2 text-[13.5px] font-medium text-[var(--ink)]">
        {note.title}
        <span className="tabular text-[11px] font-normal text-[var(--muted)]">{word}</span>
      </p>
      <p className="mt-1 text-[12.5px] leading-[1.55] text-[var(--muted)]">{note.detail}</p>
    </li>
  );
}

/** The CTA, dropped on the table rather than aligned to it. */
function Tilt({ children }: { children: React.ReactNode }) {
  const [ref, seen] = useInView<HTMLDivElement>(INNER);
  return (
    <div ref={ref} className={`tilt-in ${seen ? "entered" : ""}`}>
      {children}
    </div>
  );
}
