import { useState } from "react";
import { contrast, deriveInk, grade, toCss, toHex } from "../lib/color.ts";
import type { Palette } from "../lib/harmony.ts";
import { useSay } from "../lib/status.ts";
import { type Review, type Vision, collapses } from "../lib/vision.ts";
import { Tile } from "./Tile.tsx";

/**
 * Every colour in the palette against every other one — and, on the pair you
 * are pointing at, the thing the number actually means.
 *
 * The grid demonstrates itself: a passing pair is drawn as the real pair, that
 * ratio printed in the row colour on the column colour. If you can read the
 * number, the combination works, because reading it *is* the test.
 *
 * The specimen underneath is the part no competitor has. A contrast checker
 * tests one pair in a box; this tests all of them at once and then blows up
 * whichever one you asked about into real text at a real size, in the ink the
 * engine derived rather than in a swatch. The crosshair is doing the work a
 * spreadsheet's frozen headers do — with n² cells at 36px, knowing which row
 * you are on is most of the job.
 */
export function MatrixTile({
  palette,
  highlight,
  vision = "normal",
  seen,
}: {
  palette: Palette;
  highlight: number[];
  vision?: Vision;
  /** What this simulation costs the palette, computed once for the whole app. */
  seen?: Review;
}) {
  const [hover, setHover] = useState<[number, number] | null>(null);
  const say = useSay();
  const colors = palette.map((s) => s.color);
  const labels = colors.map((c) => toHex(c).toUpperCase());

  const ratios = colors.map((fg) => colors.map((bg) => contrast(fg, bg)));
  const off = colors.length * (colors.length - 1);
  const passing = ratios.flat().filter((r) => r >= 4.5).length;
  const lit = new Set(highlight);

  /**
   * Pairs that are obviously different colours to normal vision and the same
   * colour under the current simulation. Not a contrast failure — the ratio
   * beside it is unchanged and usually passing, which is precisely why a
   * printed ratio cannot catch this and why the check has to exist separately.
   */
  const gone = colors.map((a) => colors.map((b) => collapses(a, b, vision)));
  const collapsedPairs = gone.flat().filter(Boolean).length / 2;

  /**
   * The ratio *as this eye sees it*, which is not the ratio printed in the
   * cell. The printed one is the real, shipped, checker-agreeing number and it
   * stays. This one is why the simulation is worth having: it is the second
   * way a pair can fail, and it is invisible to every tool that only checks
   * the hex codes.
   */
  const dropped = (r: number, c: number) =>
    r !== c && !!seen && vision !== "normal" && ratios[r][c] >= 4.5 && seen.seen[r][c] < 4.5;

  // At rest the specimen shows the palette's strongest pair — the one
  // combination you can definitely set body text in. A tile whose focal point
  // is blank until you touch it has no focal point.
  const strongest = (): [number, number] => {
    let best: [number, number] = [0, colors.length - 1];
    let top = -1;
    for (let r = 0; r < colors.length; r++)
      for (let c = 0; c < colors.length; c++)
        if (r !== c && ratios[r][c] > top) {
          top = ratios[r][c];
          best = [r, c];
        }
    return best;
  };

  const [sr, sc] = hover ?? strongest();
  const fg = colors[sr];
  const bg = colors[sc];
  const ratio = ratios[sr][sc];
  const level = grade(ratio);
  const shortfall = ratio < 4.5 ? 4.5 / ratio : 0;

  const describe = (r: number, c: number) => {
    if (r === c) return `${labels[r]} on itself — no contrast, and nothing to measure`;
    const v = ratios[r][c];
    const wcag =
      v >= 4.5
        ? `${v.toFixed(2)}:1 · passes AA${v >= 7 ? " and AAA" : ""}`
        : `${v.toFixed(2)}:1 · fails AA · needs ${(4.5 / v).toFixed(2)}× more`;
    const under = [
      gone[r][c] ? `under ${vision} these two are the same colour` : null,
      dropped(r, c)
        ? `seen at ${seen!.seen[r][c].toFixed(2)}:1 under ${vision}, which is below AA`
        : null,
    ].filter(Boolean);
    return [`${labels[r]} on ${labels[c]} — ${wcag}`, ...under].join(" · ");
  };

  return (
    <Tile
      label="Contrast"
      aside={
        <span className="tabular text-[12px] text-[var(--muted)]">
          {passing}/{off} pairs pass AA
          {collapsedPairs > 0 && ` · ${collapsedPairs} merged`}
          {seen && seen.dropped > 0 && ` · ${seen.dropped} lost`}
        </span>
      }
      className="min-h-0"
    >
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <table className="w-full border-separate border-spacing-[3px]">
          <caption className="sr-only">
            Contrast ratios for every pair of palette colours. Row is the text
            colour, column is the background.
          </caption>
          <thead>
            <tr>
              <th className="w-6" />
              {colors.map((c, i) => (
                <th key={i} scope="col" className="pb-1">
                  <span
                    className="mx-auto block size-4 rounded-[5px] border transition-[opacity,transform] duration-150"
                    style={{
                      background: toCss(c),
                      opacity: hover && hover[1] !== i ? 0.35 : 1,
                      transform: hover && hover[1] === i ? "scale(1.35)" : "none",
                    }}
                  />
                  <span className="sr-only">{labels[i]}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody
            onMouseLeave={() => {
              setHover(null);
              say(null);
            }}
          >
            {colors.map((_, r) => (
              <tr key={r}>
                <th scope="row" className="pr-1">
                  <span
                    className="block size-4 rounded-[5px] border transition-[opacity,transform] duration-150"
                    style={{
                      background: toCss(colors[r]),
                      opacity: hover && hover[0] !== r ? 0.35 : 1,
                      transform: hover && hover[0] === r ? "scale(1.35)" : "none",
                    }}
                  />
                  <span className="sr-only">{labels[r]}</span>
                </th>
                {colors.map((cell, c) => {
                  const v = ratios[r][c];
                  const pass = r !== c && v >= 4.5;
                  // The crosshair: everything off the pointer's row and column
                  // drops back, so the pair being read is the only thing at
                  // full strength.
                  const dimmed =
                    (hover && hover[0] !== r && hover[1] !== c) ||
                    (!hover && lit.size > 0 && !lit.has(r) && !lit.has(c));
                  const crossed = hover && (hover[0] === r || hover[1] === c);
                  return (
                    <td key={c} className="p-0">
                      <button
                        type="button"
                        onMouseEnter={() => {
                          setHover([r, c]);
                          say(describe(r, c));
                        }}
                        onFocus={() => {
                          setHover([r, c]);
                          say(describe(r, c));
                        }}
                        aria-label={describe(r, c)}
                        className="tabular flex h-9 w-full min-w-10 cursor-crosshair items-center justify-center rounded-[7px] text-[11px] transition-opacity duration-150"
                        style={{
                          opacity: dimmed ? 0.28 : 1,
                          background: pass ? toCss(cell) : "var(--bench)",
                          color: pass ? toCss(colors[r]) : "var(--muted)",
                          border: pass
                            ? crossed
                              ? "1px solid var(--ink)"
                              : "1px solid transparent"
                            : "1px dashed var(--line)",
                        }}
                      >
                        {r === c ? "—" : v.toFixed(1)}
                        {/* Never in place of the number, and never colour on
                            its own: the ratio still reads, and the mark is a
                            glyph with a word behind it on the status line. */}
                        {(gone[r][c] || dropped(r, c)) && (
                          <span className="ml-1 text-[10px] opacity-80" aria-hidden>
                            {gone[r][c] ? "≡" : "▽"}
                          </span>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* The specimen. Real text, real size, painted in the pair itself — the
          colours cross-fade into the next pair on their own, because the
          repaint transition is declared on everything. */}
      <div className="mt-auto pt-3">
      <div
        className="overflow-hidden rounded-[12px]"
        style={{ background: toCss(bg) }}
      >
        <div className="px-4 py-3.5" style={{ color: toCss(fg) }}>
          <p className="text-[15px] leading-[1.35] font-medium">
            Handgloves, quickly
          </p>
          <p className="mt-0.5 text-[12px] leading-[1.45]">
            Body text at the size it will actually be read at.
          </p>
        </div>
        {/* The verdict sits on the bench, not on the pair — a judgement
            printed in the colours it is judging is not a second opinion. */}
        <div
          className="tabular flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-[11.5px]"
          style={{ background: "var(--bench)", color: "var(--muted)" }}
        >
          <span style={{ color: "var(--ink)" }}>
            {labels[sr]} on {labels[sc]}
          </span>
          <span>{ratio.toFixed(2)}:1</span>
          <span>
            {level === "Fail"
              ? `fails AA · needs ${shortfall.toFixed(2)}× more`
              : `passes ${level}`}
          </span>
          {sr !== sc && ratio < 4.5 && (
            <span className="ml-auto">
              legible at {toHex(deriveInk(bg, 4.5)).toUpperCase()}
            </span>
          )}
          {gone[sr][sc] && (
            <span className="ml-auto" style={{ color: "var(--ink)" }}>
              ≡ same colour under {vision}
            </span>
          )}
          {dropped(sr, sc) && (
            <span className="ml-auto" style={{ color: "var(--ink)" }}>
              ▽ seen at {seen!.seen[sr][sc].toFixed(2)}:1 under {vision}
            </span>
          )}
        </div>
      </div>
      </div>
    </Tile>
  );
}
