import { type Oklch, toCss } from "../lib/color.ts";

/**
 * The story's decorative illustrations.
 *
 * Flat paper collage: torn edges, no gradients, no shadows — the same rule
 * the rest of the system follows, for the same reason. They are drawn rather
 * than generated because a raster image cannot repaint itself, and every
 * colour on this page has to move when the palette does. A PNG of a swatch
 * book would be the one thing on the page still wearing last week's palette.
 *
 * Torn edges are hand-written paths with a few kinks in them. Regular enough
 * to read as paper, irregular enough not to read as a rounded rectangle.
 */

/** Sample the palette without running off the end of a three-colour one. */
const pick = (colors: Oklch[], i: number) => toCss(colors[i % colors.length]);

// ---------------------------------------------------------------------------
// 1 — The swatch book, hero background layer
// ---------------------------------------------------------------------------

/**
 * An open swatch book on a desk, chips splayed across the right-hand page.
 * Sits *behind* the fan deck at low opacity: a textural layer, not a subject.
 * Nothing in it carries information, so it is hidden from assistive tech.
 */
export function SwatchBook({ colors, className = "" }: { colors: Oklch[]; className?: string }) {
  return (
    <svg viewBox="0 0 540 340" className={className} aria-hidden focusable="false">
      {/* desk */}
      <path
        d="M6 296 L118 288 L286 294 L432 286 L534 293 L530 302 L292 308 L104 301 L10 305 Z"
        fill="var(--line)"
      />

      {/* left board, torn along the spine */}
      <path
        d="M34 92 L246 62 L258 70 L262 268 L250 276 L40 258 L28 250 Z"
        fill="var(--surface)"
        stroke="var(--line)"
        strokeWidth="2"
      />
      {/* right board */}
      <path
        d="M282 70 L294 62 L508 90 L514 100 L506 252 L494 260 L288 272 L278 264 Z"
        fill="var(--surface)"
        stroke="var(--line)"
        strokeWidth="2"
      />
      {/* the spine itself */}
      <path d="M262 68 L280 68 L278 270 L260 270 Z" fill="var(--line)" />

      {/* printed rows on the left page — labels, not colour */}
      {[0, 1, 2, 3, 4].map((r) => (
        <rect
          key={r}
          x={58}
          y={110 + r * 30}
          width={r === 4 ? 96 : 158}
          height={7}
          rx={3.5}
          fill="var(--line)"
        />
      ))}

      {/* chips splayed across the right page, each tipped a little */}
      {colors.map((c, i) => {
        const x = 312 + i * 34;
        const tilt = -7 + ((i * 5) % 13);
        return (
          <g key={i} transform={`rotate(${tilt} ${x + 22} 176)`}>
            <rect x={x} y={104} width={44} height={144} rx={9} fill={toCss(c)} />
            <rect x={x + 9} y={228} width={26} height={5} rx={2.5} fill="var(--bg)" opacity="0.65" />
          </g>
        );
      })}

      {/* two loose chips, dropped on the desk */}
      <g transform="rotate(-16 96 258)">
        <rect x={66} y={228} width={60} height={44} rx={9} fill={pick(colors, 1)} />
      </g>
      <g transform="rotate(11 168 266)">
        <rect x={138} y={240} width={60} height={44} rx={9} fill={pick(colors, 3)} />
      </g>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// 2 — The magnifier, section 01
// ---------------------------------------------------------------------------

/**
 * A glass held over a block of text that is too faint to read — the failure
 * this section is about, drawn once. The lines under the lens are the same
 * ink as the lines outside it, so the glass magnifies without cheating.
 */
export function Magnifier({ tint, className = "" }: { tint: Oklch; className?: string }) {
  return (
    <svg viewBox="0 0 132 132" className={className} aria-hidden focusable="false">
      {/* torn scrap of paper */}
      <path
        d="M10 26 L58 18 L104 24 L118 20 L122 96 L112 104 L64 110 L18 102 L8 96 Z"
        fill="var(--surface)"
        stroke="var(--line)"
        strokeWidth="2"
      />
      {[0, 1, 2, 3].map((r) => (
        <rect
          key={r}
          x={22}
          y={40 + r * 15}
          width={r === 3 ? 46 : 82}
          height={6}
          rx={3}
          fill="var(--line)"
        />
      ))}

      {/* handle, under the lens so the joint disappears */}
      <path
        d="M92 92 L118 122"
        stroke="var(--ink)"
        strokeWidth="9"
        strokeLinecap="round"
      />
      {/* lens */}
      <circle cx={72} cy={70} r={34} fill={toCss(tint)} />
      <circle cx={72} cy={70} r={34} fill="none" stroke="var(--ink)" strokeWidth="5" />
      {/* the same two lines, now readable */}
      <rect x={50} y={62} width={44} height={7} rx={3.5} fill="var(--ink)" />
      <rect x={50} y={78} width={28} height={7} rx={3.5} fill="var(--ink)" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// 3 — The squint, section 03
// ---------------------------------------------------------------------------

/** Two eyes narrowed at type that is fighting back. Marginal decoration. */
export function Squint({ tint, className = "" }: { tint: Oklch; className?: string }) {
  return (
    <svg viewBox="0 0 150 92" className={className} aria-hidden focusable="false">
      {[26, 106].map((cx, i) => (
        <g key={cx}>
          {/* the eye, squeezed into a lens shape */}
          <path
            d={`M${cx - 22} 52 Q${cx} 30 ${cx + 22} 52 Q${cx} 66 ${cx - 22} 52 Z`}
            fill={toCss(tint)}
            stroke="var(--ink)"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <circle cx={cx + (i === 0 ? 4 : -4)} cy={49} r={7} fill="var(--ink)" />
          {/* brow, pulled down on the inside edge */}
          <path
            d={`M${cx - 26} 26 Q${cx} 14 ${cx + 26} 24`}
            fill="none"
            stroke="var(--ink)"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </g>
      ))}
      {/* the thing being squinted at */}
      <rect x={58} y={44} width={34} height={4} rx={2} fill="var(--line)" />
      <rect x={62} y={54} width={26} height={4} rx={2} fill="var(--line)" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// 4 — The scratch-out, section 05
// ---------------------------------------------------------------------------

/** A hand-drawn cross, for the section about what did not get built. */
export function ScratchOut({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden focusable="false">
      <path
        d="M13 12 Q34 30 51 51 M52 13 Q33 32 12 50"
        fill="none"
        stroke="var(--line)"
        strokeWidth="7"
        strokeLinecap="round"
      />
    </svg>
  );
}
