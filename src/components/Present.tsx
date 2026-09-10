import { useEffect, useState } from "react";
import { type Oklch, deriveInk, toCss, toHex } from "../lib/color.ts";
import { clamp01, ease, useReducedMotion } from "../lib/motion.ts";
import { chipBox } from "../lib/strip.ts";

const OPEN = 720;

/**
 * The palette, full bleed, on one key.
 *
 * This is the studio doing on demand what the story page's pinned section does
 * on scroll — and it is nearly free, because `strip.ts` already computes the
 * geometry and is unit-tested at both ends and across the middle of the scrub.
 * The same function that grows a row of chips into columns as you scroll grows
 * them here as the overlay opens; only the clock driving `t` is different.
 */
export function Present({
  colors,
  onClose,
  filter,
}: {
  colors: Oklch[];
  onClose: () => void;
  /** The colour-vision simulation, carried across — this overlay sits outside
      the studio's own filtered box, because a `filter` on an ancestor would
      make `position: fixed` mean something else. */
  filter?: string;
}) {
  const reduced = useReducedMotion();
  const [t, setT] = useState(reduced ? 1 : 0);
  const n = colors.length;

  useEffect(() => {
    if (reduced) return;
    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const p = clamp01((now - start) / OPEN);
      setT(ease(p));
      if (p < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [reduced]);

  // Escape only. `f` is a toggle and lives with the thing that owns the state,
  // or both handlers fire on the same keystroke and it opens and shuts again.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 cursor-zoom-out overflow-hidden"
      style={{ background: "var(--bg)", filter }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Palette, full screen"
    >
      {colors.map((c, i) => {
        const b = chipBox(i, n, t);
        // Held back until the column is wide enough that a label is not being
        // crammed into a 44px chip — the same rule the story page's strip uses.
        const label = reduced ? 1 : ease(clamp01((t - 0.62) / 0.38));
        return (
          <div
            key={i}
            className="absolute overflow-hidden"
            style={{
              background: toCss(c),
              left: `calc(${b.leftPct}% + ${b.leftPx}px)`,
              width: `calc(${b.widthPct}% + ${b.widthPx}px)`,
              top: `calc(${b.topPct}% + ${b.topPx}px)`,
              height: `calc(${b.heightPct}% + ${b.heightPx}px)`,
              borderRadius: b.radius,
            }}
          >
            {/* Signed in ink solved against this column, not against the page —
                the one piece of text here is also a demonstration. */}
            <div
              className="tabular absolute inset-x-0 bottom-[6vh] px-2 text-center"
              style={{ color: toCss(deriveInk(c, 4.5)), opacity: label }}
            >
              <p className="text-[15px] font-bold tracking-[0.02em] sm:text-[22px]">
                {toHex(c).toUpperCase()}
              </p>
              <p className="mt-1 text-[10px] opacity-80 sm:text-[12px]">
                L {c.l.toFixed(2)} · C {c.c.toFixed(3)} · H {c.h.toFixed(0)}
              </p>
            </div>
          </div>
        );
      })}

      <p
        className="tabular absolute inset-x-0 bottom-4 text-center text-[11.5px] text-[var(--muted)]"
        style={{ opacity: reduced ? 1 : ease(clamp01((t - 0.8) / 0.2)) }}
      >
        esc to close
      </p>
    </div>
  );
}
