import { useCopy } from "../lib/useCopy.ts";

/**
 * The studio's greeting. A creative workspace header, not a tool's status
 * strip: a wordmark, the name of what you are making, one way back to the
 * story, and one visible way to hand the result to somebody. The colour
 * science that used to sit here as a tagline is proof, not a greeting — it
 * moves into Inspect.
 */
export function StudioHeader({
  name,
  onName,
}: {
  name: string;
  onName: (value: string) => void;
}) {
  const { copied, copy } = useCopy();

  return (
    <header className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center justify-between gap-x-8 gap-y-3 px-4 pt-6 pb-4 sm:px-6">
      <div className="flex min-w-0 items-baseline gap-3">
        <h1 className="text-[26px] font-bold tracking-[-0.035em] sm:text-[30px]">
          Tint
        </h1>
        <input
          value={name}
          onChange={(e) => onName(e.target.value)}
          placeholder="Untitled palette"
          aria-label="Project title, used in the share link and exported tokens"
          className="min-w-0 max-w-[240px] flex-1 rounded-[8px] border border-transparent bg-transparent px-1.5 py-1 text-[15px] text-[var(--muted)] outline-none transition-colors hover:border-[var(--line)] focus:border-[var(--line)] focus:text-[var(--ink)] placeholder:text-[var(--muted)]"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <a
          href="#/"
          className="rounded-full px-3 py-1.5 text-[13px] font-medium underline decoration-[var(--line)] underline-offset-[3px] hover:decoration-current"
        >
          How it works
        </a>
        <button
          onClick={() => copy(window.location.href)}
          className="cursor-pointer rounded-full px-4 py-1.5 text-[13px] font-medium"
          style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
        >
          {copied === "__error__"
            ? "Copy failed"
            : copied
              ? "Link copied"
              : "Share"}
        </button>
      </div>
    </header>
  );
}
