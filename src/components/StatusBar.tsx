import type { ReactNode, RefObject } from "react";

/**
 * The instrument's bottom rail: one line of readout on the left, the controls
 * that change how the whole studio is displayed on the right.
 *
 * It is sticky rather than fixed so it never covers the last tile — a fixed bar
 * would sit on top of the export block on a short window, which is exactly the
 * kind of detail that makes a tool feel like a demo.
 */
export function StatusBar({
  line,
  idle,
  children,
}: {
  line: RefObject<HTMLSpanElement | null>;
  idle: string;
  children?: ReactNode;
}) {
  return (
    <div className="sticky bottom-[6px] z-30 mt-[6px]">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-4 gap-y-2 rounded-[16px] border bg-[var(--surface)] px-4 py-2.5">
        {/* A steady dot rather than a pulsing one: this reports state, it does
            not ask for attention. */}
        <span
          className="size-1.5 shrink-0 rounded-full bg-[var(--accent)]"
          aria-hidden
        />
        <span
          ref={line}
          data-live="0"
          aria-live="polite"
          className="tabular min-w-0 flex-1 truncate text-[12px] leading-[1.4] text-[var(--muted)]"
        >
          {idle}
        </span>
        {children}
      </div>
    </div>
  );
}

/** A control that lives on the rail. Small, quiet, and labelled in words. */
export function RailButton({
  active = false,
  title,
  onClick,
  onDescribe,
  describe,
  children,
}: {
  active?: boolean;
  title: string;
  onClick: () => void;
  /** Hands the status line what this control does, rather than a tooltip nobody waits for. */
  onDescribe?: (text: string | null) => void;
  describe?: string;
  children: ReactNode;
}) {
  const say = (text: string | null) => onDescribe?.(text);
  return (
    <button
      onClick={onClick}
      title={title}
      aria-pressed={active}
      onMouseEnter={() => say(describe ?? title)}
      onMouseLeave={() => say(null)}
      onFocus={() => say(describe ?? title)}
      onBlur={() => say(null)}
      className="shrink-0 cursor-pointer rounded-[8px] px-2.5 py-1 text-[12px] font-medium transition-colors duration-150"
      style={{
        background: active ? "var(--accent)" : "transparent",
        color: active ? "var(--accent-ink)" : "var(--muted)",
        border: active ? "1px solid transparent" : "1px solid var(--line)",
      }}
    >
      {children}
    </button>
  );
}
