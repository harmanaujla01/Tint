import type { ReactNode } from "react";
import { useMemo } from "react";
import { type Oklch, toCss } from "../lib/color.ts";
import { wallField } from "../lib/palette.ts";
import { heightFor, usePinnedTrack } from "../lib/track.ts";

export type Chapter = {
  id: string;
  /** "01".."05" — the number is content, not decoration: these are ordered. */
  index: string;
  title: string;
  room: ReactNode;
};

/**
 * The horizontal installation.
 *
 * Every room is in the document, in order, whether or not the track is pinned:
 * the page reads correctly with no JavaScript, in a screen reader, and to
 * find-on-page. The only thing the pinning changes is that they are laid out
 * side by side and moved past you instead of stacked and scrolled through.
 *
 * Below the desktop breakpoint, or under reduced motion, none of this runs and
 * the `fallback` is rendered instead — the same narrative as vertical scenes.
 * A cramped sideways track on a tablet is worse than an honest column.
 */
export function CaseTrack({
  chapters,
  colors,
  ground,
  fallback,
}: {
  chapters: Chapter[];
  /** The live palette, which the track is literally built out of. */
  colors: Oklch[];
  /** The page's own ground. The far wall is built at exactly its lightness. */
  ground: Oklch;
  fallback: ReactNode;
}) {
  const ids = useMemo(() => chapters.map((c) => c.id), [chapters]);
  const { section, rail, far, chapter, pinned, jumpTo } = usePinnedTrack(chapters.length, ids);

  if (!pinned) return <>{fallback}</>;

  return (
    <section
      ref={section}
      id="proof"
      aria-label="The proof, in five rooms"
      className="relative"
      style={{ height: `${heightFor(chapters.length)}vh` }}
    >
      <div className="sticky top-0 h-dvh overflow-hidden">
        {/*
          The far wall.

          The rooms are not on a blank page, they are inside the palette: one
          full-height field per room, and a full-strength column of the real
          colour standing at every boundary. It travels at `PARALLAX` of the
          rooms' speed, and that difference is the whole reason the track has
          any depth — one plane moving at one speed is a slide deck on its side,
          however well it is eased.

          The fields are `wallField`: the ground wearing the colour's hue, and
          never darker than the ground. The first version mixed 13% of each
          colour into the ground, which moved the lightness with it and put
          `--muted` at 3.76:1 on the darkest field — an AA failure on the page
          whose entire argument is contrast. Hue is free; lightness is the thing
          every ink on top was solved against.

          The columns are the exception, and they are allowed to be the real
          colour for one reason: nothing is ever written on them.
        */}
        <div
          ref={far}
          aria-hidden
          className="absolute inset-y-0 left-0 flex will-change-transform"
          style={{ width: `${chapters.length * 100}vw` }}
        >
          {chapters.map((c, i) => {
            const colour = colors[i % colors.length];
            return (
              <div
                key={c.id}
                className="relative h-full flex-1"
                style={{
                  background: colour ? toCss(wallField(ground, colour)) : "var(--bg)",
                }}
              >
                {/* The rule above this used to also print the hex sideways
                    next to the column — a second, dimmer copy of a label the
                    room in front is usually already showing, landing wherever
                    the parallax happened to put it that frame. The column
                    reads as the same rule everywhere else in this system:
                    nothing is ever written on the thing being judged. */}
                {i > 0 && colour && (
                  <span
                    className="absolute inset-y-0 left-0 w-[7px]"
                    style={{ background: toCss(colour) }}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div ref={rail} className="relative flex h-full will-change-transform">
          {chapters.map((c) => (
            <article key={c.id} id={c.id} className="relative h-full w-screen shrink-0">
              {c.room}
            </article>
          ))}
        </div>

        {/* Outside the thing that moves, so it holds still while the rooms
            travel past it. It lives inside the sticky layer, which is what
            makes it disappear by itself the moment the track releases — there
            is no "hide the rail now" to get wrong. */}
        <nav
          aria-label="Chapters"
          className="absolute inset-x-0 bottom-0 z-10 px-8 pb-6 sm:px-12"
        >
          <div className="mx-auto flex max-w-[1500px] items-baseline justify-between gap-8">
            <ol className="tabular flex items-baseline gap-1">
              {chapters.map((c, i) => (
                <li key={c.id}>
                  <a
                    href={`#${c.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      jumpTo(i);
                    }}
                    aria-current={i === chapter ? "true" : undefined}
                    className="block rounded-full px-2 py-1 text-[12px] transition-colors duration-300"
                    style={{ color: i === chapter ? "var(--ink)" : "var(--muted)" }}
                  >
                    {c.index}
                    <span className="sr-only"> — {c.title}</span>
                  </a>
                </li>
              ))}
            </ol>
            <p
              aria-hidden
              className="min-w-0 truncate text-[12.5px] tracking-[0.01em] text-[var(--muted)]"
            >
              {chapters[chapter].title}
            </p>
          </div>
          <div className="mx-auto mt-3 h-px max-w-[1500px] bg-[var(--line)]">
            {/* Driven straight off the variable the track publishes: this line
                is the only part of the rail that has to move every frame, and
                it does it without React hearing about it. */}
            <span
              className="block h-px bg-[var(--ink)]"
              style={{ width: "calc(var(--travel, 0) * 100%)" }}
            />
          </div>
        </nav>
      </div>
    </section>
  );
}

/**
 * The shell every room shares: one screen, laid out as a room rather than as a
 * column.
 *
 * The argument sits in a panel on the left at a readable measure, and the
 * demonstration gets everything else — which is the entire reason for going
 * horizontal. A figure that would have been 860px wide in a scrolling column
 * gets most of a screen here, and the width is used as composition rather than
 * as padding.
 *
 * `--near` is written by the track — 1 when this room is centred, 0 when it is
 * a viewport away — so the arrival is a pure CSS consequence of where you are
 * on the page. Nothing here subscribes to a scroll position. When the track is
 * not pinned the variable is simply absent and the fallback of 1 renders every
 * room in its finished state, which is exactly what reduced motion should get.
 */
export function Room({
  index,
  title,
  lead,
  figure,
  children,
}: {
  index: string;
  title: string;
  lead: string;
  figure?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div
      className="mx-auto flex h-full w-full max-w-[1500px] items-center gap-10 px-8 pt-14 pb-24 sm:px-12 xl:gap-16"
      // Depth, from the one variable the track publishes per room. A room that
      // is not the room you are in sits further back and dimmer, so travelling
      // reads as moving between places rather than as content being wiped
      // across the screen.
      style={{
        opacity: "calc(0.14 + var(--near, 1) * 0.86)",
        transform:
          "translateX(calc((1 - var(--near, 1)) * 3vw)) scale(calc(0.93 + var(--near, 1) * 0.07))",
      }}
    >
      <div
        className={`flex shrink-0 flex-col gap-5 ${figure ? "w-[33%] max-w-[440px]" : "w-full max-w-[880px]"}`}
      >
        <div className="flex flex-col gap-3">
          <span className="tabular text-[12px] tracking-[0.08em] text-[var(--muted)]">
            {index} / 05
          </span>
          <h2 className="text-[32px] leading-[1.05] font-bold tracking-[-0.035em] xl:text-[42px]">
            {title}
          </h2>
        </div>
        <p className="max-w-[46ch] text-[17px] leading-[1.55] text-[var(--ink)] xl:text-[18px]">
          {lead}
        </p>
        {children && (
          <div className="flex max-w-[46ch] flex-col gap-3 text-[14px] leading-[1.6] text-[var(--muted)] xl:text-[15px]">
            {children}
          </div>
        )}
      </div>
      {figure && <div className="flex h-full min-w-0 flex-1 items-center">{figure}</div>}
    </div>
  );
}
