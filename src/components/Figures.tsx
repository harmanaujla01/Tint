import { type RefObject, useMemo } from "react";
import {
  type Oklch,
  clampToGamut,
  contrastFloor,
  deriveInk,
  oklchToRgb,
  rgbToOklch,
  toCss,
  toHex,
} from "../lib/color.ts";

/**
 * The figures for the story.
 *
 * Every one of these is *computed*, not drawn: the gamut slice is the real
 * sRGB boundary for that hue, the lightness plot is the measured OKLab
 * lightness of the two ramps, the ink search shows where the real binary
 * search landed. Nothing here is an artist's impression of the algorithm, so
 * a figure cannot quietly go on claiming something the code stopped doing —
 * and all of it repaints in whatever palette the reader is holding.
 */

// ---------------------------------------------------------------------------
// The fan deck — the hero object
// ---------------------------------------------------------------------------

/** A chip's own outline: a rectangular blade with just its top corners
    rounded, the way a real fan-deck chip is die-cut card rather than a
    moulded pill. The bottom stays square where it meets the rivet. */
function chipPath(cx: number, topY: number, botY: number, halfW: number, rTop: number, rBot: number) {
  const l = cx - halfW;
  const r = cx + halfW;
  return [
    `M ${l + rTop} ${topY}`,
    `L ${r - rTop} ${topY}`,
    `Q ${r} ${topY} ${r} ${topY + rTop}`,
    `L ${r} ${botY - rBot}`,
    `Q ${r} ${botY} ${r - rBot} ${botY}`,
    `L ${l + rBot} ${botY}`,
    `Q ${l} ${botY} ${l} ${botY - rBot}`,
    `L ${l} ${topY + rTop}`,
    `Q ${l} ${topY} ${l + rTop} ${topY}`,
    "Z",
  ].join(" ");
}

/**
 * A paint fan deck, the way a colour actually gets chosen off a shelf.
 * Rectangular chips, riveted at one corner and fanned out — the real object,
 * not an illustration of one.
 *
 * Each blade is its own hinge. Every blade turns a full revolution and comes
 * back to the angle it started at, so the deck ends the scroll as the same neat
 * fan it began as — it has simply rolled over once on the way. The rightmost
 * leads and the queue runs back along the deck, so the turn travels through it
 * one blade at a time instead of the whole thing pivoting as a slab. When each
 * blade is released is `useFanSweep`'s arithmetic; all this publishes is where
 * each one sits in the queue.
 *
 * Full view: the artboard is square and the rivet is at the middle of it, so
 * the whole swept circle is inside the figure's own box. The deck used to sit
 * near the foot of a shallow board and shrink to 42% as it turned, because at
 * full size a revolution ploughed through the headline beside it — which is the
 * same trick as hiding the bottom of the orbit behind a wall. Giving the circle
 * its own room instead means nothing is masked and nothing is scaled away: the
 * entire revolution is on screen, at full size, the whole way round.
 *
 * The rivet is drawn last, on top, fixed — the pin the blades turn on, not a
 * thing that itself moves.
 */
export function ChipFan({
  colors,
  deal = false,
  spinRef,
}: {
  colors: Oklch[];
  deal?: boolean;
  spinRef?: RefObject<SVGGElement | null>;
}) {
  const n = colors.length;
  const spread = 54;
  // A square board with the rivet dead centre: a blade is `cy - top` long, so
  // the circle it sweeps is exactly as wide as the board and stays inside it.
  const size = 620;
  const cx = size / 2;
  const cy = size / 2;
  const halfW = 42;
  const top = cy - 286;
  const front = colors[n - 1];
  const frontInk = toCss(deriveInk(front, 4.5));

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="chip-fan w-full max-w-[620px] overflow-visible"
      role="img"
      aria-label={`A paint fan deck showing ${n} colours: ${colors.map(toHex).join(", ")}`}
    >
      <g ref={spinRef} style={{ transformOrigin: `${cx}px ${cy}px` }}>
        {colors.map((c, i) => {
          const angle = -spread / 2 + (spread * i) / Math.max(1, n - 1);
          const isFront = i === n - 1;
          return (
            // Three groups, not one. The sweep, the deal-in and the drift all
            // animate `transform`, and on a single element the last
            // declaration simply wins. Nesting lets each own its own.
            <g
              key={i}
              // Right-hand blade first, then back along the deck to the left one.
              data-step={n - 1 - i}
              style={{ transformOrigin: `${cx}px ${cy}px` }}
            >
              <g
                className={deal ? "chip-deal" : undefined}
                style={deal ? { animationDelay: `${120 + i * 80}ms` } : undefined}
              >
                <g
                  className="chip"
                  style={{
                    ["--a" as string]: `${angle}deg`,
                    transformOrigin: `${cx}px ${cy}px`,
                    animationDelay: `${i * -1.7}s`,
                  }}
                >
                  <path
                    d={chipPath(cx, top, cy, halfW, 14, 6)}
                    fill={toCss(c)}
                    stroke="var(--line)"
                    strokeWidth={1}
                  />
                  {/* Every value on this page is printed as text — the one
                      chip facing the reader carries its own hex, the way a
                      real sample would. */}
                  {isFront && (
                    <text
                      x={cx}
                      y={cy - 40}
                      textAnchor="middle"
                      fontSize="15"
                      fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                      fontWeight="500"
                      letterSpacing="0.01em"
                      fill={frontInk}
                    >
                      {toHex(front).toUpperCase()}
                    </text>
                  )}
                </g>
              </g>
            </g>
          );
        })}
      </g>

      {/* The rivet — fixed, on top, exactly where every chip's own bottom
          edge already sits. */}
      <circle cx={cx} cy={cy} r={14} fill="var(--line)" />
      <circle cx={cx} cy={cy} r={5} fill="var(--bg)" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Hue wheel
// ---------------------------------------------------------------------------

/** Where the palette's hues actually sit on the circle. */
export function HueWheel({ colors, size = 168 }: { colors: Oklch[]; size?: number }) {
  const stops = Array.from({ length: 24 }, (_, i) => {
    const h = (i / 24) * 360;
    return `${toCss(clampToGamut({ l: 0.72, c: 0.16, h }))} ${h}deg`;
  }).join(", ");

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Hue wheel marking ${colors.length} palette hues`}
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{ background: `conic-gradient(from 90deg, ${stops})` }}
      />
      <div
        className="absolute rounded-full"
        style={{ inset: size * 0.19, background: "var(--surface)" }}
      />
      {colors.map((c, i) => {
        const r = size * 0.405;
        const rad = ((c.h - 90) * Math.PI) / 180;
        return (
          <span
            key={i}
            className="absolute size-5 rounded-full border-2"
            style={{
              background: toCss(c),
              borderColor: "var(--surface)",
              left: size / 2 + r * Math.cos(rad) - 10,
              top: size / 2 + r * Math.sin(rad) - 10,
            }}
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// HSL vs OKLCH
// ---------------------------------------------------------------------------

/** The seed's own hue and saturation, read back off its RGB. */
function hslOf(seed: Oklch) {
  const { r, g, b } = oklchToRgb(seed);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  let h = 0;
  if (d > 1e-6) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  const l = (max + min) / 2;
  return { h, s: d < 1e-6 ? 0 : d / (1 - Math.abs(2 * l - 1)) };
}

/** HSL, converted back so we can measure what it really did. */
function hslToOklch(h: number, s: number, l: number): Oklch {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return rgbToOklch({ r: f(0), g: f(8), b: f(4) });
}

const HSL_STEPS = [96, 90, 82, 72, 62, 52, 44, 37, 30, 23, 16];

/**
 * The control group and the measurement, in one figure.
 *
 * Both strips step through eleven values the same way; the plot underneath is
 * the *measured* OKLab lightness of each swatch that came out. OKLCH lands on
 * a straight line because that is what perceptual uniformity means. HSL does
 * not, and the size of the wobble depends on the hue you started from — which
 * is the whole argument, made with data rather than adjectives.
 */
export function RampComparison({
  seed,
  steps,
  shown = true,
}: {
  seed: Oklch;
  steps: Oklch[];
  shown?: boolean;
}) {
  const hsl = useMemo(() => {
    const { h, s } = hslOf(seed);
    return HSL_STEPS.map((l) => hslToOklch(h, s, l / 100));
  }, [seed]);

  const W = 660;
  const H = 116;
  const pad = 8;
  const x = (i: number) => pad + (i / (HSL_STEPS.length - 1)) * (W - pad * 2);
  const y = (l: number) => pad + (1 - l) * (H - pad * 2);
  const line = (row: Oklch[]) => row.map((c, i) => `${x(i)},${y(c.l)}`).join(" ");

  const rows = [
    { label: "HSL", colors: hsl },
    { label: "OKLCH", colors: steps },
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* Two rulers laid down side by side: each strip's swatches arrive
          left to right, the second a beat behind the first. */}
      {rows.map((row, r) => (
        <div key={row.label}>
          <p className="tabular mb-1.5 text-[12px] text-[var(--muted)]">{row.label}</p>
          <div className="flex gap-1 overflow-hidden rounded-[14px] bg-[var(--bench)] p-1">
            {row.colors.map((c, i) => (
              <div
                key={i}
                className={`h-16 flex-1 rounded-[8px] lay-in ${shown ? "lay-in-on" : ""}`}
                style={{ background: toCss(c), transitionDelay: `${r * 220 + i * 45}ms` }}
              />
            ))}
          </div>
        </div>
      ))}

      <div className="rounded-[14px] bg-[var(--bench)] p-3">
        <p className="tabular mb-1 text-[12px] text-[var(--muted)]">
          Measured lightness of each swatch above
        </p>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          role="img"
          aria-label="Measured OKLab lightness of each step. The OKLCH ramp forms a straight line; the HSL ramp bends away from it."
        >
          <line x1={x(0)} y1={y(steps[0].l)} x2={x(10)} y2={y(steps[10].l)}
            stroke="var(--line)" strokeWidth="1" strokeDasharray="3 4" />
          {/* `pathLength="1"` normalises both polylines, so one dash length
              draws a short line and a long one at the same rate. */}
          <polyline points={line(hsl)} fill="none" stroke="var(--muted)" strokeWidth="2"
            strokeLinejoin="round" strokeDasharray="5 4" opacity={shown ? 1 : 0}
            className="plot-fade" style={{ transitionDelay: "620ms" }} />
          <polyline points={line(steps)} fill="none" stroke="var(--ink)" strokeWidth="2.5"
            strokeLinejoin="round" pathLength={1} className="plot-draw"
            strokeDasharray={1} strokeDashoffset={shown ? 0 : 1} />
          {hsl.map((c, i) => (
            <circle key={`h${i}`} cx={x(i)} cy={y(c.l)} r="3" fill="var(--muted)"
              className="plot-fade" opacity={shown ? 1 : 0}
              style={{ transitionDelay: `${700 + i * 30}ms` }} />
          ))}
          {steps.map((c, i) => (
            <circle key={`o${i}`} cx={x(i)} cy={y(c.l)} r="4" fill={toCss(c)}
              stroke="var(--ink)" strokeWidth="1.5"
              className="plot-fade" opacity={shown ? 1 : 0}
              style={{ transitionDelay: `${300 + i * 55}ms` }} />
          ))}
        </svg>
        <p className="mt-1 flex flex-wrap gap-x-4 text-[12px] text-[var(--muted)]">
          <span>— solid: OKLCH, evenly spaced</span>
          <span>-- dashed: HSL, clumping then lurching</span>
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The gamut slice
// ---------------------------------------------------------------------------

/**
 * The real sRGB boundary at one hue, drawn by asking the gamut mapper.
 *
 * Each band is a gradient running out to exactly the chroma that lightness can
 * hold — so the pointed shape is not an illustration of the gamut, it *is* the
 * gamut, measured by the same binary search the app runs on every colour.
 */
export function GamutSlice({ color }: { color: Oklch }) {
  const BANDS = 34;
  const W = 300;
  const H = 260;

  const bands = useMemo(
    () =>
      Array.from({ length: BANDS }, (_, i) => {
        const l = (i + 0.5) / BANDS;
        return { l, maxC: clampToGamut({ l, c: 0.5, h: color.h }).c };
      }),
    [color.h],
  );

  const peak = Math.max(...bands.map((b) => b.maxC), 0.001);
  const sx = (c: number) => 30 + (c / peak) * (W - 46);
  const sy = (l: number) => H - 22 - l * (H - 42);

  // A request the screen cannot honour, and where it lands after mapping.
  const asked = { ...color, c: peak * 1.35 };
  const mapped = clampToGamut(asked);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full max-w-[320px]"
      role="img"
      aria-label={`The sRGB gamut at hue ${color.h.toFixed(0)} degrees. A request at chroma ${asked.c.toFixed(3)} falls outside it and is mapped back to ${mapped.c.toFixed(3)}, holding lightness and hue.`}
    >
      <defs>
        {bands.map((b, i) => (
          <linearGradient key={i} id={`gs${i}`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor={toCss({ l: b.l, c: 0, h: color.h })} />
            <stop offset="100%" stopColor={toCss({ l: b.l, c: b.maxC, h: color.h })} />
          </linearGradient>
        ))}
      </defs>

      {bands.map((b, i) => (
        <rect
          key={i}
          x={sx(0)}
          y={sy(b.l) - (H - 42) / BANDS / 2}
          width={Math.max(1, sx(b.maxC) - sx(0))}
          height={(H - 42) / BANDS + 0.8}
          fill={`url(#gs${i})`}
        />
      ))}

      {/* axes */}
      <line x1={sx(0)} y1={sy(0)} x2={sx(0)} y2={sy(1)} stroke="var(--line)" strokeWidth="1" />
      <text x={4} y={sy(1) + 4} fontSize="10" fill="var(--muted)" className="tabular">L 1</text>
      <text x={4} y={sy(0) + 4} fontSize="10" fill="var(--muted)" className="tabular">L 0</text>
      <text x={sx(0)} y={H - 6} fontSize="10" fill="var(--muted)" className="tabular">chroma →</text>

      {/* the request, outside */}
      <line x1={sx(asked.c)} y1={sy(asked.l)} x2={sx(mapped.c)} y2={sy(mapped.l)}
        stroke="var(--ink)" strokeWidth="1.5" strokeDasharray="4 3" />
      <circle cx={sx(asked.c)} cy={sy(asked.l)} r="5" fill="none"
        stroke="var(--ink)" strokeWidth="1.5" strokeDasharray="2 2" />
      <circle cx={sx(mapped.c)} cy={sy(mapped.l)} r="6" fill={toCss(mapped)}
        stroke="var(--ink)" strokeWidth="1.5" />
      <text x={sx(asked.c) + 9} y={sy(asked.l) + 3} fontSize="10" fill="var(--muted)">asked</text>
      <text x={sx(mapped.c) - 9} y={sy(mapped.l) - 10} fontSize="10" textAnchor="end"
        fill="var(--ink)" fontWeight="500">kept</text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// The ink search
// ---------------------------------------------------------------------------

/**
 * Where `deriveInk` looked, and where it stopped.
 *
 * The bar is every lightness at the surface's own hue. The shaded part is
 * where contrast clears 4.5:1 — computed here by the same `contrastFloor` the
 * search uses, so the picture and the algorithm cannot disagree. The marker is
 * the answer: the softest ink on the legal side of the line.
 */
export function InkSearch({ surface, shown = true }: { surface: Oklch; shown?: boolean }) {
  const N = 90;
  const W = 620;
  const H = 88;

  const { ink, band } = useMemo(() => {
    const tint = Math.min(surface.c, 0.04);
    const samples = Array.from({ length: N }, (_, i) => {
      const l = i / (N - 1);
      const c = clampToGamut({ l, c: tint, h: surface.h });
      return { l, c, pass: contrastFloor(c, surface) >= 4.5 };
    });
    return { ink: deriveInk(surface, 4.5), band: samples };
  }, [surface]);

  const x = (l: number) => 6 + l * (W - 12);
  const w = (W - 12) / N + 1;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label={`Every lightness at this hue. Those clearing 4.5 to 1 against the surface are marked; the search returns ${toHex(ink)}.`}
    >
      {/* The search runs left to right, so the picture does too. Ninety
          staggered opacity transitions, no timeline to keep in sync. */}
      {band.map((s, i) => (
        <rect key={i} x={x(s.l) - w / 2} y={10} width={w} height={30}
          fill={toCss(s.c)} className="plot-fade"
          opacity={shown ? (s.pass ? 1 : 0.28) : 0}
          style={{ transitionDelay: `${i * 7}ms` }} />
      ))}
      <rect x={6} y={10} width={W - 12} height={30} rx="8" fill="none"
        stroke="var(--line)" strokeWidth="1" />

      {/* the surface itself */}
      <line x1={x(surface.l)} y1={4} x2={x(surface.l)} y2={46} stroke="var(--ink)" strokeWidth="1.5" />
      <text x={x(surface.l)} y={60} fontSize="11" textAnchor="middle" fill="var(--muted)">
        the surface
      </text>

      {/* the answer, landing after the sweep has passed it */}
      <g className="plot-fade" opacity={shown ? 1 : 0} style={{ transitionDelay: "760ms" }}>
        <circle cx={x(ink.l)} cy={25} r="9" fill={toCss(ink)} stroke="var(--ink)" strokeWidth="2" />
        <text x={x(ink.l)} y={78} fontSize="11" textAnchor="middle" fill="var(--ink)" fontWeight="500"
          className="tabular">
          {toHex(ink)}
        </text>
        <line x1={x(ink.l)} y1={38} x2={x(ink.l)} y2={64} stroke="var(--ink)" strokeWidth="1.5" />
      </g>
      <text x={6} y={78} fontSize="11" fill="var(--muted)">faded = fails 4.5:1</text>
    </svg>
  );
}
