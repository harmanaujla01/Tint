import { useState } from "react";
import type { Oklch } from "../lib/color.ts";
import { type Format, exportTokens } from "../lib/palette.ts";
import { useCopy } from "../lib/useCopy.ts";
import { Tile } from "./Tile.tsx";

const FORMATS: { id: Format; label: string }[] = [
  { id: "css", label: "CSS" },
  { id: "tailwind", label: "Tailwind" },
  { id: "json", label: "Tokens" },
];

export function ExportTile({ colors, name }: { colors: Oklch[]; name: string }) {
  const [format, setFormat] = useState<Format>("css");
  const [scales, setScales] = useState(false);
  const { copied, copy } = useCopy();
  const code = exportTokens(name, colors, format, scales);

  return (
    <Tile
      label="Export"
      aside={
        <div
          className="flex gap-0.5 rounded-[9px] bg-[var(--bench)] p-0.5"
          role="tablist"
          aria-label="Export format"
        >
          {FORMATS.map((f) => (
            <button
              key={f.id}
              role="tab"
              aria-selected={format === f.id}
              onClick={() => setFormat(f.id)}
              className="cursor-pointer rounded-[7px] px-2.5 py-1 text-[12px] font-medium transition-colors duration-150"
              style={{
                background: format === f.id ? "var(--surface)" : "transparent",
                color: format === f.id ? "var(--ink)" : "var(--muted)",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      }
      className="min-h-0"
    >
      <pre
        className="tabular max-h-[200px] flex-1 overflow-auto rounded-[12px] bg-[var(--bench)] p-4 text-[12px] leading-[1.7] text-[var(--ink)]"
        tabIndex={0}
        aria-label={`${format} output`}
      >
        {code}
      </pre>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          onClick={() => void copy(code, format)}
          className="cursor-pointer rounded-[10px] px-4 py-2.5 text-[14px] font-medium transition-transform duration-200 ease-[var(--ease-out-quint)] active:scale-[0.985]"
          style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
        >
          {copied === "__error__"
            ? "Copy blocked by the browser"
            : copied === format
              ? "Copied"
              : `Copy ${FORMATS.find((f) => f.id === format)!.label}`}
        </button>
        <label className="flex cursor-pointer items-center gap-2 text-[13px] text-[var(--muted)]">
          <input
            type="checkbox"
            checked={scales}
            onChange={(e) => setScales(e.target.checked)}
            className="size-3.5 accent-[var(--accent)]"
          />
          11-step scale for each
        </label>
      </div>
    </Tile>
  );
}
