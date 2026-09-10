import { useEffect, useRef, useState } from "react";
import {
  type Oklch,
  clampToGamut,
  fromHex,
  toCss,
  toHex,
} from "../lib/color.ts";
import type { Origin } from "../lib/harmony.ts";
import { kmeans, pixelsFrom } from "../lib/extract.ts";
import { LIBRARY, type LibraryPalette, parseColors, searchMood } from "../lib/library.ts";

type Result =
  | { kind: "idle" }
  | { kind: "working" }
  | { kind: "colors"; colors: Oklch[]; from: string }
  | { kind: "moods"; palettes: LibraryPalette[] }
  | { kind: "miss"; query: string }
  | { kind: "error"; message: string };

const EXAMPLES = ["calm and coastal", "warm earthy bakery", "neon night", "minimal editorial"];

/**
 * Where inspiration comes in — the left half of the workbench. Photo, mood, or
 * one colour; the box reads what it was given and works out which, so nobody
 * has to pick a mode first. A single vertical column: the controls up top, and
 * whatever came back (an image's colours, matching moods, or the starter shelf)
 * flowing underneath, so the panel is never a void waiting for input.
 */
export function CreationDesk({
  onUse,
  onAdd,
}: {
  onUse: (colors: Oklch[], origin: Origin, from?: string) => void;
  onAdd: (color: Oklch) => void;
}) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<Result>({ kind: "idle" });
  const [browsing, setBrowsing] = useState(false);
  const [over, setOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [seed, setSeed] = useState("#d96c8b");
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  function read(value: string) {
    setText(value);
    setBrowsing(false);
    if (value.trim() === "") return setResult({ kind: "idle" });

    const colors = parseColors(value);
    if (colors.length > 0) return setResult({ kind: "colors", colors, from: "text" });

    const palettes = searchMood(value);
    setResult(palettes.length > 0 ? { kind: "moods", palettes } : { kind: "miss", query: value });
  }

  async function readImage(image: File | undefined) {
    if (!image) return;
    if (!image.type.startsWith("image/"))
      return setResult({ kind: "error", message: "That file isn't an image." });

    setText("");
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(image);
    });
    setResult({ kind: "working" });
    try {
      const points = await pixelsFrom(image);
      if (points.length === 0)
        return setResult({ kind: "error", message: "Every pixel in that image is transparent." });
      setResult({ kind: "colors", colors: kmeans(points, 6).map(clampToGamut), from: "image" });
    } catch {
      setResult({ kind: "error", message: "Couldn't read that image. Try a PNG or JPEG." });
    }
  }

  // Idle shows a handful of the shelf as a way in; "Browse all" opens the rest.
  const shelf = browsing
    ? LIBRARY
    : result.kind === "moods"
      ? result.palettes
      : result.kind === "idle"
        ? LIBRARY.slice(0, 4)
        : null;

  return (
    <div aria-label="Start a palette" className="flex min-w-0 flex-col">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-[19px] font-bold tracking-[-0.02em] sm:text-[21px]">
          What are we making today?
        </h2>
        <button
          onClick={() => {
            setBrowsing((b) => !b);
            setText("");
            setResult({ kind: "idle" });
          }}
          className="cursor-pointer text-[12px] text-[var(--muted)] underline underline-offset-2 hover:text-[var(--ink)]"
        >
          {browsing ? "Close" : `Browse all ${LIBRARY.length}`}
        </button>
      </div>

      <textarea
        value={text}
        onChange={(e) => read(e.target.value)}
        rows={3}
        spellCheck={false}
        aria-label="Paste colours, or describe a mood"
        placeholder="Describe a feeling — “soft pink birthday brunch” — or paste hexes, or a CSS block."
        className="w-full resize-none rounded-[14px] border bg-[var(--bench)] px-4 py-3 text-[15px] leading-[1.5] text-[var(--ink)] outline-none placeholder:text-[var(--muted)]"
      />

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {EXAMPLES.map((e) => (
          <button
            key={e}
            onClick={() => read(e)}
            className="cursor-pointer rounded-full border px-2.5 py-1 text-[12px] text-[var(--muted)] transition-colors duration-150 hover:text-[var(--ink)]"
          >
            {e}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          ref={file}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => void readImage(e.target.files?.[0])}
        />
        <button
          onClick={() => file.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            void readImage(e.dataTransfer.files?.[0]);
          }}
          className="flex cursor-pointer items-center gap-1.5 rounded-full border border-dashed px-3 py-1.5 text-[13px] transition-colors duration-150"
          style={{
            borderColor: over ? "var(--accent)" : "var(--line)",
            color: over ? "var(--ink)" : "var(--muted)",
          }}
        >
          {result.kind === "working" ? "Clustering pixels…" : "Drop or choose an image"}
        </button>

        {/* One colour, built into a whole palette. A native picker so the OS
            eyedropper and recent-colours come for free. */}
        <label
          className="flex cursor-pointer items-center gap-2 rounded-full border px-2.5 py-1 text-[13px] text-[var(--muted)] hover:text-[var(--ink)]"
          title="Start from one colour"
        >
          <span className="h-4 w-4 rounded-full border" style={{ background: seed }} />
          Start from a colour
          <input
            type="color"
            value={seed}
            onChange={(e) => {
              setSeed(e.target.value);
              const c = fromHex(e.target.value);
              if (c) onUse([c], "user", "your colour, built around");
            }}
            aria-label="Seed colour"
            className="sr-only"
          />
        </label>
      </div>

      <div className="mt-4 min-h-0 flex-1">
        {result.kind === "error" && (
          <p role="alert" className="text-[13px] text-[var(--ink)]">
            {result.message}
          </p>
        )}

        {result.kind === "miss" && (
          <p className="text-[13px] text-[var(--muted)]">
            Nothing on the shelf matches “{result.query}”. Try a feeling
            (<em>calm</em>, <em>bold</em>), a place (<em>forest</em>,{" "}
            <em>desert</em>) or a season — or paste a hex.
          </p>
        )}

        {result.kind === "colors" && (
          <div>
            <div className="flex gap-2">
              {preview && result.from === "image" && (
                <img
                  src={preview}
                  alt="Your uploaded image"
                  className="h-[72px] w-[72px] shrink-0 rounded-[10px] object-cover"
                />
              )}
              <div className="flex flex-1 gap-1 rounded-[12px] bg-[var(--bench)] p-1">
                {result.colors.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => onAdd(c)}
                    title={`Add ${toHex(c)} to the palette`}
                    aria-label={`Add ${toHex(c)} to the palette`}
                    className="h-[72px] flex-1 cursor-pointer rounded-[8px] transition-transform duration-200 ease-[var(--ease-out-quint)] hover:-translate-y-0.5"
                    style={{ background: toCss(c) }}
                  />
                ))}
              </div>
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <button
                onClick={() =>
                  onUse(
                    result.colors,
                    "user",
                    result.from === "image" ? "clustered from your image" : "your colours, built around",
                  )
                }
                className="cursor-pointer rounded-[9px] px-3 py-1.5 text-[13px] font-medium"
                style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
              >
                Build around {result.colors.length === 1 ? "it" : "these"}
              </button>
              <p className="text-[12px] text-[var(--muted)]">
                {result.from === "image"
                  ? "Clustered in your browser — the image never left the device."
                  : `${result.colors.length} colour${result.colors.length === 1 ? "" : "s"} read.`}{" "}
                Or click one to add it on its own.
              </p>
            </div>
          </div>
        )}

        {shelf && (
          <>
            {result.kind === "idle" && !browsing && (
              <p className="mb-2 text-[12px] text-[var(--muted)]">
                Or start from one of these
              </p>
            )}
            <div className={`-mr-1 pr-1 ${browsing || result.kind === "moods" ? "max-h-[240px] overflow-y-auto" : ""}`}>
              <ul className="flex flex-col gap-1">
                {shelf.map((p) => (
                  <li key={p.name}>
                    <button
                      onClick={() =>
                        onUse(p.colors.map((h) => fromHex(h)!), "library", p.name.toLowerCase())
                      }
                      className="flex w-full cursor-pointer items-center gap-3 rounded-[10px] px-2 py-1.5 text-left transition-colors duration-150 hover:bg-[var(--bench)]"
                    >
                      <span className="flex shrink-0 gap-px overflow-hidden rounded-[6px]">
                        {p.colors.map((hex) => (
                          <span key={hex} className="h-7 w-5" style={{ background: hex }} />
                        ))}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-medium text-[var(--ink)]">
                          {p.name}
                        </span>
                        <span className="block truncate text-[12px] text-[var(--muted)]">
                          {p.tags.slice(0, 3).join(" · ")}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
