import { useCallback, useEffect, useRef, useState } from "react";
import { clamp01, useReducedMotion } from "./motion.ts";

/**
 * The pinned horizontal track.
 *
 * The second act of the same move the strip makes: the palette expands to fill
 * the screen, and then you walk through it. Physical scrolling stays vertical
 * — the wheel, the trackpad, the spacebar, Page Down and the scrollbar all do
 * what they have always done — and that vertical progress is spent travelling
 * sideways instead of down. Nobody has to discover a gesture.
 *
 * Two things are load-bearing.
 *
 * *There is no second scroll engine.* This reads the same `getBoundingClientRect`
 * on the same rAF loop as `useScrollProgress`, gated by the same
 * `IntersectionObserver`, for the same reason: behind Lenis the page keeps
 * moving between `scroll` events, so a track driven off those events never
 * arrives anywhere.
 *
 * *Progress does not go through React state.* `useScrollProgress` sets state
 * every frame, which is fine for the strip — five divs — and ruinous here,
 * where a re-render is five viewport-wide rooms and everything in them. The
 * transform is written straight onto the node and the rooms are handed their
 * own position as a CSS variable, so a room can drive its entire arrival out
 * of the stylesheet without React knowing a frame happened. The only thing
 * that *is* state is which chapter you are in, and that changes four times.
 */

/** Below this the story is told as vertical scenes instead. See `DESIGN.md`. */
export const DESKTOP = "(min-width: 1100px)";

/**
 * Scroll spent standing still at each end, as a fraction of the section.
 *
 * The lead-in is the handoff: the track is pinned and room 01 has arrived, but
 * nothing has moved sideways yet, so the turn reads as *entering* the palette
 * rather than as the page suddenly sliding. The tail is the plan's "full
 * viewport of stable time" — 05 has to be allowed to finish being read before
 * the track releases into the CTA.
 */
export const LEAD = 0.08;
export const TAIL = 0.14;

/** How far through the rooms you are at section progress `p`, 0..1. */
export const travelAt = (p: number) => clamp01((p - LEAD) / (1 - LEAD - TAIL));

/**
 * How much of the way to *landing* on each room the travel is eased, 0..1.
 *
 * Straight linear travel is why a horizontal track reads as a slide deck on
 * its side: the rooms cross the screen at one unvarying speed, so nothing ever
 * arrives anywhere, it just goes past. Easing each room-to-room segment makes
 * the travel slowest exactly where a room is centred and quickest in the gap
 * between two, where there is nothing to read — the rooms settle instead of
 * sliding. It is the same smoothstep the entrances use, *mixed* rather than
 * applied whole, because a full smoothstep is a snap and a snap is
 * scroll-jacking. At 0.55 the speed under a centred room is 0.45x the average
 * and the peak between rooms is 1.28x.
 */
export const SETTLE = 0.55;

/** How fast the layer behind the rooms travels, relative to the rooms. */
export const PARALLAX = 0.58;

/**
 * Which room, fractionally, is centred — the whole travel expressed in rooms.
 *
 * The transform, the `--near` variables and the chapter readout are all
 * derived from this one number, so they cannot drift apart: whatever the
 * easing does, they all do it together.
 */
export function roomsAt(t: number, count: number): number {
  if (count < 2) return 0;
  const at = clamp01(t) * (count - 1);
  const i = Math.min(count - 2, Math.floor(at));
  const f = at - i;
  return i + f + SETTLE * (f * f * (3 - 2 * f) - f);
}

/** Section progress at which chapter `i` is centred — the inverse, for the rail. */
export const stopAt = (i: number, count: number) =>
  count < 2 ? LEAD : LEAD + (i / (count - 1)) * (1 - LEAD - TAIL);

/**
 * How tall the section has to be to hold `count` rooms, in vh.
 *
 * One screen for the pin itself, then 175vh of scroll per room *transition*.
 * The number that matters is not the total but the ratio it produces: after
 * `LEAD` and `TAIL` are taken out, that leaves about 1.25 screens of vertical
 * scroll for each screen of sideways travel. Below 1:1 the rooms outrun the
 * hand — you push the page down an inch and a whole room goes past — which is
 * the specific way sideways scrolling usually feels broken. `track.test.ts`
 * holds the ratio, not the constant.
 */
export const heightFor = (count: number) => 100 + 175 * (count - 1);

/** A media query as a boolean, kept in sync. */
export function useMedia(query: string): boolean {
  const [on, setOn] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const read = () => setOn(mq.matches);
    read();
    mq.addEventListener("change", read);
    return () => mq.removeEventListener("change", read);
  }, [query]);
  return on;
}

/**
 * The one place that decides whether the horizontal act runs, so the track and
 * everything that has to stand aside for it cannot disagree about it.
 */
export function usePinnedLayout(): boolean {
  const wide = useMedia(DESKTOP);
  const reduced = useReducedMotion();
  return wide && !reduced;
}

export type Track = {
  section: React.RefObject<HTMLElement | null>;
  rail: React.RefObject<HTMLDivElement | null>;
  /** The layer behind the rooms, moved at `PARALLAX` of their speed. */
  far: React.RefObject<HTMLDivElement | null>;
  /** Which room is centred, 0-based. State, but it only moves `count - 1` times. */
  chapter: number;
  /** False on a narrow screen or under reduced motion: render the scenes stacked. */
  pinned: boolean;
  /** Send the page to a chapter. Vertical scroll either way — this is a link. */
  jumpTo: (i: number) => void;
};

export function usePinnedTrack(count: number, ids: string[]): Track {
  const section = useRef<HTMLElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const far = useRef<HTMLDivElement>(null);
  const [chapter, setChapter] = useState(0);
  const pinned = usePinnedLayout();

  useEffect(() => {
    const sec = section.current;
    const track = rail.current;
    if (!pinned || !sec || !track) return;

    let frame = 0;
    let last = -1;
    const read = () => {
      const r = sec.getBoundingClientRect();
      const travel = r.height - window.innerHeight;
      const t = travelAt(travel <= 0 ? 0 : clamp01(-r.top / travel));
      const distance = track.scrollWidth - window.innerWidth;
      // Everything below is derived from this one number.
      const at = roomsAt(t, count);
      const x = -(at / Math.max(1, count - 1)) * distance;

      track.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`;
      // The far layer, at a fraction of the near layer's speed. Two planes
      // moving at different rates is the whole of what tells an eye it is
      // travelling through something rather than watching panels slide.
      if (far.current)
        far.current.style.transform = `translate3d(${(x * PARALLAX).toFixed(2)}px, 0, 0)`;
      // Where the rooms are, for anything that wants to draw itself from the
      // stylesheet rather than from a re-render. On the section rather than on
      // the track, so the chapter rail — which is deliberately *not* inside the
      // thing that moves — inherits it too.
      sec.style.setProperty("--travel", t.toFixed(4));

      // And each room's own distance from the middle of the screen: 1 when it
      // is centred, 0 when it is a full viewport away. A room animates itself
      // off this and never learns that scrolling exists.
      for (let i = 0; i < track.children.length; i++)
        (track.children[i] as HTMLElement).style.setProperty(
          "--near",
          (1 - Math.min(1, Math.abs(at - i))).toFixed(4),
        );

      const now = Math.min(count - 1, Math.max(0, Math.round(at)));
      if (now !== last) {
        last = now;
        setChapter(now);
      }
    };

    const loop = () => {
      read();
      frame = requestAnimationFrame(loop);
    };
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        if (!frame) frame = requestAnimationFrame(loop);
      } else if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
        read(); // land on the end it was heading for
      }
    });
    io.observe(sec);
    read();
    return () => {
      cancelAnimationFrame(frame);
      io.disconnect();
      track.style.transform = "";
      if (far.current) far.current.style.transform = "";
    };
  }, [pinned, count]);

  const jumpTo = useCallback(
    (i: number) => {
      const sec = section.current;
      if (!pinned || !sec) {
        document.getElementById(ids[i])?.scrollIntoView({ behavior: "smooth" });
        return;
      }
      const top = sec.getBoundingClientRect().top + window.scrollY;
      const travel = sec.offsetHeight - window.innerHeight;
      window.scrollTo({ top: top + stopAt(i, count) * travel, behavior: "smooth" });
    },
    [pinned, count, ids],
  );

  return { section, rail, far, chapter, pinned, jumpTo };
}
