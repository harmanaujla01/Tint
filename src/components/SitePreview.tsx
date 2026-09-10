import { type Oklch, contrast, toCss, toHex } from "../lib/color.ts";
import { type Palette, paletteRoles } from "../lib/harmony.ts";
import { useSay } from "../lib/status.ts";
import { Icon, Tile, ring } from "./Tile.tsx";

type RoleRow = {
  role: string;
  color: Oklch;
  on: Oklch;
  supplied: boolean;
};

const FEATURES = [
  { icon: "bolt", title: "Fast", body: "Ships in a day, not a sprint." },
  { icon: "box", title: "Small", body: "One dependency: none." },
  { icon: "heart", title: "Yours", body: "Every hex, derived from what you gave it." },
] as const;

/**
 * The palette doing an actual job, and being marked on it.
 *
 * Two things happen here at once. The page on the left is painted entirely
 * from `paletteRoles`, so you see the palette as an interface rather than as
 * five rectangles. The panel on the right is the inspector: every one of the
 * user's own colours, and exactly which text role (if any) it ended up
 * carrying, at exactly what ratio — which is a far more useful thing to know
 * than a number floating on its own underneath a screenshot.
 */
export function SitePreview({
  palette,
  name,
  dark = false,
  hi = () => false,
}: {
  palette: Palette;
  name: string;
  /** Read the palette from its dark end instead of its light one. */
  dark?: boolean;
  /** True for a colour currently being traced from the palette bar. */
  hi?: (c: Oklch) => boolean;
}) {
  const say = useSay();
  const roles = paletteRoles(palette.map((s) => s.color), dark);
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "brand";

  const rows: RoleRow[] = [
    { role: "Headings", color: roles.heading, on: roles.surface, supplied: roles.headingFromPalette },
    { role: "Body text", color: roles.body, on: roles.surface, supplied: roles.bodyFromPalette },
    { role: "Button text", color: roles.onAccent, on: roles.accent, supplied: roles.onAccentFromPalette },
  ];
  const borrowed = rows.filter((r) => !r.supplied).length;

  // Which of the user's own swatches ended up carrying which role(s) — the
  // honest map behind "N solved by Tint" above.
  const usage = new Map<string, RoleRow[]>();
  for (const r of rows) {
    if (!r.supplied) continue;
    const key = toHex(r.color);
    usage.set(key, [...(usage.get(key) ?? []), r]);
  }
  const solved = rows.filter((r) => !r.supplied);

  return (
    <Tile
      label={dark ? "In use, dark" : "In use"}
      aside={
        <span className="tabular text-[12px] text-[var(--muted)]">
          {borrowed === 0
            ? "all text from your palette"
            : `${borrowed} solved by Tint`}
        </span>
      }
      className="min-h-0"
    >
      <div className="grid gap-3 lg:grid-cols-[1fr_268px]">
        {/* The page. */}
        <div className="overflow-hidden rounded-[14px] border">
          {/* Browser chrome, so it reads as a page rather than as a swatch. */}
          <div
            className="flex items-center gap-2 px-3 py-2"
            style={{ background: toCss(roles.raised) }}
          >
            <span className="flex gap-1" aria-hidden>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="size-2 rounded-full"
                  style={{ background: toCss(roles.body), opacity: 0.35 }}
                />
              ))}
            </span>
            <span
              className="tabular truncate rounded-full px-2.5 py-0.5 text-[10px]"
              style={{ background: toCss(roles.surface), color: toCss(roles.body) }}
            >
              {slug}.com
            </span>
          </div>

          <div style={{ background: toCss(roles.surface) }}>
            <div
              className="flex items-center justify-between gap-3 border-b px-4 py-2.5"
              style={{ borderColor: toCss(roles.raised) }}
            >
              <span
                className="text-[13px] font-bold tracking-[-0.02em]"
                style={{ color: toCss(roles.heading) }}
              >
                {slug}
              </span>
              <span className="flex items-center gap-3">
                {["Product", "Pricing"].map((l) => (
                  <span key={l} className="text-[11px]" style={{ color: toCss(roles.body) }}>
                    {l}
                  </span>
                ))}
                <span
                  className="rounded-full px-2.5 py-1 text-[11px] font-medium"
                  style={{ background: toCss(roles.accent), color: toCss(roles.onAccent), ...ring(hi(roles.accent)) }}
                >
                  Sign up
                </span>
              </span>
            </div>

            <div className="px-4 py-5 sm:px-5 sm:py-6">
              <div className="flex items-start justify-between gap-5">
                <div className="min-w-0 max-w-[36ch]">
                  <h3
                    className="text-[20px] leading-[1.15] font-bold tracking-[-0.03em]"
                    style={{ color: toCss(roles.heading) }}
                  >
                    Five colours, doing a day's work
                  </h3>
                  <p
                    className="mt-2 text-[12.5px] leading-[1.55]"
                    style={{ color: toCss(roles.body) }}
                  >
                    Nothing on this page picked a text colour by hand. Every
                    one is your palette where your palette could carry it, and
                    solved for where it could not.
                  </p>

                  <div className="mt-3.5 flex flex-wrap items-center gap-2">
                    <span
                      className="rounded-[9px] px-3 py-1.5 text-[12px] font-medium"
                      style={{ background: toCss(roles.accent), color: toCss(roles.onAccent), ...ring(hi(roles.accent)) }}
                    >
                      Get started
                    </span>
                    <span
                      className="rounded-[9px] border px-3 py-1.5 text-[12px] font-medium"
                      style={{ borderColor: toCss(roles.body), color: toCss(roles.heading) }}
                    >
                      Read the docs
                    </span>
                  </div>
                </div>

                {/* A fanned stack of the palette itself — the same swatches
                    the inspector is about to account for, one by one. */}
                <div className="relative hidden h-[86px] w-[92px] shrink-0 sm:block" aria-hidden>
                  {palette.slice(0, 4).map((s, i) => (
                    <span
                      key={i}
                      className="absolute inset-x-1.5 top-0 h-[58px] rounded-[13px] border-2"
                      style={{
                        background: toCss(s.color),
                        borderColor: toCss(roles.surface),
                        transform: `rotate(${(i - 1.5) * 8}deg) translateY(${i * 7}px)`,
                        ...ring(hi(s.color)),
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {FEATURES.map((f, i) => {
                  const c = palette[Math.min(i + 1, palette.length - 1)].color;
                  return (
                    <div
                      key={f.title}
                      className="rounded-[12px] p-3"
                      style={{ background: toCss(roles.raised) }}
                    >
                      <span
                        className="mb-2 flex size-7 items-center justify-center rounded-[8px] border"
                        style={{ background: toCss(roles.surface), borderColor: toCss(roles.raised), color: toCss(c), ...ring(hi(c)) }}
                      >
                        <Icon name={f.icon} size={14} />
                      </span>
                      <span className="block text-[11.5px] font-medium" style={{ color: toCss(roles.heading) }}>
                        {f.title}
                      </span>
                      <span className="mt-0.5 block text-[10.5px] leading-[1.4]" style={{ color: toCss(roles.body) }}>
                        {f.body}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* The inspector: every one of the user's colours, and what it's doing. */}
        <div className="flex flex-col overflow-hidden rounded-[14px] border" style={{ borderColor: "var(--line)" }}>
          <div className="border-b px-3.5 py-2.5" style={{ background: toCss(roles.raised), borderColor: "var(--line)" }}>
            <span className="text-[11px] font-medium tracking-[0.01em]" style={{ color: toCss(roles.body) }}>
              Where it lands
            </span>
          </div>

          <ul className="flex flex-1 flex-col gap-px overflow-hidden" onMouseLeave={() => say(null)}>
            {palette.map((s, i) => {
              const hex = toHex(s.color);
              const uses = usage.get(hex) ?? [];
              return (
                <li
                  key={i}
                  className="flex flex-col gap-1.5 bg-[var(--bench)] px-3 py-2.5"
                  onMouseEnter={() =>
                    say(
                      uses.length
                        ? `${hex.toUpperCase()} — your own colour, carrying ${uses.map((u) => u.role.toLowerCase()).join(" and ")}`
                        : `${hex.toUpperCase()} — in your palette, not carrying text on this page`,
                    )
                  }
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="size-6 shrink-0 rounded-[6px] border"
                      style={{ background: toCss(s.color), borderColor: "var(--line)", ...ring(hi(s.color)) }}
                      aria-hidden
                    />
                    <span className="tabular truncate text-[11.5px] text-[var(--ink)]">{hex}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 pl-8">
                    {uses.length > 0 ? (
                      uses.map((u) => (
                        <span
                          key={u.role}
                          className="tabular rounded-full px-1.5 py-0.5 text-[10px] text-[var(--muted)]"
                          style={{ background: "var(--surface)" }}
                        >
                          {u.role} · {contrast(u.color, u.on).toFixed(2)}:1
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-[var(--muted)]">not used for text here</span>
                    )}
                  </div>
                </li>
              );
            })}

            {solved.map((r) => (
              <li
                key={r.role}
                className="flex flex-col gap-1.5 bg-[var(--bench)] px-3 py-2.5"
                onMouseEnter={() =>
                  say(
                    `${r.role.toLowerCase()} — no colour in your palette clears the contrast this role needs, so Tint solved for ${toHex(r.color).toUpperCase()}, the softest one that does`,
                  )
                }
              >
                <div className="flex items-center gap-2">
                  <span
                    className="flex size-6 shrink-0 items-center justify-center rounded-[6px] border border-dashed"
                    style={{ borderColor: "var(--line)", color: toCss(r.color) }}
                    aria-hidden
                  >
                    <Icon name="plus" size={10} />
                  </span>
                  <span className="tabular truncate text-[11.5px] text-[var(--ink)]">{toHex(r.color)}</span>
                </div>
                <div className="flex flex-wrap gap-1 pl-8">
                  <span
                    className="tabular rounded-full px-1.5 py-0.5 text-[10px] text-[var(--muted)]"
                    style={{ background: "var(--surface)" }}
                  >
                    {r.role} · {contrast(r.color, r.on).toFixed(2)}:1 · solved
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Tile>
  );
}
