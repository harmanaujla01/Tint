import { useState } from "react";
import { type Oklch, contrast, toCss, toHex } from "../lib/color.ts";
import { type Critique, type Palette, paletteRoles, regenerate } from "../lib/harmony.ts";
import { Icon } from "./Tile.tsx";

/**
 * "Know it is usable", in ordinary language.
 *
 * The engine already runs seven checks and solves every interface role; this
 * says what came out of that in words a person who has never heard of a
 * contrast ratio can act on — and keeps the numbers one click away for the
 * people who want them. The primary layer explains the outcome; `See details`
 * shows the ratios and OKLCH the outcome was read from.
 */
export function GoodToGo({
  palette,
  critique,
  onChange,
  dark,
}: {
  palette: Palette;
  critique: Critique;
  onChange: (p: Palette) => void;
  dark: boolean;
}) {
  const [details, setDetails] = useState(false);
  const roles = paletteRoles(palette.map((s) => s.color), dark);
  // "Good to go" turns on the honest question — is this safe to use — which is
  // the `bad` notes. A `warn` is worth a look, not a blocker, so it never
  // alarms the front layer; it waits under See details with everything else.
  const problems = critique.notes.filter((n) => n.severity !== "good");
  const blockers = critique.notes.filter((n) => n.severity === "bad");
  const worst = blockers[0] ?? null;

  const roleRows: { name: string; color: Oklch; solved: boolean }[] = [
    { name: "Background", color: roles.surface, solved: false },
    { name: "Surface", color: roles.raised, solved: false },
    { name: "Headings", color: roles.heading, solved: !roles.headingFromPalette },
    { name: "Main text", color: roles.body, solved: !roles.bodyFromPalette },
    { name: "Main colour", color: roles.accent, solved: false },
    { name: "Button text", color: roles.onAccent, solved: !roles.onAccentFromPalette },
  ];

  return (
    <section
      aria-label="Know it is usable"
      className="mx-auto mt-[6px] w-full max-w-[1440px] overflow-hidden rounded-[22px] bg-[var(--surface)]"
    >
      {/* The verdict, in a sentence. */}
      <div className="flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7" style={{ borderColor: "var(--bench)" }}>
        <div className="min-w-0">
          {/* Keyed so the verdict only re-animates when it genuinely flips —
              good↔a specific fix — not on every colour nudge. */}
          <div key={worst?.id ?? "good"} className="panel-in">
          {worst ? (
            <>
              <div className="flex items-center gap-2">
                <span
                  className="flex size-6 items-center justify-center rounded-full text-[13px]"
                  style={{ background: "var(--bench)", color: "var(--ink)" }}
                  aria-hidden
                >
                  !
                </span>
                <h2 className="text-[20px] font-bold tracking-[-0.02em] sm:text-[22px]">
                  {blockers.length === 1 ? "One thing to fix" : `${blockers.length} things to fix`}
                </h2>
              </div>
              <p className="mt-2 max-w-[52ch] text-[14px] leading-[1.5] text-[var(--ink)]">
                {worst.detail}
              </p>
              {worst.replace && (
                <button
                  onClick={() => onChange(regenerate(palette, worst.replace!))}
                  className="mt-3 w-fit cursor-pointer rounded-[10px] px-3.5 py-2 text-[13px] font-medium"
                  style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
                >
                  {worst.replace.some((i) => palette[i]?.locked)
                    ? "Try a safer version anyway"
                    : "Try a safer version"}
                </button>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span
                  className="flex size-6 items-center justify-center rounded-full"
                  style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
                  aria-hidden
                >
                  <Icon name="check" size={14} />
                </span>
                <h2 className="text-[20px] font-bold tracking-[-0.02em] sm:text-[22px]">Good to go</h2>
              </div>
              <p className="mt-2 max-w-[52ch] text-[14px] leading-[1.5] text-[var(--ink)]">
                Your main text is readable, your colours stay distinct, and your
                accent has enough presence.
                {problems.length > 0 &&
                  ` ${problems.length === 1 ? "One optional tweak sits" : `${problems.length} optional tweaks sit`} under See details — nothing that stops you shipping.`}
              </p>
            </>
          )}
          </div>

          <button
            onClick={() => setDetails((d) => !d)}
            aria-expanded={details}
            className="flex w-fit cursor-pointer items-center gap-1 pt-3 text-[12px] text-[var(--muted)] underline underline-offset-2 hover:text-[var(--ink)]"
          >
            {details ? "Hide details" : "See details"}
          </button>

          {details && (
            <div className="mt-3 max-w-[52ch] border-t pt-3">
              <p className="tabular text-[12px] text-[var(--muted)]">
                Score {critique.score}/100 · {problems.length} flagged. Full
                critique, contrast matrix and colour-vision simulation are in the
                panels below.
              </p>
              {problems.length > 0 && (
                <ul className="mt-2 flex flex-col gap-1.5">
                  {problems.map((n) => (
                    <li key={n.id} className="text-[12px] leading-[1.45] text-[var(--ink)]">
                      <span className="font-medium">{n.title}.</span>{" "}
                      <span className="text-[var(--muted)]">{n.detail}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* The score, printed rather than just implied. */}
        <div
          className="flex shrink-0 items-baseline gap-1.5 self-start rounded-[12px] px-3.5 py-2 sm:self-center"
          style={{ background: "var(--bench)" }}
        >
          <span className="tabular text-[22px] font-bold leading-none" style={{ color: "var(--ink)" }}>
            {critique.score}
          </span>
          <span className="text-[12px] text-[var(--muted)]">/100</span>
        </div>
      </div>

      {/* The roles, named — packed as a swatch row rather than a tall list,
          so it reads as one page of the swatch book instead of a stretched
          sidebar. */}
      <div className="flex flex-wrap gap-x-6 gap-y-4 p-5 sm:p-7">
        {roleRows.map((r) => (
          <div key={r.name} className="flex min-w-[132px] flex-1 items-center gap-2.5">
            <span
              className="size-9 shrink-0 rounded-[9px] border"
              style={{ background: toCss(r.color) }}
              aria-hidden
            />
            <span className="min-w-0">
              <span className="block truncate text-[12.5px] font-medium text-[var(--ink)]">
                {r.name}
              </span>
              <span className="tabular block truncate text-[11px] text-[var(--muted)]">
                {toHex(r.color)}
                {r.solved && " · solved"}
                {details && ` · ${contrast(r.color, roles.surface).toFixed(2)}:1`}
              </span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
