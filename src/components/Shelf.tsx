import { useState } from "react";
import { contrast, toCss, toHex } from "../lib/color.ts";
import type { Palette } from "../lib/harmony.ts";
import {
  type Saved,
  loadShelf,
  makeSaved,
  openSaved,
  saveShelf,
  savedLink,
} from "../lib/shelf.ts";
import { useCopy } from "../lib/useCopy.ts";
import { Icon } from "./Tile.tsx";

const slug = (name: string) =>
  name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "palette";

/**
 * Turn the current palette into a shareable PNG — name, swatches, hexes, and a
 * quiet signature — and hand it to the browser as a download. Canvas only; no
 * DOM-to-image dependency for what a few draw calls do.
 */
function downloadCard(palette: Palette, name: string) {
  const colors = palette.map((s) => s.color);
  const W = 1200;
  const H = 630;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const bg = [...colors].sort((a, b) => b.l - a.l)[0];
  const ink = colors.reduce((best, c) => (contrast(c, bg) > contrast(best, bg) ? c : best), colors[0]);
  ctx.fillStyle = toHex(bg);
  ctx.fillRect(0, 0, W, H);

  const pad = 80;
  const gap = 24;
  const top = 200;
  const sh = 210;
  const sw = (W - 2 * pad - gap * (colors.length - 1)) / colors.length;
  const font = '"Cabinet Grotesk", system-ui, sans-serif';

  colors.forEach((c, i) => {
    const x = pad + i * (sw + gap);
    ctx.beginPath();
    ctx.roundRect(x, top, sw, sh, 20);
    ctx.fillStyle = toHex(c);
    ctx.fill();
    ctx.fillStyle = toHex(ink);
    ctx.font = `500 24px ${font}`;
    ctx.textAlign = "center";
    ctx.fillText(toHex(c).toUpperCase(), x + sw / 2, top + sh + 48);
  });

  ctx.fillStyle = toHex(ink);
  ctx.textAlign = "left";
  ctx.font = `700 66px ${font}`;
  ctx.fillText(name.trim() || "Untitled", pad, 130);

  ctx.font = `500 26px ${font}`;
  ctx.globalAlpha = 0.55;
  ctx.fillText("Made with Tint", pad, H - 56);
  ctx.globalAlpha = 1;

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug(name)}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}

/**
 * "Take it with you." Save the palette to a browser-local shelf, download it as
 * a card, or copy a link — the palette becomes something a person keeps, posts,
 * or drops into a portfolio, without an account.
 */
export function Shelf({
  palette,
  name,
  onOpen,
}: {
  palette: Palette;
  name: string;
  onOpen: (palette: Palette, name: string) => void;
}) {
  const [shelf, setShelf] = useState<Saved[]>(loadShelf);
  const { copied, copy } = useCopy();

  const persist = (next: Saved[]) => {
    setShelf(next);
    saveShelf(next);
  };
  const save = () => persist([makeSaved(palette, name), ...shelf]);
  const remove = (id: string) => persist(shelf.filter((s) => s.id !== id));
  const duplicate = (s: Saved) => {
    const colors = openSaved(s);
    if (colors) persist([makeSaved(colors, `${s.name} copy`), ...shelf]);
  };

  return (
    <section
      aria-label="Take it with you"
      className="mx-auto mt-[6px] w-full max-w-[1440px] rounded-[22px] bg-[var(--surface)] p-5 sm:p-6"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[13px] font-medium tracking-[0.01em] text-[var(--muted)]">
          Take it with you
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={save}
            className="cursor-pointer rounded-[10px] px-3 py-1.5 text-[13px] font-medium"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
          >
            Save to shelf
          </button>
          <button
            onClick={() => downloadCard(palette, name)}
            className="flex cursor-pointer items-center gap-1.5 rounded-[10px] border px-3 py-1.5 text-[13px] font-medium text-[var(--ink)] hover:bg-[var(--bench)]"
          >
            <Icon name="copy" size={14} />
            Download card
          </button>
          <button
            onClick={() => copy(window.location.href, "link")}
            className="cursor-pointer rounded-[10px] border px-3 py-1.5 text-[13px] font-medium text-[var(--ink)] hover:bg-[var(--bench)]"
          >
            {copied === "link" ? "Link copied" : copied === "__error__" ? "Copy failed" : "Copy link"}
          </button>
        </div>
      </div>

      {shelf.length === 0 ? (
        <p className="text-[13px] text-[var(--muted)]">
          Nothing saved yet. Save a palette and it stays here, in this browser
          only — no account, nothing leaves the device.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {shelf.map((s) => {
            const colors = openSaved(s);
            return (
              <li
                key={s.id}
                className="flex flex-wrap items-center gap-3 rounded-[12px] px-2 py-2 hover:bg-[var(--bench)]"
              >
                <span className="flex shrink-0 gap-px overflow-hidden rounded-[6px]">
                  {(colors ?? []).map((c, i) => (
                    <span key={i} className="h-8 w-6" style={{ background: toCss(c.color) }} />
                  ))}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-[var(--ink)]">
                    {s.name}
                  </span>
                  <span className="block text-[11px] text-[var(--muted)]">
                    {new Date(s.savedAt).toLocaleDateString()}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1 text-[12px]">
                  <Action label="Open" onClick={() => colors && onOpen(colors, s.name)} disabled={!colors} />
                  <Action label="Duplicate" onClick={() => duplicate(s)} disabled={!colors} />
                  <Action
                    label={copied === s.id ? "Copied" : "Share"}
                    onClick={() => copy(savedLink(s), s.id)}
                  />
                  <Action label="Delete" onClick={() => remove(s.id)} />
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Action({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="cursor-pointer rounded-[8px] px-2 py-1 text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)] disabled:cursor-default disabled:opacity-40"
    >
      {label}
    </button>
  );
}
