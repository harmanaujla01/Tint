import { type Vision, VISIONS, feMatrix, MATRICES } from "../lib/vision.ts";

/**
 * The three transforms, declared once as SVG filters the browser can apply to
 * the whole studio in one composite.
 *
 * Doing it in CSS rather than mapping every colour in JS is not just cheaper —
 * it is the more honest simulation. A person with deuteranopia does not see a
 * page whose text colours were solved for deuteranopic surfaces; they see the
 * page as it actually shipped, filtered by their own eye. Deriving ink from
 * simulated colours would be solving for a colour that is on nobody's screen.
 * So `deriveInk` keeps working on the real palette, and the filter goes over
 * the top of the finished render, exactly where the eye goes.
 */
export function VisionFilters() {
  return (
    <svg aria-hidden className="pointer-events-none absolute size-0" focusable="false">
      <defs>
        {(Object.keys(MATRICES) as (keyof typeof MATRICES)[]).map((id) => (
          <filter key={id} id={`cvd-${id}`} colorInterpolationFilters="linearRGB">
            <feColorMatrix type="matrix" values={feMatrix(MATRICES[id])} />
          </filter>
        ))}
      </defs>
    </svg>
  );
}

/** The CSS `filter` value for a mode, or undefined for unsimulated. */
export const visionFilter = (v: Vision) =>
  v === "normal" ? undefined : `url(#cvd-${v})`;

export function VisionControl({
  vision,
  onChange,
  onDescribe,
}: {
  vision: Vision;
  onChange: (v: Vision) => void;
  onDescribe: (text: string | null) => void;
}) {
  return (
    <div
      className="flex shrink-0 gap-0.5 rounded-[9px] bg-[var(--bench)] p-0.5"
      role="radiogroup"
      aria-label="Simulate colour vision"
      onMouseLeave={() => onDescribe(null)}
    >
      {VISIONS.map((v) => (
        <button
          key={v.id}
          role="radio"
          aria-checked={vision === v.id}
          onClick={() => onChange(v.id)}
          onMouseEnter={() => onDescribe(`${v.label} — ${v.note}`)}
          onFocus={() => onDescribe(`${v.label} — ${v.note}`)}
          title={`${v.label} — ${v.note}`}
          className="cursor-pointer rounded-[7px] px-2 py-1 text-[11.5px] font-medium transition-colors duration-150"
          style={{
            background: vision === v.id ? "var(--surface)" : "transparent",
            color: vision === v.id ? "var(--ink)" : "var(--muted)",
          }}
        >
          {v.short}
        </button>
      ))}
    </div>
  );
}
