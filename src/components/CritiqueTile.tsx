import { type Critique, type Note, type Palette, regenerate } from "../lib/harmony.ts";
import { toCss, toHex } from "../lib/color.ts";
import { useSay } from "../lib/status.ts";
import { Tile } from "./Tile.tsx";

const VERDICT = (score: number) =>
  score >= 85 ? "Ships" : score >= 70 ? "Solid" : score >= 50 ? "Needs work" : "Fighting itself";

const LABEL: Record<Note["severity"], string> = {
  bad: "Problem",
  warn: "Worth a look",
  good: "Good",
};

/**
 * The opinion. This is the whole difference between a palette generator and a
 * palette tool: it will tell you when what it just made is not good enough.
 *
 * Every note names the number it is unhappy about, and the severity is
 * spelled out in words as well as drawn — a colour tool that made you infer
 * severity from a colour would be arguing against itself.
 */
export function CritiqueTile({
  palette,
  critique,
  onChange,
  onHover,
  highlight,
}: {
  palette: Palette;
  critique: Critique;
  onChange: (p: Palette) => void;
  onHover: (targets: number[]) => void;
  /**
   * Swatches something else is tracing. A note that says nothing about them
   * quietens — never hides: the text stays selectable, findable and readable,
   * it is just no longer the thing being pointed at.
   */
  highlight?: number[];
}) {
  const say = useSay();
  const problems = critique.notes.filter((n) => n.severity !== "good");

  return (
    <Tile
      label="The verdict"
      aside={
        <span className="tabular text-[12px] text-[var(--muted)]">
          {problems.length === 0
            ? "nothing flagged"
            : `${problems.length} flagged`}
        </span>
      }
      className="min-h-0"
    >
      <div
        className="flex w-fit cursor-help items-end gap-3"
        onMouseEnter={() =>
          say(
            `score ${critique.score}/100 · seven checks run · ${
              problems.length === 0
                ? "none flagged"
                : `${problems.length} flagged, costing ${100 - critique.score} points`
            } · the same function the generator scored ninety candidates with`,
          )
        }
        onMouseLeave={() => say(null)}
      >
        {/* Keyed on the value so a new score remounts and lands on the
            spring. It is legible before, during and after — motion paces the
            number, it never reveals it. */}
        <p
          key={critique.score}
          className="score-pop tabular text-[46px] leading-[0.85] font-bold tracking-[-0.04em] text-[var(--ink)]"
        >
          {critique.score}
        </p>
        <div className="pb-0.5">
          <p className="text-[15px] font-medium text-[var(--ink)]">
            {VERDICT(critique.score)}
          </p>
          <p className="text-[12px] text-[var(--muted)]">out of 100</p>
        </div>
      </div>

      {/* The bar is decoration over the number, never instead of it. */}
      <div
        className="mt-3 h-1.5 overflow-hidden rounded-full"
        style={{ background: "var(--bench)" }}
        aria-hidden
      >
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-[var(--ease-out-quint)]"
          style={{ width: `${critique.score}%`, background: "var(--accent)" }}
        />
      </div>

      <ul
        className="mt-4 -mr-1 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1"
        onMouseLeave={() => {
          onHover([]);
          say(null);
        }}
      >
        {critique.notes.map((note) => {
          /*
            Only quieten when there is something to quieten *for*. Point at a
            swatch no note happens to mention and the naive version greys out
            every note at once, which reads as the panel breaking rather than
            as "nothing here is about that colour". A trace with no matches is
            not a trace.
          */
          const tracing =
            highlight !== undefined &&
            highlight.length > 0 &&
            critique.notes.some((n) => n.targets.some((t) => highlight.includes(t)));
          return (
          <li
            key={note.id}
            onMouseEnter={() => {
              onHover(note.targets);
              say(note.detail);
            }}
            className="rounded-[10px] bg-[var(--bench)] px-3 py-2.5 transition-opacity duration-300 ease-[var(--ease-out-quint)]"
            style={{
              // Quietened, not hidden: a note that has nothing to say about
              // the swatch you are pointing at steps back, and steps forward
              // again the moment you stop pointing.
              opacity:
                tracing && !note.targets.some((t) => highlight!.includes(t)) ? 0.4 : 1,
              borderLeft:
                note.severity === "bad"
                  ? "3px solid var(--ink)"
                  : note.severity === "warn"
                    ? "3px dashed var(--muted)"
                    : "3px solid var(--line)",
            }}
          >
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-[11px] font-medium tracking-[0.02em] text-[var(--muted)] uppercase">
                {LABEL[note.severity]}
              </span>
              <span className="text-[13px] font-medium text-[var(--ink)]">
                {note.title}
              </span>
            </div>
            {/* The sentence itself is still in the document — it moved off
                the screen, not out of the page. Pointer users get it on the
                status line, screen readers get it here, and anyone tabbing to
                the fix button gets it too. */}
            <p className="sr-only">{note.detail}</p>

            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {note.targets.map((i) => (
                <span
                  key={i}
                  className="tabular flex items-center gap-1.5 text-[11px] text-[var(--muted)]"
                >
                  <span
                    className="size-3 rounded-[3px] border"
                    style={{ background: toCss(palette[i].color) }}
                    aria-hidden
                  />
                  {toHex(palette[i].color)}
                </span>
              ))}
              {note.replace && (
                <button
                  onClick={() => onChange(regenerate(palette, note.replace!))}
                  onFocus={() => say(note.detail)}
                  onBlur={() => say(null)}
                  className="ml-auto cursor-pointer rounded-[7px] border px-2 py-1 text-[12px] font-medium text-[var(--ink)] transition-colors duration-150 hover:bg-[var(--surface)]"
                >
                  {note.replace.some((i) => palette[i]?.locked)
                    ? "Replace anyway"
                    : `Fix — swap ${note.replace.length === 1 ? "it" : `${note.replace.length}`}`}
                </button>
              )}
            </div>
          </li>
          );
        })}
      </ul>
    </Tile>
  );
}
