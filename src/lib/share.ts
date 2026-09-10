import { fromHex, toHex } from "./color.ts";
import { type Palette, swatch } from "./harmony.ts";

/**
 * The palette, in the address bar.
 *
 * This was deliberately not built while Tint was a tool, on the grounds that
 * it adds a state-sync loop for very little. That reasoning was right then and
 * is wrong now: the thing is a showcase, and a person who makes something they
 * like in it currently cannot show it to anybody. Sharing *is* the
 * distribution.
 *
 * The format is meant to be read: `#/studio?p=fff1f3-!f4a9be-7a4a5c&n=blush`.
 * A leading `!` marks a locked colour, because lock state is part of what you
 * were doing and losing it makes a shared link a worse palette than the one
 * that was sent. Everything else — selection, simulation, dark, the critique —
 * is a view of the palette rather than the palette, and is left out.
 */

const LOCK = "!";

export function encode(palette: Palette, name: string): string {
  const p = palette
    .map((s) => `${s.locked ? LOCK : ""}${toHex(s.color).slice(1)}`)
    .join("-");
  const n = name.trim();
  return `p=${p}${n ? `&n=${encodeURIComponent(n)}` : ""}`;
}

export type Shared = { palette: Palette; name: string | null };

/**
 * Read a palette out of a hash. Returns null for anything it does not fully
 * understand — a half-parsed palette is worse than none, because the user
 * would have no way to tell which colours were dropped.
 */
export function decode(hash: string): Shared | null {
  const q = hash.indexOf("?");
  if (q < 0) return null;
  const params = new URLSearchParams(hash.slice(q + 1));
  const p = params.get("p");
  if (!p) return null;

  const palette: Palette = [];
  for (const token of p.split("-")) {
    const locked = token.startsWith(LOCK);
    const color = fromHex(locked ? token.slice(1) : token);
    if (!color) return null;
    // Anything arriving from a link is somebody's decision, not the
    // generator's, so it comes in as theirs — the same rule a paste follows.
    palette.push(swatch(color, "user", locked));
  }
  if (palette.length < 2) return null;

  const name = params.get("n");
  return { palette, name: name && name.trim() ? name : null };
}

/**
 * Put the palette in the address bar without touching history or firing
 * `hashchange` — the route hook listens for that event, and pushing here
 * would both spam the back button and re-render the app on every keystroke
 * in the name field.
 */
export function publish(palette: Palette, name: string) {
  const next = `#/studio?${encode(palette, name)}`;
  if (window.location.hash !== next)
    window.history.replaceState(null, "", next);
}
