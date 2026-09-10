import type { Palette } from "./harmony.ts";
import { decode, encode } from "./share.ts";

/**
 * The Palette Shelf: a browser-only collection of saved palettes. No account,
 * no server — the same privacy stance the rest of Tint takes. A saved palette
 * *is* its share link: we store the exact `encode` string the address bar
 * uses, so saving, sharing and reopening are all one format and `share.ts`
 * stays the single source of truth for what a palette serialises to.
 */

const KEY = "tint:shelf";

export type Saved = { id: string; name: string; hash: string; savedAt: number };

const isSaved = (x: unknown): x is Saved =>
  typeof x === "object" &&
  x !== null &&
  typeof (x as Saved).id === "string" &&
  typeof (x as Saved).name === "string" &&
  typeof (x as Saved).hash === "string";

export function loadShelf(): Saved[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isSaved) : [];
  } catch {
    return []; // private mode, or corrupt JSON. An empty shelf, not a crash.
  }
}

export function saveShelf(list: Saved[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Storage blocked or full. Nothing better to do than drop the write.
  }
}

const newId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const makeSaved = (palette: Palette, name: string): Saved => ({
  id: newId(),
  name: name.trim() || "Untitled",
  hash: encode(palette, name),
  savedAt: Date.now(),
});

/** The palette a saved entry stands for, or null if its hash no longer parses. */
export const openSaved = (s: Saved): Palette | null =>
  decode(`?${s.hash}`)?.palette ?? null;

/** The full link that reopens a saved palette in a fresh Tint. */
export const savedLink = (s: Saved): string =>
  `${location.origin}${location.pathname}#/studio?${s.hash}`;
