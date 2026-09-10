import { useEffect, useRef, useState, useSyncExternalStore } from "react";

/**
 * The story page's motion primitives.
 *
 * Deliberately hand-rolled rather than reached for off the shelf. Everything
 * here is one number read from `getBoundingClientRect` and handed to CSS —
 * about sixty lines against the ~34kB gzipped an animation library plus its
 * scroll plugin would cost, on a project whose whole argument is that it
 * wrote its own maths. Each hook answers `prefers-reduced-motion` by
 * reporting its *finished* state, so the reduced path is the full content
 * with none of the travel, never a blank frame.
 */

const MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia(MOTION_QUERY).matches;

const subscribeMotion = (onChange: () => void) => {
  const mq = window.matchMedia(MOTION_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};

/**
 * `prefers-reduced-motion`, subscribed to rather than sampled.
 *
 * Two reasons it has to be a hook. The setting can be turned on part-way
 * through a visit, and a page that read it once at mount goes on animating
 * at a reader who has just asked it to stop. And every consumer has to get
 * the same answer in the same render: when a component samples it while
 * rendering and a hook it calls samples it again in an effect, a flip
 * between the two leaves the page in a state neither branch describes —
 * reduced-motion layout, full-motion progress. Defaults to *reduced* when
 * there is no window to ask, because that is the safe half of the guess.
 */
export const useReducedMotion = () =>
  useSyncExternalStore(subscribeMotion, reducedMotion, () => true);

/**
 * True when a keystroke belongs to whatever the user is typing into rather
 * than to the page. Every bare-letter shortcut has to ask this first, and
 * having two copies of the test is how one of them ends up eating a space bar.
 */
export function typing(target: EventTarget | null, includeButtons = false): boolean {
  const el = target as HTMLElement | null;
  if (!el || !el.tagName) return false;
  const tags = includeButtons ? /^(INPUT|TEXTAREA|SELECT|BUTTON)$/ : /^(INPUT|TEXTAREA|SELECT)$/;
  return el.isContentEditable || tags.test(el.tagName);
}

export const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Smoothstep. Chips that start and stop abruptly read as a jump cut. */
export const ease = (t: number) => t * t * (3 - 2 * t);

/**
 * True once the element has been seen, and never false again. A reveal that
 * re-runs when you scroll back up reads as a bug rather than as polish.
 */
export function useInView<T extends Element>(margin = "0px 0px -14% 0px") {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced || !ref.current) {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin: margin },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [margin, reduced]);

  return [ref, seen] as const;
}

/**
 * How far the viewport has travelled through a tall element, 0..1. This is
 * what pins the strip: the section is taller than the screen, its inner
 * layer is `position: sticky`, and this number says how far through the
 * pinned stretch you are.
 *
 * `lead` buys a runway *before* the pin, measured in viewport heights. Zero
 * — the default — starts counting at the moment the section reaches the top
 * of the screen, which leaves the approach to it dead: a sticky layer's
 * contents sit half a screen down inside their own box, so for a full
 * viewport of scrolling there is nothing on screen but the tail of whatever
 * came before. A non-zero lead starts the section moving while it is still
 * rising into view, and hands back `pinAt` — where in the 0..1 that pin
 * moment now falls — so anything that must still wait for the pin can
 * remap itself onto it rather than being tuned to a magic number that
 * drifts with viewport and breakpoint.
 */
export function useScrollProgress<T extends HTMLElement>(lead = 0) {
  const ref = useRef<T>(null);
  const [{ progress, pinAt }, setRead] = useState({ progress: 0, pinAt: 0 });
  const reduced = useReducedMotion();

  useEffect(() => {
    // Reduced motion means the strip renders its finished state, not its
    // first frame: the content is the point, the travel is the decoration.
    if (reduced) {
      setRead({ progress: 1, pinAt: 0 });
      return;
    }
    const el = ref.current;
    if (!el) return;

    let frame = 0;
    const read = () => {
      const r = el.getBoundingClientRect();
      const travel = r.height - window.innerHeight;
      if (travel <= 0) {
        setRead({ progress: 1, pinAt: 0 });
        return;
      }
      const runway = lead * window.innerHeight;
      setRead({
        progress: clamp01((runway - r.top) / (runway + travel)),
        pinAt: runway / (runway + travel),
      });
    };

    // A frame loop, not a scroll listener. Damped scrolling, trackpad inertia
    // and touch momentum all keep moving the page between `scroll` events, and
    // a strip driven off those events either stutters or — behind a smooth
    // scroll library that animates the position itself — never moves at all.
    // Reading the rect every frame is one layout read; it is what the section
    // costs. The observer gates it so nothing runs while the strip is off
    // screen, which is most of the page.
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
        // Land on the endpoint it was heading for rather than on whatever
        // frame the scroll happened to leave behind.
        read();
      }
    });
    io.observe(el);
    read();
    return () => {
      cancelAnimationFrame(frame);
      io.disconnect();
    };
  }, [lead, reduced]);

  return [ref, progress, pinAt] as const;
}

/**
 * A few pixels of parallax drift, written straight onto the node's transform.
 * Kept out of React state on purpose — putting scroll position in state
 * re-renders the whole page on every frame of a scroll.
 */
export function useDrift<T extends HTMLElement>(max = 15) {
  const ref = useRef<T>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (reduced || !el) return;
    let frame = 0;
    const read = () => {
      frame = 0;
      el.style.transform = `translate3d(0, ${-Math.min(max, window.scrollY * 0.07)}px, 0)`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      el.style.transform = "";
    };
  }, [max, reduced]);

  return ref;
}

/**
 * The fan deck's scroll gesture: the blades swing round one after another as
 * the page moves, rather than the deck turning as a slab.
 *
 * The kinematics are the cascading-overlap ones from `lively-pythagoras`. The
 * rightmost blade leads. Every other blade is held until the one in front of
 * it has cleared `OVERLAP` degrees, and then it runs its own full revolution,
 * so the peel travels back along the deck a blade at a time:
 *
 *     budget  = 360 + (n - 1) * OVERLAP     the whole gesture, in degrees
 *     driver  = progress * budget           where the lead blade has got to
 *     blade k = clamp(driver - k * OVERLAP, 0, 360)
 *
 * Petal count is whatever the palette holds — this counts the blades it was
 * handed and never has an opinion about how many there should be.
 *
 * This knows nothing about the fan's shape. Each blade publishes one number:
 *
 * - `data-step` its place in the queue, 0 going first
 *
 * and its own resting angle is applied by the group inside it, so what is
 * written here is only how far it has turned from rest. Keeping the
 * choreography split that way is what makes an anchored blade free: give it no
 * `data-step` of its own and it simply queues with the rest.
 *
 * Scroll is damped rather than read raw — the same lerp the reference fan
 * uses, so the deck carries a little inertia behind the hand instead of being
 * nailed to the scrollbar.
 *
 * A frame loop rather than a scroll listener, for the reason the whole file
 * keeps repeating: behind Lenis the page is still moving between `scroll`
 * events. The observer gates it, so nothing runs once the hero is gone.
 */

/** Degrees the blade in front must clear before the next one is released. */
export const OVERLAP = 18;
/** Every blade turns exactly once. */
export const TURN = 360;
/** Lerp factor per frame. Lower is heavier; 0.085 is the reference's default. */
export const DAMPING = 0.085;

/** Where blade `step` has turned to, in degrees, at scroll progress `s`. */
export function bladeAngle(s: number, step: number, n: number): number {
  const driver = clamp01(s) * (TURN + Math.max(0, n - 1) * OVERLAP);
  return Math.max(0, Math.min(TURN, driver - step * OVERLAP));
}

export function useFanSweep<T extends SVGGElement>(distance = 700) {
  const ref = useRef<T>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (reduced || !el) return;

    const target = () => clamp01(window.scrollY / distance);
    // Where the deck has actually got to, as opposed to where the scroll is.
    let current = target();
    let frame = 0;

    const draw = () => {
      const blades = el.children;
      const n = blades.length;
      for (let i = 0; i < n; i++) {
        const blade = blades[i] as SVGGElement;
        const step = Number(blade.dataset.step ?? i);
        blade.style.transform = `rotate(${bladeAngle(current, step, n).toFixed(2)}deg)`;
      }
    };

    /** Land on where the scroll actually is, with no damping left to spend. */
    const settle = () => {
      current = target();
      draw();
    };

    const loop = () => {
      const to = target();
      current += (to - current) * DAMPING;
      // Subpixel drift never quite reaches the target, and a loop that never
      // converges is a loop that never lets the blade sit still.
      if (Math.abs(to - current) < 0.0001) current = to;
      draw();
      frame = requestAnimationFrame(loop);
    };

    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        if (!frame) frame = requestAnimationFrame(loop);
      } else if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
        settle();
      }
    });
    io.observe(el);
    settle();
    return () => {
      cancelAnimationFrame(frame);
      io.disconnect();
      for (const blade of Array.from(el.children))
        (blade as SVGGElement).style.transform = "";
    };
  }, [distance, reduced]);

  return ref;
}

/**
 * Ticks a value up when `run` turns true, then lands on it exactly. These are
 * measurements, so the last frame has to be the real number rather than
 * something asymptotically close to it.
 */
export function useCountUp(target: number, run: boolean, ms = 900) {
  const [value, setValue] = useState(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!run || reduced) {
      setValue(target);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = clamp01((now - start) / ms);
      setValue(target * (1 - (1 - t) ** 3));
      if (t < 1) frame = requestAnimationFrame(step);
      else setValue(target);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, run, ms, reduced]);

  return value;
}
