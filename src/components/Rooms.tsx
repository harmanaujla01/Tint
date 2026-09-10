import { type Oklch, contrast, deriveInk, ramp, toCss, toHex } from "../lib/color.ts";
import { type critique, type paletteRoles } from "../lib/harmony.ts";
import { useCountUp, useInView } from "../lib/motion.ts";
import { GamutSlice, HueWheel, InkSearch, RampComparison } from "./Figures.tsx";
import { ScratchOut } from "./Illustrations.tsx";
import { Room } from "./Track.tsx";

/**
 * The five rooms of the horizontal act.
 *
 * Each one is a place with a single visual idea, not a section that has been
 * turned on its side. The rule they are all built to: the figure is the room,
 * the argument sits beside it, and every number in every one of them is
 * measured off the palette the reader is currently holding. Repaint the page
 * from the hero and all five rooms re-solve.
 */

export type RoomProps = {
  colors: Oklch[];
  roles: ReturnType<typeof paletteRoles>;
  verdict: ReturnType<typeof critique>;
};

/**
 * When a room's own motion is allowed to fire.
 *
 * The rooms travel *sideways* inside the pinned track, so a plain `"0px"`
 * margin arms a room's count-ups and staggered reveals the instant its leading
 * edge crosses the viewport's right side — a full viewport from centre, where
 * `--near` is ~0, the room is at 0.14 opacity and still mostly clipped. Every
 * bit of that motion then runs and finishes during the dim approach, so by the
 * time the room is actually centred and readable there is nothing left to watch.
 *
 * Insetting the observer's root 40% on each side turns it into a narrow band
 * down the middle of the screen: `seen` flips only once the room is about 40%
 * of the way to centre (`--near` ≈ 0.4), so the motion plays *as* the room
 * arrives rather than a screen early. This is the horizontal twin of the
 * vertical page's `INNER` margin, and it keeps the whole page honest to its own
 * rule — motion paces content, it never arrives before it.
 */
const ARRIVE = "0px -40% 0px -40%";

export function rooms(props: RoomProps) {
  return [
    { id: "problem", index: "01", title: "Soft palettes fail quietly", room: <One {...props} /> },
    { id: "oklch", index: "02", title: "Why OKLCH, shown not argued", room: <Two {...props} /> },
    { id: "ink", index: "03", title: "The number it all rests on", room: <Three {...props} /> },
    { id: "opinion", index: "04", title: "A tool with an opinion", room: <Four {...props} /> },
    { id: "left-out", index: "05", title: "What I left out", room: <Five {...props} /> },
  ];
}

// ---------------------------------------------------------------------------
// 01 — two colour rooms, one failing, one solved
// ---------------------------------------------------------------------------

/**
 * A wall of the surface colour with its ratio painted on it in the ink being
 * argued about.
 *
 * The failing wall genuinely fails: its number is set in the grey a person
 * would have picked by eye, at the size a headline is set, and it is unpleasant
 * to read. That is the demonstration — an essay about low contrast is a
 * paragraph you skim, and a number you have to squint at is not. The claim is
 * repeated underneath in `--ink` at full contrast, so nothing that has to be
 * read is only available in the failing colour.
 */
function Wall({
  label,
  ink,
  surface,
  verdict,
  passes,
}: {
  label: string;
  ink: Oklch;
  surface: Oklch;
  verdict: string;
  passes: boolean;
}) {
  const ratio = contrast(ink, surface);
  const [ref, seen] = useInView<HTMLDivElement>(ARRIVE);
  const shown = useCountUp(ratio, seen, 1100);

  return (
    <div
      ref={ref}
      className="relative flex h-full min-w-0 flex-1 flex-col justify-between rounded-[20px] px-7 py-7"
      style={{ background: toCss(surface) }}
    >
      <p className="tabular text-[12px] tracking-[0.08em]" style={{ color: toCss(deriveInk(surface, 7)) }}>
        {label.toUpperCase()}
      </p>

      <p
        className="tabular leading-[0.82] font-bold tracking-[-0.05em]"
        style={{ color: toCss(ink), fontSize: "clamp(56px, 7vw, 108px)" }}
      >
        {shown.toFixed(2)}
        <span className="text-[0.3em] font-medium">:1</span>
      </p>

      <div className="flex flex-col gap-3">
        {/*
          The specimen, and the actual demonstration.

          A ratio set at 108px is large text, where AA asks for 3:1 — so the
          headline number is perfectly readable even when the pair fails, and a
          room that showed only the number would be arguing nothing. Body size
          is where 4.5:1 is the rule and where the failure is felt, so the same
          ink gets a sentence at the size a sentence is normally set.

          The failing one is deliberately hard to read. That is defensible only
          because it is a specimen and nothing is *only* said in it: the label,
          the verdict and the argument beside it are all at full contrast.
        */}
        <p
          data-specimen={passes ? "solved" : "deliberate"}
          className="max-w-[30ch] text-[15px] leading-[1.5]"
          style={{ color: toCss(ink) }}
        >
          Body copy at fifteen pixels, in the ink this wall is arguing about.
        </p>

        {/* The line that has to be legible is legible: solved ink, not the ink
            under discussion. */}
        <p
          className="max-w-[30ch] text-[13.5px] leading-[1.5]"
          style={{ color: toCss(deriveInk(surface, 4.5)) }}
        >
          <span className="font-medium">{passes ? "Passes AA" : "Fails AA"}</span> — {verdict}
        </p>
      </div>
    </div>
  );
}

function One({ roles }: RoomProps) {
  // Built the way a designer would build it by hand: a mid grey off the
  // surface's own hue. Derived, not typed in, so the example stays honest
  // whatever palette the reader is holding.
  const naive = { l: 0.63, c: Math.min(roles.surface.c, 0.012), h: roles.surface.h };
  const solved = deriveInk(roles.surface, 4.5);

  return (
    <Room
      index="01"
      title="Soft palettes fail quietly"
      lead="Pastels are chosen because they feel calm, and they fail accessibility for exactly that reason: everything sits close together in lightness."
      figure={
        <div className="flex h-[62vh] w-full items-stretch gap-3">
          <Wall
            label="Picked by eye"
            ink={naive}
            surface={roles.surface}
            passes={contrast(naive, roles.surface) >= 4.5}
            verdict="a grey chosen because it looked about right on this surface."
          />
          <Wall
            label="Solved by Tint"
            ink={solved}
            surface={roles.surface}
            passes
            verdict="the softest ink that provably clears 4.5:1 on the same surface."
          />
        </div>
      }
    >
      <p>
        Both walls are live and both are your palette. Change it at the top of the
        page and both numbers move.
      </p>
      <p>
        Most tools stop at generating pretty colours, and the step that decides
        whether the palette is usable happens later, in a different tab, after the
        decision is already made. Tint puts the number next to the colour at the
        moment you pick it.
      </p>
    </Room>
  );
}

// ---------------------------------------------------------------------------
// 02 — the ramp as a landscape, with the geometry as a side chamber
// ---------------------------------------------------------------------------

function Two({ colors, roles }: RoomProps) {
  const steps = ramp(roles.accent);
  const [ref, seen] = useInView<HTMLDivElement>(ARRIVE);

  return (
    <Room
      index="02"
      title="Why OKLCH, shown not argued"
      lead="Both strips step through eleven lightness values. The plot underneath is the measured lightness of what actually came out."
      figure={
        <div ref={ref} className="flex h-full w-full flex-col justify-center gap-5">
          <RampComparison seed={roles.accent} steps={steps} shown={seen} />

          {/* The geometry, kept as a side chamber rather than as another block
              in the argument. A reader who wants it opens it; a reader who does
              not is one room closer to the tool. */}
          <details className="geometry">
            <summary>The geometry, if you want it</summary>
            <div className="mt-[6px] flex items-center gap-7 rounded-[16px] bg-[var(--bench)] p-5">
              <div className="flex shrink-0 items-center gap-5">
                <GamutSlice color={roles.accent} />
                <HueWheel colors={colors} size={124} />
              </div>
              <div className="flex flex-col gap-2.5 text-[13.5px] leading-[1.55] text-[var(--muted)]">
                <p>
                  That shape is not a diagram of the sRGB gamut — it is the gamut, at
                  your accent's hue, measured by the same binary search the app runs
                  on every colour it makes.
                </p>
                <p>
                  Clipping red, green and blue into range changes the hue and the
                  lightness at once, silently. Tint searches chroma downward instead,
                  holding lightness and hue fixed: it gives up exactly one property
                  and keeps the two the ramp's structure depends on.
                </p>
              </div>
            </div>
          </details>
        </div>
      }
    >
      <p>
        HSL's lightness is a number about the maths, not about your eye. Its steps
        clump and then lurch, and how badly depends on the hue you started from.
      </p>
      <p>
        OKLCH is built on measurements of human perception, so equal steps in{" "}
        <em>L</em> look like equal steps — which is why a ramp generated once can be
        trusted across every hue a user might type.
      </p>
    </Room>
  );
}

// ---------------------------------------------------------------------------
// 03 — the measuring chamber
// ---------------------------------------------------------------------------

function Three({ roles }: RoomProps) {
  const [ref, seen] = useInView<HTMLDivElement>(ARRIVE);

  return (
    <Room
      index="03"
      title="The number it all rests on"
      lead="Because the interface is painted in your palette, no text colour in it can be written down in advance. Every one is solved at render time."
      figure={
        <div ref={ref} className="flex h-full w-full items-center gap-6">
          <div className="flex h-[58vh] min-w-0 flex-[1.15] items-center rounded-[20px] bg-[var(--bench)] p-6">
            <InkSearch surface={roles.surface} shown={seen} />
          </div>

          {/* The bound the whole architecture rests on, at the size of the
              claim rather than the size of a footnote. */}
          <div className="flex h-[58vh] min-w-0 flex-1 flex-col justify-center gap-5 rounded-[20px] bg-[var(--surface)] px-7">
            <p className="tabular leading-[0.8] font-bold tracking-[-0.05em] text-[var(--ink)]">
              <span style={{ fontSize: "clamp(72px, 9vw, 150px)" }}>4.58</span>
              <span className="text-[24px] font-medium text-[var(--muted)]">:1</span>
            </p>
            <p className="max-w-[32ch] text-[14px] leading-[1.55] text-[var(--muted)]">
              The worst case for black-or-white text across every colour sRGB can
              produce, at a relative luminance of about 0.179. Above the 4.5 AA needs,
              below the 7 AAA needs — so AA is always reachable for any seed, and AAA
              sometimes simply is not.
            </p>
          </div>
        </div>
      }
    >
      <p>
        <code className="tabular text-[13.5px]">deriveInk()</code> searches for the{" "}
        <em>softest</em> ink that still clears 4.5:1 against the surface it will sit
        on — so pastel surfaces keep their gentleness right up until legibility would
        be spent.
      </p>
      <p>
        A test sweeps roughly five thousand surfaces across every hue, lightness and
        chroma level and asserts the derived ink clears AA on all of them. It is the
        one test that has to pass, because it is the claim the architecture is built
        on.
      </p>
    </Room>
  );
}

// ---------------------------------------------------------------------------
// 04 — the palette going through the critique
// ---------------------------------------------------------------------------

const WORD = { bad: "Problem", warn: "Worth a look", good: "Good" } as const;

/** The verdict, drawn rather than only worded — a shape a reader can scan a
    whole list of at a glance, with the word next to it for anyone the shape
    alone would leave guessing. Monochrome on purpose: the system never
    reaches for red or green to say pass or fail, only for the ink and the
    line it already has. */
function Verdict({ severity }: { severity: "good" | "warn" | "bad" }) {
  return (
    <svg width="15" height="15" viewBox="0 0 14 14" className="mt-[3px] shrink-0" aria-hidden>
      <circle cx="7" cy="7" r="6.25" fill="none" stroke="var(--line)" strokeWidth="1.2" />
      {severity === "good" && (
        <path d="M4 7.2l2 2 4-4.4" fill="none" stroke="var(--ink)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {severity === "bad" && (
        <path d="M4.5 4.5l5 5M9.5 4.5l-5 5" fill="none" stroke="var(--ink)" strokeWidth="1.4" strokeLinecap="round" />
      )}
      {severity === "warn" && (
        <line x1="4.2" y1="7" x2="9.8" y2="7" stroke="var(--ink)" strokeWidth="1.4" strokeLinecap="round" />
      )}
    </svg>
  );
}

function Four({ colors, verdict }: RoomProps) {
  const [ref, seen] = useInView<HTMLDivElement>(ARRIVE);
  const score = useCountUp(verdict.score, seen, 1100);

  return (
    <Room
      index="04"
      title="A tool with an opinion"
      lead="Generating colours is easy. Knowing which ones to throw away is the part that makes it a tool rather than a random number generator."
      figure={
        <div ref={ref} className="flex h-[62vh] w-full items-stretch gap-3">
          {/* The subject of the judgement: the palette itself, standing up.
              Die-cut top corners, flat at the foot — a row of chips on a
              shelf, not a row of generic pill bars. */}
          <div className="flex w-[26%] shrink-0 gap-1.5">
            {colors.map((c, i) => (
              <div
                key={i}
                className="relative min-w-0 flex-1 overflow-hidden rounded-t-[18px] rounded-b-[4px]"
                style={{ background: toCss(c) }}
              >
                <span
                  className="tabular absolute top-3 left-1/2 -translate-x-1/2 text-[10px] tracking-[0.04em]"
                  style={{ color: toCss(deriveInk(c, 4.5)) }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                {/* Set down the chip rather than across it. Eight colours at
                    26% of the figure leaves each chip narrower than a hex code,
                    and a centred horizontal label then runs out over its
                    neighbours. A paint chip signs itself down the spine anyway. */}
                <span
                  className="tabular absolute bottom-3 left-1/2 -translate-x-1/2 text-[10.5px] tracking-[0.04em] whitespace-nowrap"
                  style={{
                    color: toCss(deriveInk(c, 4.5)),
                    writingMode: "vertical-rl",
                    rotate: "180deg",
                  }}
                >
                  {toHex(c).toUpperCase()}
                </span>
              </div>
            ))}
          </div>

          {/* The judgement, arriving in order, with the summary landing last.
              The score sits in a stamped ring rather than as a bare number —
              a verdict this page is willing to put its name to, not a stat
              in a dashboard. */}
          <div className="flex min-w-0 flex-1 flex-col rounded-[20px] bg-[var(--bench)] p-6">
            <div className="flex items-center gap-5">
              <div
                className="tabular flex aspect-square w-[104px] shrink-0 items-center justify-center rounded-full text-[38px] font-bold tracking-[-0.03em] text-[var(--ink)]"
                style={{ border: "1.5px solid var(--line)", transform: "rotate(-4deg)" }}
              >
                {Math.round(score)}
              </div>
              <p className="max-w-[26ch] text-[13.5px] text-[var(--muted)]">
                what Tint thinks of the palette you are currently reading this in, out of 100
              </p>
            </div>

            <ul className="mt-5 flex min-h-0 flex-1 flex-col gap-[6px] overflow-hidden">
              {verdict.notes.slice(0, 5).map((n, i) => (
                <li
                  key={n.id}
                  className={`note-rule enter-up relative flex items-start gap-2.5 overflow-hidden rounded-[10px] bg-[var(--bg)] py-2.5 pr-4 pl-5 ${seen ? "entered" : ""}`}
                  style={{ transitionDelay: `${140 + i * 90}ms` }}
                >
                  <Verdict severity={n.severity} />
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-baseline gap-x-2 text-[13px] font-medium text-[var(--ink)]">
                      {n.title}
                      <span className="tabular text-[11px] font-normal text-[var(--muted)]">
                        {WORD[n.severity]}
                      </span>
                    </p>
                    <p className="mt-0.5 text-[12px] leading-[1.5] text-[var(--muted)]">{n.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      }
    >
      <p>
        Seven checks, each answering something a person would actually ask before
        shipping a palette: is there enough lightness between these to put text on
        them, are two of them doing the same job, is one shouting over the rest.
      </p>
      <p>
        The same function scores the ninety candidates the generator builds before it
        shows you one. So Tint never suggests a palette it would then complain about
        — and the taste lives in one readable place rather than smeared across a
        generator.
      </p>
    </Room>
  );
}

// ---------------------------------------------------------------------------
// 05 — subtraction
// ---------------------------------------------------------------------------

/** What is not in the box, and what is. The room is a list of absences. */
const ABSENT = ["Accounts", "A server", "A colour library", "A model behind the mood search", "An API key"];
const PRESENT = ["OKLab conversions", "Gamut mapping", "Harmony schemes", "The WCAG maths"];

function Five({ colors }: RoomProps) {
  const [ref, seen] = useInView<HTMLDivElement>(ARRIVE);

  return (
    <Room
      index="05"
      title="What I left out"
      lead="No accounts, no server, no colour library, and no model behind the mood search."
      figure={
        <div ref={ref} className="relative flex h-[58vh] w-full flex-col justify-center gap-9">
          <ScratchOut className="pointer-events-none absolute top-0 right-2 w-10 opacity-60" />

          {/* Struck first, so the room reads as clearing rather than as listing. */}
          <ul className="flex flex-col gap-2">
            {ABSENT.map((item, i) => (
              <li
                key={item}
                className={`enter-up tabular text-[22px] leading-[1.3] tracking-[-0.02em] text-[var(--muted)] line-through decoration-[1.5px] xl:text-[28px] ${seen ? "entered" : ""}`}
                style={{ transitionDelay: `${i * 80}ms`, textDecorationColor: "var(--line)" }}
              >
                {item}
              </li>
            ))}
          </ul>

          <div className="h-px w-full bg-[var(--line)]" />

          {/* What is left, in the palette, solid. */}
          <div>
            <p className="mb-3 text-[13px] tracking-[0.06em] text-[var(--muted)]">
              ABOUT FIVE HUNDRED LINES, NO DEPENDENCIES
            </p>
            <ul className="flex flex-wrap gap-2">
              {PRESENT.map((item, i) => {
                const c = colors[i % colors.length];
                return (
                  <li
                    key={item}
                    className={`enter-up rounded-full px-4 py-2 text-[14px] font-medium ${seen ? "entered" : ""}`}
                    style={{
                      transitionDelay: `${ABSENT.length * 80 + i * 80}ms`,
                      background: c ? toCss(c) : "var(--surface)",
                      color: c ? toCss(deriveInk(c, 4.5)) : "var(--ink)",
                    }}
                  >
                    {item}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      }
    >
      <p>
        Nothing here needs saving on a server, so there is nothing to sign into.
        Images are clustered in the browser and never uploaded. “Something calm and
        coastal” is answered by searching tags on the seventy built-in palettes —
        faster, cheaper and more predictable than asking a model, and it keeps an API
        key out of a static site.
      </p>
      <p>Writing the rest was the point.</p>
    </Room>
  );
}

