import { useCallback, useEffect, useMemo } from "react";
import { type Oklch, deriveInk, fromHex, toCss, toHex } from "../lib/color.ts";
import { type Palette, regenerate } from "../lib/harmony.ts";
import { useReorder } from "../lib/drag.ts";
import { typing } from "../lib/motion.ts";
import { useSay } from "../lib/status.ts";
import { useCopy } from "../lib/useCopy.ts";
import { Icon } from "./Tile.tsx";

const MIN = 3;
const MAX = 8;

/**
 * The palette itself, at the size the decision deserves.
 *
 * Every piece of text sitting on a swatch is `deriveInk` over that swatch —
 * including the hex code, which means the label is legible on a near-black
 * and a near-white alike without a single hardcoded colour. The swatch is
 * demonstrating the engine while you use it.
 */
export function PaletteBar({
  palette,
  onChange,
  selected,
  onSelect,
  onGenerate,
  onReorder,
  onHover,
  highlight,
  preview,
  arriving = false,
}: {
  palette: Palette;
  onChange: (p: Palette) => void;
  selected: number;
  onSelect: (i: number) => void;
  onGenerate: () => void;
  /**
   * Colours to paint instead of the palette's own, one frame of the search
   * replay. The palette underneath is already the winner — this only changes
   * what is on screen, never what the app thinks it has.
   */
  preview?: Oklch[] | null;
  /** Told when the row is reordered by hand, so nothing re-sorts it afterwards. */
  onReorder?: () => void;
  /**
   * The swatch the pointer is on, as the same list of indices the critique
   * already publishes. It feeds the matrix's crosshair and the critique's
   * notes, so pointing at a colour shows you everywhere it is being judged.
   */
  onHover?: (targets: number[]) => void;
  /** Indices something else is currently tracing. Everything else quietens. */
  highlight?: number[];
  /** First view of the session: the row deals itself in rather than appearing. */
  arriving?: boolean;
}) {
  const { copied, copy } = useCopy();
  const say = useSay();

  /**
   * A per-swatch identity that survives a reorder, which the React key and the
   * FLIP measurements both need — key by index and every chip is considered
   * "the same chip that was always here", so nothing animates and the DOM is
   * rebuilt under the pointer mid-drag. Duplicate colours get a suffix rather
   * than a key collision.
   */
  const keys = useMemo(() => {
    const seen = new Map<string, number>();
    return palette.map((s) => {
      const hex = toHex(s.color);
      const n = seen.get(hex) ?? 0;
      seen.set(hex, n + 1);
      return n === 0 ? hex : `${hex}#${n}`;
    });
  }, [palette]);

  const move = useCallback(
    (from: number, to: number) => {
      const next = [...palette];
      next.splice(to, 0, next.splice(from, 1)[0]);
      onChange(next);
      onReorder?.();
    },
    [palette, onChange, onReorder],
  );
  const { dragging, register, onPointerDown, handlers } = useReorder(keys, move);

  // Space regenerates, the way every palette tool has worked since Kuler.
  // Ignored while a field has focus, or the shortcut eats your typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.metaKey || e.ctrlKey || e.altKey) return;
      // Buttons included: space is how a focused button is pressed.
      if (typing(e.target, true)) return;
      e.preventDefault();
      onGenerate();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onGenerate]);

  const setAt = (i: number, next: Palette[number]) =>
    onChange(palette.map((s, j) => (j === i ? next : s)));

  return (
    <section aria-label="Palette" className="flex flex-1 flex-col gap-[6px]">
      {/* Compressed while the generator is searching, springing open on the
          winner. The spring is `linear()`, so it is real physics and it is
          free. The row grows to fill the workbench column, so the palette is
          the tallest, most-saturated object on the page. */}
      <div
        {...handlers}
        className={`bar-spring flex flex-1 flex-col gap-[6px] sm:flex-row ${arriving ? "bar-deal" : ""}`}
        style={{ transform: preview ? "scaleY(0.962)" : "none" }}
      >
        {palette.map((swatchState, i) => {
          const s = preview ? { ...swatchState, color: preview[i] ?? swatchState.color } : swatchState;
          const hex = toHex(s.color);
          const ink = deriveInk(s.color, 4.5);
          const strong = deriveInk(s.color, 7);
          const active = i === selected;
          const origin =
            s.origin === "user" ? "yours" : s.origin === "library" ? "off the shelf" : "generated";

          return (
            <div
              key={keys[i]}
              ref={register(keys[i])}
              onPointerDown={(e) => onPointerDown(e, i)}
              onMouseEnter={() => {
                onHover?.([i]);
                say(
                  `${hex.toUpperCase()} · L ${s.color.l.toFixed(3)} C ${s.color.c.toFixed(3)} H ${s.color.h.toFixed(1)} · ${origin}${s.locked ? " · locked, so every generate keeps it" : ""} · label solved to ${toHex(ink).toUpperCase()}`,
                );
              }}
              onMouseLeave={() => {
                onHover?.([]);
                say(null);
              }}
              className="group relative flex min-w-0 flex-1 flex-col justify-end overflow-hidden rounded-[18px] p-4 transition-[flex-grow,opacity] duration-300 ease-[var(--ease-out-quint)] select-none sm:min-h-[228px] sm:p-5"
              style={{
                background: toCss(s.color),
                color: toCss(ink),
                // Every slot the same width while a drag is live: the selected
                // swatch is wider, and a row whose slots resize as the grabbed
                // chip passes through them cannot be aimed at.
                flexGrow: dragging ? 1 : active ? 1.35 : 1,
                // Quietened while something else is being traced — but never
                // during a drag, where every slot has to stay aimable.
                opacity:
                  !dragging && highlight && highlight.length > 0 && !highlight.includes(i)
                    ? 0.45
                    : 1,
                zIndex: dragging === keys[i] ? 20 : undefined,
                cursor: dragging ? "grabbing" : "grab",
              }}
            >
              {/* Selecting a swatch drives the ramp and export tiles below.
                  It sits behind the controls so it never swallows their clicks. */}
              <button
                onClick={() => onSelect(i)}
                aria-label={`Select ${hex}`}
                aria-pressed={active}
                // No cursor of its own: it covers the whole swatch, so it has
                // to inherit the grab/grabbing cursor or the row looks like it
                // is only clickable.
                className="absolute inset-0"
              />

              <div className="relative flex items-start justify-between gap-2">
                <button
                  onClick={() => setAt(i, { ...swatchState, locked: !swatchState.locked })}
                  aria-label={s.locked ? `Unlock ${hex}` : `Lock ${hex}`}
                  aria-pressed={s.locked}
                  title={s.locked ? "Locked — kept on every generate" : "Lock this colour"}
                  className={`cursor-pointer rounded-full p-2 transition-opacity duration-200 ${
                    s.locked ? "opacity-100" : "opacity-0 group-hover:opacity-70 focus-visible:opacity-100"
                  }`}
                  style={{ background: "color-mix(in oklch, currentColor 12%, transparent)" }}
                >
                  <Icon name={s.locked ? "lock" : "unlock"} />
                </button>

                <div className="flex gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-70 focus-within:opacity-100">
                  <label
                    className="relative flex cursor-pointer items-center rounded-full p-2"
                    style={{ background: "color-mix(in oklch, currentColor 12%, transparent)" }}
                    title="Nudge this colour by hand"
                  >
                    <Icon name="edit" />
                    <input
                      type="color"
                      value={hex}
                      onChange={(e) => {
                        const parsed = fromHex(e.target.value);
                        if (parsed) setAt(i, { ...swatchState, color: parsed, origin: "user" });
                      }}
                      aria-label={`Edit ${hex}`}
                      className="absolute inset-0 opacity-0"
                    />
                  </label>
                  <button
                    onClick={() => onChange(regenerate(palette, [i]))}
                    disabled={s.locked}
                    aria-label={`Replace ${hex}`}
                    title={s.locked ? "Unlock it first" : "Replace just this colour"}
                    className="cursor-pointer rounded-full p-2 disabled:cursor-not-allowed disabled:opacity-40"
                    style={{ background: "color-mix(in oklch, currentColor 12%, transparent)" }}
                  >
                    <Icon name="shuffle" />
                  </button>
                  <button
                    onClick={() => onChange(palette.filter((_, j) => j !== i))}
                    disabled={palette.length <= MIN}
                    aria-label={`Remove ${hex}`}
                    title={palette.length <= MIN ? `Minimum ${MIN} colours` : "Remove"}
                    className="cursor-pointer rounded-full p-2 disabled:cursor-not-allowed disabled:opacity-40"
                    style={{ background: "color-mix(in oklch, currentColor 12%, transparent)" }}
                  >
                    <Icon name="close" />
                  </button>
                </div>
              </div>

              <div className="relative mt-auto pt-6">
                <button
                  onClick={() => void copy(hex, hex)}
                  title="Copy hex"
                  className="tabular flex cursor-pointer items-center gap-1.5 text-[17px] font-bold tracking-[-0.02em] sm:text-[19px]"
                  style={{ color: toCss(strong) }}
                >
                  {copied === hex ? "Copied" : hex.toUpperCase()}
                  <Icon name={copied === hex ? "check" : "copy"} size={13} />
                </button>
                <p className="mt-1 text-[12px]">
                  {s.origin === "user"
                    ? "Yours"
                    : s.origin === "library"
                      ? "From the shelf"
                      : "Generated"}
                  <span className="tabular opacity-70">
                    {" · "}L {s.color.l.toFixed(2)} · C {s.color.c.toFixed(3)}
                  </span>
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={onGenerate}
          className="cursor-pointer rounded-full px-4 py-2 text-[14px] font-medium transition-transform duration-200 ease-[var(--ease-out-quint)] active:scale-[0.98]"
          style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
        >
          Generate
        </button>
        <button
          onClick={() => {
            // Grow by one slot, then let the generator fill just that slot
            // around everything already there. Appending a copy of the last
            // colour would add a swatch the critique instantly calls redundant.
            const grown = [...palette, { ...palette[palette.length - 1], locked: false }];
            onChange(regenerate(grown, [grown.length - 1]));
          }}
          disabled={palette.length >= MAX}
          className="flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-2 text-[14px] font-medium disabled:cursor-not-allowed disabled:opacity-40"
          style={{ background: "var(--surface)" }}
        >
          <Icon name="plus" /> Add colour
        </button>
        <p className="ml-auto text-[13px] text-[var(--muted)]">
          <kbd className="tabular rounded border px-1.5 py-0.5 text-[12px]">space</kbd> to
          generate
        </p>
      </div>
    </section>
  );
}
