import { useState } from "react";
import { toCss } from "../lib/color.ts";
import { type Palette, type Search, directions } from "../lib/harmony.ts";
import { useReducedMotion } from "../lib/motion.ts";
import { Icon } from "./Tile.tsx";

/**
 * Three genuinely different palettes for the same starting point, so choosing a
 * look feels like directing rather than gambling on a single random answer.
 *
 * The three come from `directions`, which is `search` run under different seeds
 * and deduped, and which preserves any colour the user locked in the bar — so
 * "lock the one you love, then explore" already works through the existing lock
 * control, without a second one here.
 */
export function Directions({
  palette,
  onChoose,
}: {
  palette: Palette;
  onChoose: (next: Palette, label: string) => void;
}) {
  const [looks, setLooks] = useState<Search[]>(() => directions(palette));
  const [focused, setFocused] = useState<number | null>(null);
  const reduced = useReducedMotion();
  const explore = () => setLooks(directions(palette));
  const locked = palette.filter((s) => s.locked).length;

  return (
    <section
      aria-label="Palette directions"
      className="mx-auto mt-[6px] w-full max-w-[1440px] rounded-[22px] bg-[var(--surface)] p-5 sm:p-7"
    >
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="flex items-baseline gap-3">
          <h2 className="text-[19px] font-bold tracking-[-0.02em] sm:text-[21px]">Pick a direction</h2>
          {locked > 0 && (
            <span className="text-[12px] text-[var(--muted)]">
              keeping {locked} locked colour{locked === 1 ? "" : "s"}
            </span>
          )}
        </div>
        <button
          onClick={explore}
          className="flex cursor-pointer items-center gap-1.5 text-[12px] text-[var(--muted)] underline underline-offset-2 hover:text-[var(--ink)]"
        >
          <Icon name="shuffle" size={13} />
          Explore other directions
        </button>
      </header>

      {/* Point at one and it comes forward while the others step back — the
          same decision the studio makes when you choose it, previewed. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {looks.map((look, i) => (
          <Card
            key={i}
            look={look}
            onChoose={onChoose}
            forward={focused === i}
            recede={!reduced && focused !== null && focused !== i}
            onFocus={() => setFocused(i)}
            onBlur={() => setFocused(null)}
          />
        ))}
      </div>
    </section>
  );
}

function Card({
  look,
  onChoose,
  forward,
  recede,
  onFocus,
  onBlur,
}: {
  look: Search;
  onChoose: (next: Palette, label: string) => void;
  forward: boolean;
  recede: boolean;
  onFocus: () => void;
  onBlur: () => void;
}) {
  return (
    <article
      onMouseEnter={onFocus}
      onMouseLeave={onBlur}
      className="flex flex-col overflow-hidden rounded-[16px] border transition-[transform,opacity] duration-300 ease-[var(--ease-out-quint)]"
      style={{
        transform: forward ? "translateY(-4px) scale(1.015)" : "none",
        opacity: recede ? 0.62 : 1,
      }}
    >
      <div className="flex h-36">
        {look.palette.map((s, i) => (
          <span key={i} className="flex-1" style={{ background: toCss(s.color) }} />
        ))}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        {/* The generator's own words for why this one looks the way it does. */}
        <p className="text-[13px] leading-[1.45] text-[var(--ink)]">{look.label}</p>
        <button
          onClick={() => onChoose(look.palette, look.label)}
          onFocus={onFocus}
          onBlur={onBlur}
          className="mt-auto flex cursor-pointer items-center justify-center gap-1.5 rounded-[10px] px-3 py-2 text-[13px] font-medium"
          style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
        >
          <Icon name="check" size={14} />
          Choose this look
        </button>
      </div>
    </article>
  );
}
