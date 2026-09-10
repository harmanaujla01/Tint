import { type Oklch, deriveInk, toCss, toHex } from "../lib/color.ts";
import { clamp01, ease, lerp, useReducedMotion, useScrollProgress } from "../lib/motion.ts";
import { afterPin, chipBox, chipProgress } from "../lib/strip.ts";

const LINE = ["Every", "colour", "on", "this", "page", "is", "earned."];

/** Runway before the pin, in viewport heights. See `useScrollProgress`. */
const LEAD = 0.55;

/** Reveal ramp for one word of the headline. */
const word = (p: number, i: number) => ease(clamp01((p - 0.12 - i * 0.075) / 0.14));

/**
 * The pinned strip.
 *
 * A tall section with a sticky inner layer: as the viewport travels through
 * it, the palette grows from a row of chips lying on the page into full-bleed
 * columns. That is the same move the tool makes — a handful of colours
 * becoming the thing everything else is measured against — so it is worth a
 * screen of its own.
 *
 * Geometry is interpolated in `calc()` because the two ends are in different
 * units: chips start at a fixed pixel size in the middle of the screen and
 * finish as an even percentage split of it.
 *
 * Each column signs itself once it is wide enough to hold the label, in ink
 * derived from that column rather than from the page. Five flat colour fields
 * is what a generator looks like; five labelled fields is what a swatch page
 * looks like, and the difference is the whole argument of the product. It is
 * also the only text on this page proving the claim it sits next to — the ink
 * on each column was solved against that column.
 *
 * The sentence sits on a `--bg` panel rather than straight on the chips. That
 * is not timidity — text laid over five arbitrary user colours is exactly the
 * failure this page spends five sections arguing against, and no derivation
 * can save a foreground that has five different backgrounds at once.
 */
export function ScrollStrip({ colors }: { colors: Oklch[] }) {
  const [ref, p, pinAt] = useScrollProgress<HTMLElement>(LEAD);
  const n = colors.length;
  const reduced = useReducedMotion();

  // Two clocks, because two different things are being paced.
  //
  // `p` includes the runway, and the columns run off it: they start opening
  // while the section is still rising into view, so the approach carries the
  // palette unfolding instead of an empty screen with a row of chips creeping
  // up from the bottom edge.
  //
  // Everything that belongs to the *held* frame — the sentence, its sub-line,
  // the threshold cue — runs off `pin` instead, which is `p` remapped onto the
  // stretch after the section actually pins.
  const pin = afterPin(p, pinAt);
  const cardIn = ease(clamp01((pin - 0.06) / 0.2));

  return (
    <section
      ref={ref}
      aria-label="Every colour on this page is earned"
      className={reduced ? "relative" : "relative h-[220vh] sm:h-[280vh]"}
    >
      <div
        className={
          reduced
            ? "relative flex min-h-[78vh] items-center justify-center overflow-hidden px-6 py-[10vh]"
            : "sticky top-0 flex h-dvh items-center justify-center overflow-hidden px-6"
        }
      >
        {colors.map((c, i) => {
          const t = chipProgress(p, i, n);
          const b = chipBox(i, n, t);
          // Held back until the column is wide enough that a label is not
          // being crammed into a 44px chip.
          const label = reduced ? 1 : ease(clamp01((t - 0.72) / 0.28));
          return (
            <div
              key={i}
              aria-hidden
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
              <span
                className="tabular absolute top-20 left-1/2 -translate-x-1/2 text-[11px] tracking-[0.06em] whitespace-nowrap sm:top-24 sm:text-[13px]"
                style={{ color: toCss(deriveInk(c, 4.5)), opacity: label }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                className="tabular absolute bottom-5 left-1/2 -translate-x-1/2 text-[11px] tracking-[0.06em] whitespace-nowrap sm:bottom-8 sm:text-[13px]"
                style={{ color: toCss(deriveInk(c, 4.5)), opacity: label }}
              >
                {toHex(c).toUpperCase()}
              </span>
            </div>
          );
        })}

        {/* The label, laid down over the swatches once they have started to
            spread. It used to be 35% visible at rest, which put a pale slab
            over the resting chip row — the one frame that has to read as
            "this is just a palette" before the screen fills with it. */}
        <div
          // Sized in rem, not ch. `ch` on this node resolves against *its*
          // 16px font rather than the 58px heading inside it, which put the
          // display line in a 224px box one word wide.
          className="relative max-w-[18rem] rounded-[22px] px-8 py-9 text-center sm:max-w-[34rem] sm:px-14 sm:py-12"
          style={{
            background: "var(--bg)",
            opacity: reduced ? 1 : cardIn,
            transform: reduced ? undefined : `scale(${lerp(0.94, 1, cardIn)})`,
          }}
        >
          <h2 className="text-[36px] leading-[1.02] font-bold tracking-[-0.045em] sm:text-[58px]">
            {/* The word space sits *outside* the animated span. Inside it,
                the browser trims it — an inline-block does not keep a
                trailing space — and the line renders as "Everycolouron". */}
            {LINE.map((w, i) => (
              <span key={i}>
                <span
                  className="inline-block"
                  style={{
                    opacity: reduced ? 1 : word(pin, i),
                    transform: reduced ? undefined : `translate3d(0, ${lerp(14, 0, word(pin, i))}px, 0)`,
                  }}
                >
                  {w}
                </span>
                {i < LINE.length - 1 ? " " : ""}
              </span>
            ))}
          </h2>
          <p
            className="mx-auto mt-5 max-w-[34ch] text-[15px] leading-[1.5] text-[var(--muted)] sm:text-[17px]"
            style={{ opacity: reduced ? 1 : ease(clamp01((pin - 0.74) / 0.16)) }}
          >
            Change the palette. Watch everything recalculate.
          </p>
        </div>
      </div>
    </section>
  );
}
