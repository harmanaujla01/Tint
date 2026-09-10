import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type Oklch, contrast, fromHex, toCss } from "./lib/color.ts";
import { applyChrome, buildChrome } from "./lib/palette.ts";
import {
  CANDIDATES,
  type Origin,
  type Palette,
  critique,
  generate,
  orderByLightness,
  paletteRoles,
  search,
  swatch,
} from "./lib/harmony.ts";
import { LIBRARY } from "./lib/library.ts";
import { useReducedMotion, typing } from "./lib/motion.ts";
import { useReplay } from "./lib/replay.ts";
import { decode, encode, publish } from "./lib/share.ts";
import { type Vision, review } from "./lib/vision.ts";
import { StatusContext, useStatusLine } from "./lib/status.ts";
import { PaletteBar } from "./components/PaletteBar.tsx";
import { Reasoning } from "./components/Reasoning.tsx";
import { RailButton, StatusBar } from "./components/StatusBar.tsx";
import {
  VisionControl,
  VisionFilters,
  visionFilter,
} from "./components/VisionControl.tsx";
import { StudioHeader } from "./components/StudioHeader.tsx";
import { CreationDesk } from "./components/CreationDesk.tsx";
import { Directions } from "./components/Directions.tsx";
import { MakeItReal } from "./components/MakeItReal.tsx";
import { GoodToGo } from "./components/GoodToGo.tsx";
import { Shelf } from "./components/Shelf.tsx";
import { CritiqueTile } from "./components/CritiqueTile.tsx";
import { RampTile } from "./components/RampTile.tsx";
import { MatrixTile } from "./components/MatrixTile.tsx";
import { ExportTile } from "./components/ExportTile.tsx";
import { Present } from "./components/Present.tsx";
import { CaseStudy } from "./CaseStudy.tsx";

/** A fixed opening palette, so the first frame is always the good one. */
const OPENING = LIBRARY[0];

function useHashRoute() {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return hash;
}

/** Whatever arrived in the address bar, read once, before the first paint. */
const SHARED = typeof window === "undefined" ? null : decode(window.location.hash);

export default function App() {
  const [palette, setPalette] = useState<Palette>(
    () =>
      SHARED?.palette ??
      OPENING.colors.map((hex) => swatch(fromHex(hex)!, "library", false)),
  );
  const [name, setName] = useState(SHARED?.name ?? OPENING.name);
  const [selected, setSelected] = useState(2);
  const [highlight, setHighlight] = useState<number[]>([]);
  /**
   * Why the palette in the bar looks the way it does. Null once the user has
   * edited it by hand, because at that point the generator's reasoning is no
   * longer an honest description of what is on screen.
   */
  const [reason, setReason] = useState<string | null>(
    SHARED ? "opened from a link" : OPENING.name.toLowerCase(),
  );
  /**
   * True once the row has been dragged into an order by hand. Invariant 9 says
   * nothing of the user's changes without a click; silently sorting their
   * arrangement back into lightness order the next time they add a colour
   * would break it just as surely as editing a swatch would.
   */
  const [byHand, setByHand] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const [vision, setVision] = useState<Vision>("normal");
  const reduced = useReducedMotion();
  const bento = useRef<HTMLElement>(null);
  const studioRef = useRef<HTMLDivElement>(null);
  const [dark, setDark] = useState(false);
  const route = useHashRoute();
  const studio = route.startsWith("#/studio");

  const colors = useMemo(() => palette.map((s) => s.color), [palette]);
  const verdict = useMemo(
    () => critique(colors, palette.map((s) => s.locked)),
    [colors, palette],
  );
  const roles = useMemo(() => paletteRoles(colors), [colors]);

  // The interface wears the palette. This is the one effect the whole
  // architecture hangs off: change a colour, and every surface, border and
  // piece of text in the app is re-solved from it.
  // Dark is a studio mode, not a site theme: the story page is a printed
  // artefact and stays on paper. Leaving the studio therefore hands the light
  // chrome back rather than dragging a dark page along with it.
  const chrome = useMemo(
    () => buildChrome(roles.accent, dark && studio),
    [roles.accent, dark, studio],
  );
  useEffect(() => applyChrome(chrome), [chrome]);

  // Crossing between the story and the tool starts at the top. The hash route
  // never touches the scroll position by itself, so opening the studio from the
  // CTA at the foot of a five-screen page landed you at the foot of the studio.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [studio]);

  // `f` for full screen, the one shortcut the studio adds beyond space.
  useEffect(() => {
    if (!studio) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "f" && e.key !== "F") return;
      if (e.metaKey || e.ctrlKey || e.altKey || typing(e.target)) return;
      e.preventDefault();
      setPresenting((p) => !p);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [studio]);

  /**
   * A link pasted into the address bar of an already-open Tint.
   *
   * `SHARED` only reads the hash once, at module load, which covers opening a
   * link in a fresh tab and nothing else — paste one over a running studio and
   * the address bar said one thing while the bar showed another. Our own
   * writes go through `replaceState` and never fire `hashchange`, so anything
   * that reaches this effect came from outside and is meant to be honoured.
   * The guard is on the encoded form rather than object identity, so
   * re-arriving at the palette already on screen is a no-op.
   */
  useEffect(() => {
    const shared = decode(route);
    if (!shared) return;
    if (encode(shared.palette, shared.name ?? name) === encode(palette, name)) return;
    setPalette(shared.palette);
    if (shared.name) setName(shared.name);
    setReason("opened from a link");
    // Somebody arranged these in this order. That is a decision, not an
    // accident of lightness, and adding a colour must not undo it.
    setByHand(true);
    setHighlight([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only ever on an external hash change
  }, [route]);

  // The palette goes in the address bar so it can be sent to somebody. Written
  // with replaceState: pushing would fill the back button with keystrokes, and
  // it would fire `hashchange`, which is what the route hook is listening to.
  useEffect(() => {
    if (studio) publish(palette, name);
  }, [studio, palette, name]);

  // What the status line says when nothing is being pointed at. Not filler:
  // it is the one measurement that is true of the whole page.
  /**
   * What the current simulation costs this palette. Two separate failures:
   * colours that merge into one, and pairs whose contrast genuinely falls
   * below AA as seen. The second one was assumed not to happen — dichromacy
   * is supposed to leave luminance alone — and it does happen, by up to 57%
   * on reds under protanopia, so the line says so rather than reassuring.
   */
  const seen = useMemo(() => review(colors, vision), [colors, vision]);

  const idle =
    vision === "normal"
      ? `ink ${toCss(chrome.muted)} · ${contrast(chrome.muted, chrome.bg).toFixed(2)}:1 on the page ground · derived, never typed`
      : [
          vision,
          seen.collapsed > 0
            ? `${seen.collapsed} pair${seen.collapsed === 1 ? "" : "s"} now indistinguishable`
            : null,
          seen.dropped > 0
            ? `${seen.dropped} pair${seen.dropped === 1 ? " drops" : "s drop"} below AA as it is seen`
            : null,
          seen.collapsed === 0 && seen.dropped === 0
            ? `nothing merges, nothing drops out of AA — this palette survives it`
            : null,
          `ratios move up to ${(seen.drift * 100).toFixed(0)}%`,
        ]
          .filter(Boolean)
          .join(" · ");

  const [line, say] = useStatusLine(idle);
  const [frame, play] = useReplay();

  /**
   * Once per session, not once per load. The story page's entry sequence runs
   * every time because it is theatre; this is polish, and polish you cannot
   * skip is an obstacle by the third visit.
   */
  const [arriving] = useState(() => {
    if (reduced) return false;
    try {
      if (sessionStorage.getItem("tint:arrived")) return false;
      sessionStorage.setItem("tint:arrived", "1");
    } catch {
      return false; // private mode, or storage refused. Not worth a fallback.
    }
    return true;
  });

  // Removing swatches must never leave the selection pointing off the end.
  const active = Math.min(selected, palette.length - 1);

  /**
   * The winner is found synchronously and the app's state is correct before
   * anything animates. `play` then replays the trail the search left behind —
   * real candidates, real scores — over the top of a palette that has already
   * landed. Pressing space again interrupts it rather than queueing.
   */
  /**
   * The repaint ripple, restarted on every palette change.
   *
   * Removing and re-adding the class with a forced reflow between is the only
   * way to replay a CSS animation on an element that never unmounts — React
   * will not re-trigger one by re-rendering the same class. The first change is
   * skipped so this does not fight the arrival stagger over the same tiles.
   */
  const settled = useRef(false);
  useEffect(() => {
    const el = bento.current;
    if (!el || reduced) return;
    if (!settled.current) {
      settled.current = true;
      if (arriving) {
        el.classList.add("bento-arrive");
        return;
      }
    }
    el.classList.remove("bento-arrive", "bento-repaint");
    void el.offsetWidth;
    el.classList.add("bento-repaint");
  }, [colors, reduced, arriving]);

  /**
   * The presentation sections rise in as they are scrolled to — the same
   * reveal the story page uses, so entering the studio feels like the same
   * colour world unfolding rather than a dashboard painting all at once.
   * Armed by JS, so the default state is fully visible: reduced motion, a
   * headless render or a blocked script all ship the finished content. The
   * workbench and the palette are never armed — the tool has to be immediate.
   */
  useEffect(() => {
    if (!studio || reduced) return;
    const nodes = studioRef.current?.querySelectorAll<HTMLElement>("[data-reveal]");
    if (!nodes || nodes.length === 0) return;
    nodes.forEach((n) => n.classList.add("reveal-armed"));
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("reveal-in");
            io.unobserve(e.target);
          }
        }),
      { rootMargin: "0px 0px -12% 0px" },
    );
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [studio, reduced]);

  const onGenerate = useCallback(() => {
    const found = search(palette, palette.length);
    setPalette(found.palette);
    setReason(
      `${CANDIDATES} candidates · scored · kept #${found.kept + 1} — ${found.label}`,
    );
    play(found);
  }, [palette, play]);

  /** Replace the whole palette with what the intake box came back with. */
  const onUse = useCallback((next: Oklch[], origin: Origin, from?: string) => {
    const locked = origin === "user";
    const built = orderByLightness(next.map((c) => swatch(c, origin, locked)));
    // Fewer colours than a palette needs: keep every one of theirs, locked,
    // and let the generator build the rest around them.
    setPalette(built.length >= 4 ? built : generate(built, 5));
    setHighlight([]);
    setReason(from ?? (origin === "user" ? "yours, built around" : null));
  }, []);

  /** Add one colour without disturbing anything already there. */
  const onAdd = useCallback(
    (color: Oklch) => {
      setPalette((p) => {
        const next = [...p, swatch(color, "user")];
        return byHand ? next : orderByLightness(next);
      });
      setReason(null);
    },
    [byHand],
  );

  const onEdit = useCallback((next: Palette) => {
    setPalette(next);
    setReason(null);
  }, []);

  /** Adopt a whole direction the user picked from the three on offer. */
  const onChoose = useCallback((next: Palette, label: string) => {
    setPalette(next);
    setReason(label);
    setHighlight([]);
    setByHand(false);
  }, []);

  /** Reopen a palette from the shelf, name and arrangement intact. */
  const onOpen = useCallback((next: Palette, savedName: string) => {
    setPalette(next);
    setName(savedName);
    setReason(savedName.toLowerCase());
    setHighlight([]);
    // A saved palette is an arrangement somebody kept — don't re-sort it.
    setByHand(true);
  }, []);

  if (!studio) return <CaseStudy palette={palette} onUse={onUse} />;

  return (
    <StatusContext value={say}>
      <VisionFilters />
      {/* The filter is only ever applied when a simulation is on: a `filter`
          declares a containing block, and one that is always there would
          change what `position: fixed` means for the rest of the page. */}
      <div
        ref={studioRef}
        className="flex min-h-dvh flex-col px-[6px] pb-[6px]"
        style={{ filter: visionFilter(vision) }}
      >
        <StudioHeader name={name} onName={setName} />

        {/* The workbench: what you are making, and what you are making it from,
            in one field. The controls take the narrow left column; the palette
            — the thing everything else is derived from — takes the wide right
            and is the largest object on the page. */}
        <section
          aria-label="Workbench"
          className="mx-auto mt-[6px] w-full max-w-[1440px] rounded-[22px] bg-[var(--surface)] p-5 sm:p-7"
        >
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:gap-9">
            <CreationDesk onUse={onUse} onAdd={onAdd} />
            <div className="flex min-w-0 flex-col gap-[6px]">
              <PaletteBar
                palette={palette}
                onChange={onEdit}
                selected={active}
                onSelect={setSelected}
                onGenerate={onGenerate}
                onReorder={() => setByHand(true)}
                onHover={setHighlight}
                highlight={highlight}
                preview={frame?.colors}
                arriving={arriving}
              />
              <Reasoning
                label={reason}
                colors={colors}
                locked={palette.filter((s) => s.locked).length}
                frame={frame}
              />
            </div>
          </div>
        </section>

        <div data-reveal>
          <Directions palette={palette} onChoose={onChoose} />
        </div>

        <div data-reveal>
          <MakeItReal
            palette={palette}
            name={name}
            dark={dark}
            highlight={highlight}
          />
        </div>

        <div data-reveal>
          <GoodToGo palette={palette} critique={verdict} onChange={onEdit} dark={dark} />
        </div>

        <div data-reveal>
          <Shelf palette={palette} name={name} onOpen={onOpen} />
        </div>

        {/* Everything a colour tool has to prove, folded away until asked for.
            The first layer answers "is this any good"; this answers "show me
            the numbers". Native <details>, so the state is the browser's and
            there is no toggle to keep in sync. */}
        <details className="inspect mx-auto mt-[6px] w-full max-w-[1440px]">
          <summary className="inspect-summary">
            <span className="flex items-baseline gap-2.5">
              <span className="text-[14px] font-medium text-[var(--ink)]">Inspect</span>
              <span className="text-[12px] text-[var(--muted)]">
                contrast · scale · critique · exports
              </span>
            </span>
            {/* The proof, where it belongs: not a greeting, a footnote you can
                check. */}
            <span className="tabular text-[11.5px] tracking-[0.02em] text-[var(--muted)]">
              OKLCH · WCAG · no colour library
            </span>
          </summary>
          <main
            ref={bento}
            className="bento mt-[6px]"
          >
          <MatrixTile
            palette={palette}
            highlight={highlight}
            vision={vision}
            seen={seen}
          />
          <CritiqueTile
            palette={palette}
            critique={verdict}
            onChange={onEdit}
            onHover={setHighlight}
            highlight={highlight}
          />
          <RampTile color={palette[active].color} />
          <ExportTile colors={colors} name={name} />
          </main>
        </details>

        <StatusBar line={line} idle={idle}>
          <VisionControl vision={vision} onChange={setVision} onDescribe={say} />
          <RailButton
            active={presenting}
            title="Show the palette full screen (f)"
            onClick={() => setPresenting(true)}
            onDescribe={say}
            describe="full screen, the same geometry the story page's pinned strip scrubs through — esc to come back"
          >
            Present
          </RailButton>
          <RailButton
            active={dark}
            title="Solve this palette against a dark ground"
            onClick={() => setDark((d) => !d)}
            onDescribe={say}
            describe={
              dark
                ? "the same palette solved the other way up — surfaces from its dark end, text derived upward, every ratio recomputed"
                : "solve this palette against a dark ground instead, and see whether it still covers itself"
            }
          >
            {/* Labelled with what it turns on, not with what is currently on.
                A toggle reading "Light" while `aria-pressed` is false announces
                as "light, not pressed", which is the opposite of the truth. */}
            Dark
          </RailButton>
        </StatusBar>
      </div>

      {/* Outside the filtered box on purpose: an ancestor with a `filter`
          becomes the containing block for `position: fixed`, so an overlay
          nested inside it would be pinned to the page rather than the
          viewport. It carries the same filter itself instead. */}
      {presenting && (
        <Present
          colors={colors}
          onClose={() => setPresenting(false)}
          filter={visionFilter(vision)}
        />
      )}
    </StatusContext>
  );
}
