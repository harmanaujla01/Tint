import type { Oklch } from "../lib/color.ts";
import { CANDIDATES, hueGap } from "../lib/harmony.ts";
import type { Frame } from "../lib/replay.ts";

/** How many distinct hue families the chromatic colours fall into. */
export function hueFamilies(colors: Oklch[]): number {
  const hues = colors.filter((c) => c.c > 0.035).map((c) => c.h).sort((a, b) => a - b);
  if (hues.length === 0) return 0;
  // A family is a run of hues within 40° of the one before it — the same
  // threshold the critique's "too close to be a contrast" check works from.
  let families = 1;
  for (let i = 1; i < hues.length; i++) if (hueGap(hues[i - 1], hues[i]) > 40) families++;
  // The list wraps: the last hue may be a neighbour of the first.
  if (families > 1 && hueGap(hues[hues.length - 1], hues[0]) <= 40) families--;
  return families;
}

/**
 * The tool showing its working.
 *
 * `fromHarmony` has always known that it picked, say, a split-complement off a
 * particular seed — it just dropped the name on the floor the moment it
 * returned. This is that sentence, put back. Everything after the first clause
 * is measured live off whatever is in the bar now, so the line stays true when
 * you edit a colour by hand and the provenance clause quietly stops claiming
 * credit for it.
 */
export function Reasoning({
  label,
  colors,
  locked,
  frame,
}: {
  label: string | null;
  colors: Oklch[];
  locked: number;
  /** One frame of the search replay, while one is playing. */
  frame?: Frame | null;
}) {
  if (frame)
    return (
      <p className="tabular px-1 pt-[6px] text-[11.5px] leading-[1.5] tracking-[0.005em] text-[var(--muted)] sm:text-[12px]">
        scoring candidate {String(frame.index + 1).padStart(2, "0")}/{CANDIDATES}  ·  this one {String(frame.score).padStart(2, "0")}  ·  best so far {frame.best}
        {frame.score >= frame.best ? "  ·  leader" : ""}
      </p>
    );

  const ls = colors.map((c) => c.l);
  const spread = Math.max(...ls) - Math.min(...ls);
  const families = hueFamilies(colors);

  const parts = [
    label ?? "edited by hand",
    `spread ${spread.toFixed(2)}`,
    `${families} hue famil${families === 1 ? "y" : "ies"}`,
    `${locked} locked`,
  ];

  return (
    <p className="tabular px-1 pt-[6px] text-[11.5px] leading-[1.5] tracking-[0.005em] text-[var(--muted)] sm:text-[12px]">
      {parts.join("  ·  ")}
    </p>
  );
}
