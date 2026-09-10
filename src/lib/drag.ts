import {
  type MouseEvent,
  type PointerEvent,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useReducedMotion } from "./motion.ts";

/**
 * Drag a swatch out of the row and drop it somewhere else.
 *
 * Two decisions worth defending.
 *
 * *Nothing per-frame goes through React.* The grabbed chip's transform is
 * written straight onto the node, the way `useDrift` writes parallax on the
 * story page. Putting a pointer position in state re-renders the studio —
 * including the export tile's token serialisation — sixty times a second for
 * as long as you hold the mouse down. Only the *order* is state, and that
 * changes a handful of times per drag.
 *
 * *The other chips move by FLIP rather than by a View Transition.* The plan
 * called for `startViewTransition`, and it is the wrong tool here: it snapshots
 * the whole document, so every swap would cross-fade the matrix, the critique
 * and the preview along with the two swatches that actually moved. FLIP moves
 * exactly the things that moved — measure before, let the browser reflow,
 * invert with a transform, then release it onto the `linear()` spring. It is
 * about twenty lines, it works in every browser, and it is the same kind of
 * arithmetic the rest of this project refuses to install a library for.
 */

/** How far the pointer travels before this counts as a drag rather than a click. */
const THRESHOLD = 6;
// Carries flex-grow along with it: this string replaces the class-level
// transition on the node for good, and dropping the width animation as a side
// effect of one drag is the kind of thing nobody ever tracks down afterwards.
// `transform` is here for the FLIP of the chips that got out of the way;
// `translate`/`scale`/`rotate` are here for the chip that was dropped.
const SETTLE =
  "transform 420ms var(--ease-spring), translate 420ms var(--ease-spring)," +
  " scale 300ms var(--ease-spring), rotate 300ms var(--ease-out-quint)," +
  " flex-grow 300ms var(--ease-out-quint)";
/**
 * What the chip is allowed to smooth while it is in your hand.
 *
 * The lift and the tilt are separate CSS properties from the position, which
 * is the whole reason this is written as `translate`/`scale`/`rotate` rather
 * than one `transform` string: the position has to be nailed to the pointer
 * with no transition at all, while the lift springs in once and the tilt is
 * allowed to lag a frame behind the hand. As one `transform` you get to pick
 * one or the other, and picking "smoothed" makes the chip swim behind the
 * cursor.
 */
const DRAG = "scale 240ms var(--ease-spring), rotate 90ms linear";
/** Picked up off the sheet. No shadow — see DESIGN.md. */
const GRABBED = 1.035;
/** Degrees per pixel-per-millisecond of hand speed, and the stop it runs into. */
const TILT = 1.9;
const TILT_MAX = 3.4;

type Grab = {
  key: string;
  /** Where in the row the chip started, and where it is now. */
  from: number;
  at: number;
  /** Pointer position when it was grabbed. */
  origin: number;
  /** How far into the chip it was grabbed, so it does not jump to its own edge. */
  offset: number;
  /** Slot positions, measured once, in whichever axis the row runs along. */
  slots: number[];
  vertical: boolean;
  /** Last sampled pointer position and time, and the smoothed speed between them. */
  point: number;
  t: number;
  v: number;
};

export function useReorder(
  keys: string[],
  move: (from: number, to: number) => void,
) {
  const nodes = useRef(new Map<string, HTMLElement>());
  const before = useRef(new Map<string, DOMRect>());
  const grab = useRef<Grab | null>(null);
  const pending = useRef<{ key: string; index: number; x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const moved = useRef(false);
  const reduced = useReducedMotion();

  /** Remember where everything is, to be inverted from after the reflow. */
  const snapshot = () => {
    before.current.clear();
    for (const [k, el] of nodes.current) before.current.set(k, el.getBoundingClientRect());
  };

  // FLIP. Runs on every commit, but does nothing unless a snapshot is waiting.
  useLayoutEffect(() => {
    if (before.current.size === 0) return;
    for (const [k, el] of nodes.current) {
      const was = before.current.get(k);
      if (!was || k === grab.current?.key) continue;
      const now = el.getBoundingClientRect();
      const dx = was.left - now.left;
      const dy = was.top - now.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
      el.style.transition = "none";
      el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      void el.offsetWidth; // commit the inverted position before releasing it
      el.style.transition = reduced ? "none" : SETTLE;
      el.style.transform = "";
    }
    before.current.clear();
  });

  const carry = (g: Grab, point: number) => {
    const el = nodes.current.get(g.key);
    if (!el) return;
    const now = performance.now();
    // Exponential average over the last few samples, so the tilt reads as
    // momentum rather than as pointer jitter.
    g.v = g.v * 0.7 + ((point - g.point) / Math.max(1, now - g.t)) * 0.3;
    g.point = point;
    g.t = now;

    const shift = point - g.offset - g.slots[g.at];
    el.style.translate = g.vertical ? `0 ${shift}px` : `${shift}px`;
    // A card you are holding still lies flat; it only tips in the direction
    // you are throwing it, and it comes back level when you stop. A constant
    // tilt is a sticker of a lifted card. This is the card.
    if (!reduced && !g.vertical)
      el.style.rotate = `${Math.max(-TILT_MAX, Math.min(TILT_MAX, g.v * TILT)).toFixed(2)}deg`;
  };

  const release = useCallback(() => {
    const g = grab.current;
    grab.current = null;
    pending.current = null;
    setDragging(null);
    // The swatch is covered by its own select button, and letting go of a drag
    // would otherwise land as a click on it.
    if (g) moved.current = true;
    const el = g && nodes.current.get(g.key);
    if (!el) return;
    // Let it settle into the slot it landed in rather than snapping: the
    // position springs home, the lift drops back to the sheet and the tilt
    // levels off, all on the same release.
    el.style.transition = reduced ? "none" : SETTLE;
    el.style.translate = "";
    el.style.scale = "";
    el.style.rotate = "";
  }, [reduced]);

  const onPointerDown = useCallback(
    (e: PointerEvent, index: number) => {
      // Left button and direct manipulation only; the swatch's own controls
      // are buttons and must keep working as buttons.
      // Touch is deliberately left out. On a narrow screen the bar is a
      // vertical stack, so a drag along it is the same gesture as a scroll, and
      // stealing that to reorder five swatches is a bad trade. Tap to select
      // and the per-swatch controls work as they always did.
      if (e.button !== 0 || e.pointerType === "touch") return;
      pending.current = { key: keys[index], index, x: e.clientX, y: e.clientY };
    },
    [keys],
  );

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      const g = grab.current;
      if (g) {
        const point = g.vertical ? e.clientY : e.clientX;
        carry(g, point);
        // The chip's own leading edge decides what it has passed, not the
        // pointer — dragging by the right-hand end of a wide swatch would
        // otherwise reorder a slot early.
        const lead = point - g.offset;
        let target = g.at;
        while (target > 0 && lead < g.slots[target - 1] + (g.slots[target] - g.slots[target - 1]) / 2)
          target--;
        while (
          target < g.slots.length - 1 &&
          lead > g.slots[target] + (g.slots[target + 1] - g.slots[target]) / 2
        )
          target++;
        if (target !== g.at) {
          snapshot();
          move(g.at, target);
          g.at = target;
          carry(g, point);
        }
        return;
      }

      const p = pending.current;
      if (!p) return;
      if (Math.hypot(e.clientX - p.x, e.clientY - p.y) < THRESHOLD) return;

      // Past the threshold: this is a drag. Measure the row now, after the
      // re-render that equalises the swatch widths — the selected swatch is
      // wider than the others, and slot positions measured around it would be
      // wrong the moment it moved.
      pending.current = null;
      setDragging(p.key);
      const el = nodes.current.get(p.key);
      const rects = keys.map((k) => nodes.current.get(k)?.getBoundingClientRect());
      if (!el || rects.some((r) => !r)) return;
      const all = rects as DOMRect[];
      const vertical = all.length > 1 && Math.abs(all[1].left - all[0].left) < 4;
      const slots = all.map((r) => (vertical ? r.top : r.left));
      const point = vertical ? e.clientY : e.clientX;
      grab.current = {
        key: p.key,
        from: p.index,
        at: p.index,
        origin: vertical ? p.y : p.x,
        offset: (vertical ? p.y : p.x) - slots[p.index],
        slots,
        vertical,
        point,
        t: performance.now(),
        v: 0,
      };
      // Lift it now rather than on the next pointer sample: the spring is what
      // makes the chip feel like it came off the sheet, and it has to start
      // from the frame you crossed the threshold on.
      el.style.transition = reduced ? "none" : DRAG;
      if (!reduced) el.style.scale = String(GRABBED);
      carry(grab.current, point);
      // Capture so the drag survives the pointer leaving the row. It throws
      // if the pointer is not actually down — a synthetic event in a test
      // harness, or a pointer that was released between the two handlers —
      // and losing capture is not worth losing the drag over.
      try {
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      } catch {
        /* no capture; the drag still tracks while the pointer is over the row */
      }
    },
    [keys, move],
  );

  /** Ref callback for a swatch, so the hook can find and measure it. */
  const register = useCallback(
    (key: string) => (el: HTMLElement | null) => {
      if (el) nodes.current.set(key, el);
      else nodes.current.delete(key);
    },
    [],
  );

  return {
    /** The key currently being dragged, or null. */
    dragging,
    register,
    onPointerDown,
    handlers: {
      onPointerMove,
      onPointerUp: release,
      onPointerCancel: release,
      onClickCapture: (e: MouseEvent) => {
        if (!moved.current) return;
        moved.current = false;
        e.stopPropagation();
        e.preventDefault();
      },
    },
  };
}
