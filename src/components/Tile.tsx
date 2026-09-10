import type { CSSProperties, ReactNode } from "react";

/**
 * A ring drawn inside an element when the colour it wears is the one being
 * traced from the palette bar — two inset rings, one light and one dark, so it
 * stays visible on a swatch of any lightness. Shared by the previews so
 * hovering a swatch marks every place that colour lands.
 */
export const ring = (on: boolean): CSSProperties =>
  on ? { boxShadow: "inset 0 0 0 2px var(--surface), inset 0 0 0 4px var(--ink)" } : {};

/**
 * The bento cell. Small gutter against a large radius is the whole visual
 * identity here — tiles nearly touch, so the rounding reads as one sheet of
 * cut paper rather than a grid of floating cards. No shadows: depth comes
 * from tone, so the page stays flat and calm under a shifting palette.
 */
export function Tile({
  label,
  aside,
  children,
  className = "",
}: {
  label: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`flex min-w-0 flex-col rounded-[22px] bg-[var(--surface)] p-5 sm:p-6 ${className}`}
      aria-label={label}
    >
      <header className="mb-4 flex min-h-6 items-center justify-between gap-3">
        <h2 className="text-[13px] font-medium tracking-[0.01em] text-[var(--muted)]">
          {label}
        </h2>
        {aside}
      </header>
      {children}
    </section>
  );
}

/** A read-only measurement. Always mono, always tabular. */
export function Stat({ value, unit }: { value: string; unit?: string }) {
  return (
    <span className="tabular text-[12px] text-[var(--muted)]">
      {value}
      {unit && <span className="opacity-60">{unit}</span>}
    </span>
  );
}

/**
 * A pass/fail badge. The ratio is printed next to it on purpose: colour is
 * never the only thing carrying the verdict, which matters more than usual
 * in a tool whose users are the people checking for exactly that.
 */
export function Grade({ level }: { level: string }) {
  const pass = level !== "Fail";
  return (
    <span
      className="tabular inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium"
      style={{
        background: pass ? "color-mix(in oklch, var(--ink) 8%, transparent)" : "transparent",
        color: pass ? "var(--ink)" : "var(--muted)",
        border: pass ? "none" : "1px dashed var(--line)",
      }}
    >
      {pass ? "✓" : "✕"} {level}
    </span>
  );
}

/**
 * The icon set, inline. Six glyphs is not worth a dependency, a font, or a
 * sprite sheet — and drawn as strokes on `currentColor` they inherit whatever
 * ink the surface underneath them derived, which an icon font cannot do.
 */
const PATHS: Record<string, string> = {
  lock: "M5 7.5V5a3 3 0 0 1 6 0v2.5",
  unlock: "M5.2 7.5V5a3 3 0 0 1 5.6-1.4",
  close: "M4.5 4.5l7 7M11.5 4.5l-7 7",
  plus: "M8 3.5v9M3.5 8h9",
  check: "M3.5 8.4l3 3 6-6.8",
  shuffle: "M2 4.5h2.6l6.8 7H14M2 11.5h2.6l1.9-2M11.4 4.5H14M12.4 3l1.6 1.5-1.6 1.5M12.4 10l1.6 1.5-1.6 1.5",
  copy: "M11 5.5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h1.5",
  edit: "M11.4 2.6a1.7 1.7 0 0 1 2.4 2.4L6.3 12.5 3 13.5l1-3.3z",
  bolt: "M8.8 1.8L3.4 9h3.3l-.9 5.2L11.6 7H8.3l.5-5.2z",
  box: "M2.5 5.3L8 2.5l5.5 2.8v5.4L8 13.5l-5.5-2.8V5.3zM2.5 5.3L8 8l5.5-2.7M8 8v5.5",
  heart: "M8 13.4C4.2 10.7 2.3 8.8 2.3 6.4c0-1.8 1.4-3.2 3.2-3.2 1 0 1.9.5 2.5 1.3.6-.8 1.5-1.3 2.5-1.3 1.8 0 3.2 1.4 3.2 3.2 0 2.4-1.9 4.3-5.7 7z",
};

export function Icon({ name, size = 14 }: { name: keyof typeof PATHS | string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="shrink-0"
    >
      {(name === "lock" || name === "unlock") && (
        <rect x="3" y="7.5" width="10" height="6.5" rx="2" />
      )}
      {name === "copy" && <rect x="5" y="5" width="9" height="9" rx="2" />}
      <path d={PATHS[name] ?? ""} />
    </svg>
  );
}
