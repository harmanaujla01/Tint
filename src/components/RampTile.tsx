import { useMemo } from "react";
import { type Oklch, deriveInk, ramp, toCss, toHex } from "../lib/color.ts";
import { STEP_NAMES } from "../lib/palette.ts";
import { useSay } from "../lib/status.ts";
import { useCopy } from "../lib/useCopy.ts";
import { Tile } from "./Tile.tsx";

/**
 * The selected colour, opened out into a full eleven-step scale.
 *
 * The palette is the decision; this is the thing you actually ship. Kept as a
 * drill-down rather than the main event because nobody picks a brand colour by
 * looking at eleven tints of it — but everybody needs them the moment the
 * palette is agreed.
 */
export function RampTile({ color }: { color: Oklch }) {
  const { copied, copy } = useCopy();
  const say = useSay();
  const steps = useMemo(() => ramp(color), [color]);

  // What the footnote under this tile used to say, per step and with that
  // step's own numbers in it. The clamp note is the interesting half and it
  // was previously stated in general terms about a scale where it is only
  // ever true of the two or three steps at the ends.
  const describe = (i: number) => {
    const s = steps[i];
    const wanted = color.c * (0.35 + 0.65 * Math.sin(Math.PI * (1 - s.l) ** 0.85));
    const clamped = wanted - s.c > 0.0015;
    return `step ${STEP_NAMES[i]} · ${toHex(s).toUpperCase()} · L ${s.l.toFixed(3)} C ${s.c.toFixed(3)} H ${s.h.toFixed(1)}${
      clamped ? ` · chroma pulled from ${wanted.toFixed(3)} to stay inside sRGB` : ""
    }`;
  };

  return (
    <Tile
      label="Scale"
      aside={
        <span className="tabular text-[12px] text-[var(--muted)]">
          {copied === "__error__"
            ? "Copy blocked"
            : copied
              ? `${copied} copied`
              : `${toHex(color)} · 11 steps`}
        </span>
      }
      className="min-h-0"
    >
      {/* The bench is chroma 0 on purpose. Judge a colour against a tinted
          surface and you are judging the surface too. */}
      <div
        className="my-auto flex gap-1 overflow-hidden rounded-[12px] bg-[var(--bench)] p-1"
        onMouseLeave={() => say(null)}
      >
        {steps.map((step, i) => {
          const hex = toHex(step);
          return (
            <button
              key={STEP_NAMES[i]}
              onClick={() => void copy(hex, STEP_NAMES[i])}
              onMouseEnter={() => say(describe(i))}
              onFocus={() => say(describe(i))}
              title={`${STEP_NAMES[i]} · ${hex} — click to copy`}
              aria-label={`Step ${STEP_NAMES[i]}, ${hex}`}
              className="group relative h-24 flex-1 shrink-0 basis-0 cursor-pointer rounded-[8px] transition-transform duration-200 ease-[var(--ease-out-quint)] hover:-translate-y-0.5"
              style={{ background: toCss(step), minWidth: 22 }}
            >
              <span
                className="tabular absolute inset-x-0 bottom-1 text-center text-[9px] font-medium opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                style={{ color: toCss(deriveInk(step, 4.5)) }}
              >
                {STEP_NAMES[i]}
              </span>
            </button>
          );
        })}
      </div>
    </Tile>
  );
}
