import { type ReactNode, useState } from "react";
import { type Oklch, toCss, toHex } from "../lib/color.ts";
import { type Palette, type Roles, paletteRoles } from "../lib/harmony.ts";
import { Tile, ring } from "./Tile.tsx";
import { SitePreview } from "./SitePreview.tsx";

type Context = "website" | "social" | "presentation";
type Hi = (c: Oklch) => boolean;

const TABS: { id: Context; label: string }[] = [
  { id: "website", label: "Website" },
  { id: "social", label: "Social" },
  { id: "presentation", label: "Presentation" },
];

/**
 * The palette stops being five rectangles and becomes an identity — the centre
 * of the studio. One dominant preview, switched between the three places a
 * palette has to work: a site, a social post, a deck. Every context is painted
 * from the same `paletteRoles`, so switching tabs is the same colours doing
 * three jobs. Hover a swatch in the bar above and this shows you exactly where
 * that colour lands.
 */
export function MakeItReal({
  palette,
  name,
  dark,
  highlight = [],
}: {
  palette: Palette;
  name: string;
  dark: boolean;
  highlight?: number[];
}) {
  const [tab, setTab] = useState<Context>("website");
  const roles = paletteRoles(palette.map((s) => s.color), dark);

  const traced = new Set(highlight.map((i) => palette[i] && toHex(palette[i].color)));
  const hi: Hi = (c) => traced.has(toHex(c));

  return (
    <section aria-label="See it working" className="mx-auto mt-[6px] w-full max-w-[1440px]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-baseline gap-3">
          <h2 className="text-[19px] font-bold tracking-[-0.02em] sm:text-[21px]">See it working</h2>
          <p className="hidden text-[12px] text-[var(--muted)] sm:block">
            hover a swatch to see where it lands
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-[var(--surface)] p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              aria-pressed={tab === t.id}
              className="cursor-pointer rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors"
              style={
                tab === t.id
                  ? { background: "var(--accent)", color: "var(--accent-ink)" }
                  : { color: "var(--muted)" }
              }
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Keyed on the tab so the new context remounts and fades in from just
          below — the switch reads as the palette stepping into a new place. */}
      <div key={tab} className="panel-in">
        {tab === "website" && <SitePreview palette={palette} name={name} dark={dark} hi={hi} />}
        {tab === "social" && <SocialPanel roles={roles} palette={palette} name={name} hi={hi} />}
        {tab === "presentation" && (
          <PresentationPanel roles={roles} palette={palette} name={name} hi={hi} />
        )}
      </div>
    </section>
  );
}

const slugify = (name: string) =>
  name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "") || "brand";

function SocialPanel({ roles, palette, name, hi }: { roles: Roles; palette: Palette; name: string; hi: Hi }) {
  const colors = palette.map((s) => s.color);
  const handle = slugify(name);
  return (
    <Tile label="On social" className="min-h-0">
      <div className="mx-auto flex max-w-[400px] flex-col gap-4">
        {/* Profile highlights row. */}
        <div className="flex gap-3">
          {colors.slice(0, 5).map((c, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <span
                className="flex size-11 items-center justify-center rounded-full p-[2px]"
                style={{ background: toCss(roles.accent) }}
              >
                <span className="size-full rounded-full" style={{ background: toCss(c), ...ring(hi(c)) }} />
              </span>
            </div>
          ))}
        </div>

        {/* The post. */}
        <div className="overflow-hidden rounded-[16px] border" style={{ background: toCss(roles.surface) }}>
          <div className="flex items-center gap-2.5 px-3 py-2.5">
            <span className="size-8 rounded-full" style={{ background: toCss(roles.accent), ...ring(hi(roles.accent)) }} />
            <span className="text-[13px] font-bold" style={{ color: toCss(roles.heading) }}>
              {handle}
            </span>
            <span className="ml-auto text-[16px]" style={{ color: toCss(roles.body) }} aria-hidden>
              ⋯
            </span>
          </div>

          {/* The image, made of the palette itself. */}
          <div className="flex aspect-[4/5] w-full">
            {colors.map((c, i) => (
              <span key={i} className="flex-1" style={{ background: toCss(c), ...ring(hi(c)) }} />
            ))}
          </div>

          <div className="px-3 py-2.5">
            <div className="mb-2 flex items-center gap-3 text-[15px]" style={{ color: toCss(roles.heading) }} aria-hidden>
              <span>♥</span>
              <span>💬</span>
              <span className="ml-auto" style={{ color: toCss(roles.accent) }}>◇</span>
            </div>
            <p className="text-[12.5px] leading-[1.5]" style={{ color: toCss(roles.body) }}>
              <span className="font-bold" style={{ color: toCss(roles.heading) }}>
                {handle}
              </span>{" "}
              Five colours, one mood. This is the palette wearing itself.
            </p>
          </div>
        </div>
      </div>
    </Tile>
  );
}

function PresentationPanel({ roles, palette, name, hi }: { roles: Roles; palette: Palette; name: string; hi: Hi }) {
  const colors = palette.map((s) => s.color);
  const title = name.trim() || "Untitled";
  const bars = [0.55, 0.8, 0.45, 1, 0.7];

  return (
    <Tile label="In a deck" className="min-h-0">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* Title slide. */}
        <Slide surface={roles.surface}>
          <span className="h-1 w-8 rounded-full" style={{ background: toCss(roles.accent), ...ring(hi(roles.accent)) }} />
          <h4 className="mt-2 text-[16px] leading-[1.1] font-bold tracking-[-0.02em]" style={{ color: toCss(roles.heading) }}>
            {title}
          </h4>
          <p className="mt-1 text-[10.5px]" style={{ color: toCss(roles.body) }}>
            A palette, presented
          </p>
        </Slide>

        {/* Content slide. */}
        <Slide surface={roles.surface}>
          <h4 className="text-[12px] font-bold" style={{ color: toCss(roles.heading) }}>
            What it covers
          </h4>
          <ul className="mt-2 flex flex-col gap-1.5">
            {["Surfaces and text", "One clear accent", "Readable everywhere"].map((t) => (
              <li key={t} className="flex items-center gap-2 text-[10.5px]" style={{ color: toCss(roles.body) }}>
                <span className="size-1.5 shrink-0 rounded-full" style={{ background: toCss(roles.accent) }} />
                {t}
              </li>
            ))}
          </ul>
        </Slide>

        {/* Data slide. */}
        <Slide surface={roles.surface}>
          <h4 className="text-[12px] font-bold" style={{ color: toCss(roles.heading) }}>
            By the numbers
          </h4>
          <div className="mt-auto flex h-[52px] items-end gap-1.5">
            {bars.map((h, i) => {
              const c = colors[i % colors.length];
              return (
                <span
                  key={i}
                  className="flex-1 rounded-t-[3px]"
                  style={{ height: `${h * 100}%`, background: toCss(c), ...ring(hi(c)) }}
                />
              );
            })}
          </div>
        </Slide>
      </div>
    </Tile>
  );
}

function Slide({ surface, children }: { surface: Roles["surface"]; children: ReactNode }) {
  return (
    <div
      className="flex aspect-[4/3] flex-col rounded-[12px] border p-3"
      style={{ background: toCss(surface) }}
    >
      {children}
    </div>
  );
}
