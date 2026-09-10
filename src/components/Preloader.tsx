import { useEffect, useState } from "react";
import type { Oklch } from "../lib/color.ts";
import { useReducedMotion } from "../lib/motion.ts";
import { ChipFan } from "./Figures.tsx";

/**
 * The entry sequence: a fan deck turns into focus, the wordmark types itself
 * in beside it, then the whole thing collapses up toward the navbar and the
 * page arrives underneath.
 *
 * It runs on every load rather than once per session. This is a portfolio
 * page — the second visitor is usually the same person showing it to someone
 * else, and session-gating would hide the first thing they wanted to show.
 *
 * The overlay is painted in `--bg`, so a reader on reduced motion never sees
 * it at all: `onDone` fires on the first frame and the page is simply there.
 * Nothing behind it is hidden or inert, so a failed script cannot trap the
 * page behind a curtain that never lifts.
 */
export function Preloader({ colors, onDone }: { colors: Oklch[]; onDone: () => void }) {
  const [phase, setPhase] = useState<"in" | "out">("in");
  const [typed, setTyped] = useState(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    // Also covers the setting being turned on mid-sequence: the curtain
    // lifts immediately rather than finishing an animation nobody wanted.
    if (reduced) {
      onDone();
      return;
    }
    const timers = [
      ...[1, 2, 3, 4].map((n, i) => setTimeout(() => setTyped(n), 460 + i * 105)),
      setTimeout(() => setPhase("out"), 1180),
      setTimeout(onDone, 1800),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onDone, reduced]);

  if (reduced) return null;

  return (
    <div
      className={`preload ${phase === "out" ? "preload-out" : ""}`}
      // The page underneath is complete and readable; this is a curtain in
      // front of it, not a gate in place of it.
      aria-hidden
    >
      <div className="preload-fan">
        <ChipFan colors={colors} />
      </div>
      <p className="preload-word">
        {"Tint".slice(0, typed)}
        <span className="preload-caret" />
      </p>
    </div>
  );
}
