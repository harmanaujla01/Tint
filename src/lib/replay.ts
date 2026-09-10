import { useCallback, useEffect, useRef, useState } from "react";
import type { Oklch } from "./color.ts";
import type { Search } from "./harmony.ts";
import { clamp01, useReducedMotion } from "./motion.ts";

/**
 * Replaying the search.
 *
 * `generate()` has always built ninety candidates, scored every one of them
 * with the same function that writes the critique, and kept the best. That is
 * the most interesting thing in the codebase and it happened in under two
 * milliseconds, invisibly, and then threw the evidence away.
 *
 * This does not slow the tool down: the winner is still computed synchronously
 * and the app's state is already correct before the first animated frame. What
 * plays afterwards is a *replay* over the real trail — the palette bar paints
 * candidates that were genuinely considered and rejected, with their genuine
 * scores. Nothing here is a mock-up of a search.
 */

/**
 * How many of the ninety get a frame, and how long the whole replay runs.
 *
 * The first cut of this was sixteen candidates in 620ms — about a frame every
 * two refreshes. It read as a flicker, which is honest about how fast the
 * search really is and useless as a way of seeing what it chose between. At
 * twenty candidates over four and a half seconds the quickest one still holds
 * for about a sixth of a second and the last few for a third: long enough to
 * actually look at a palette and read its score before the next replaces it.
 * It costs nothing to be slow here — the winner was computed synchronously and
 * the app already has it, so the replay is pure showing-of-work.
 */
export const FRAMES = 20;
export const DURATION = 4800;

export type Frame = {
  colors: Oklch[];
  /** Which candidate this is, zero-based, in the real trail. */
  index: number;
  score: number;
  /** Best score found up to and including this candidate. */
  best: number;
};

/**
 * Which candidate is on screen `t` of the way through the replay, 0..1.
 *
 * Pulled out as a pure function so it can be tested without a browser — the
 * two things that have to hold are that the last frame is the winner (so the
 * flicker resolves into the palette already sitting behind it) and that no
 * frame ever indexes off the end of the trail.
 */
export function frameAt(s: Search, t: number): Frame {
  // Barely eased. A cubic here front-loads the whole search into the first
  // half-second and then stares at the winner, which is the opposite of the
  // point. At 1.5 the fastest candidate still gets 162ms and the slowest 383,
  // before the winner holds for two thirds of a second — a search visibly
  // narrowing rather than a flicker followed by a wait.
  const k = Math.min(FRAMES - 1, Math.floor(FRAMES * (1 - (1 - clamp01(t)) ** 1.5)));
  const index =
    k === FRAMES - 1
      ? s.kept
      : Math.min(
          s.trail.length - 1,
          Math.round((k / (FRAMES - 1)) * (s.trail.length - 1)),
        );
  return {
    colors: s.trail[index],
    index,
    score: s.scores[index],
    best: Math.max(...s.scores.slice(0, index + 1)),
  };
}

export function useReplay(): [Frame | null, (s: Search) => void] {
  const [frame, setFrame] = useState<Frame | null>(null);
  const raf = useRef(0);
  const reduced = useReducedMotion();

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const play = useCallback(
    (s: Search) => {
      // Pressing space again mid-replay interrupts rather than queues. A tool
      // that makes you wait out an animation before it will answer again has
      // stopped being a tool.
      cancelAnimationFrame(raf.current);
      if (reduced) {
        setFrame(null);
        return;
      }

      const start = performance.now();
      const step = (now: number) => {
        const t = clamp01((now - start) / DURATION);
        if (t >= 1) {
          setFrame(null);
          return;
        }
        setFrame(frameAt(s, t));
        raf.current = requestAnimationFrame(step);
      };
      raf.current = requestAnimationFrame(step);
    },
    [reduced],
  );

  return [frame, play];
}
