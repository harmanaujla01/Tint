import { createContext, useCallback, useContext, useEffect, useRef } from "react";

/**
 * The status line.
 *
 * Every professional instrument has one — Photoshop, Blender, Figma, a logic
 * analyser — and they all work the same way: one line that describes whatever
 * you are currently pointing at. It replaced about fifteen lines of permanent
 * body copy in the studio, and it is a straight upgrade rather than a deletion,
 * because a sentence that only appears when you are looking at the thing it
 * describes is read far more often than one that is always there.
 *
 * The text is written straight into the DOM rather than held in React state.
 * Hovering is the highest-frequency event in the app — twenty-five matrix cells
 * under one sweep of the mouse — and putting that in state re-renders the whole
 * studio, including the export tile's token serialisation, twenty-five times.
 * `useDrift` in motion.ts avoids state for the same reason.
 */
export type Say = (text: string | null) => void;

export const StatusContext = createContext<Say>(() => {});

/** Call this in anything that can describe itself. `say(null)` hands the line back. */
export const useSay = (): Say => useContext(StatusContext);

/**
 * Owns the node the line is written into. `idle` is what it says when nothing
 * is being pointed at — which is not filler, it is the one fact that is true
 * of the page as a whole.
 */
export function useStatusLine(idle: string) {
  const ref = useRef<HTMLSpanElement>(null);
  const idleText = useRef(idle);
  idleText.current = idle;

  const say = useCallback<Say>((text) => {
    const el = ref.current;
    if (!el) return;
    el.textContent = text ?? idleText.current;
    // Marks whether the line is currently on loan, so a palette change that
    // rewrites the idle text does not stamp over a live reading.
    el.dataset.live = text ? "1" : "0";
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (el && el.dataset.live !== "1") el.textContent = idle;
  }, [idle]);

  return [ref, say] as const;
}
