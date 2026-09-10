import test from "node:test";
import assert from "node:assert/strict";
import { LEAD, PARALLAX, TAIL, heightFor, roomsAt, stopAt, travelAt } from "./track.ts";
import { contrast, contrastFloor, deriveInk, fromHex } from "./color.ts";
import { paletteRoles } from "./harmony.ts";
import { LIBRARY } from "./library.ts";
import { buildChrome, wallField } from "./palette.ts";

const ROOMS = 5;

test("the track holds still at both ends before and after it travels", () => {
  // The lead-in is the handoff: pinned, room 01 present, nothing moving yet.
  assert.equal(travelAt(0), 0);
  assert.equal(travelAt(LEAD), 0);
  assert.ok(travelAt(LEAD / 2) === 0, "it must not creep during the handoff");

  // The tail is the plan's full viewport of stable time on 05.
  assert.equal(travelAt(1), 1);
  assert.equal(travelAt(1 - TAIL), 1);
  assert.ok(travelAt(1 - TAIL / 2) === 1, "05 must not still be sliding");
});

test("travel only ever moves forward, and never leaves the track", () => {
  let last = -1;
  for (let i = 0; i <= 2000; i++) {
    const t = travelAt(i / 2000);
    assert.ok(t >= 0 && t <= 1, `travel ${t} off the track`);
    assert.ok(t >= last, "travel went backwards");
    last = t;
  }
  assert.equal(last, 1);
});

test("every chapter the rail can ask for lands that chapter dead centre", () => {
  for (let i = 0; i < ROOMS; i++) {
    const p = stopAt(i, ROOMS);
    assert.ok(p >= 0 && p <= 1, `stop ${p} outside the section`);
    // The rail jumps to `stopAt`; the track then reports which chapter that
    // is. If these two disagree, clicking "03" highlights "02".
    const at = travelAt(p) * (ROOMS - 1);
    assert.ok(Math.abs(at - i) < 1e-9, `stop ${i} centres room ${at}`);
  }
});

test("a single room is a degenerate track, not a divide by zero", () => {
  assert.ok(Number.isFinite(stopAt(0, 1)));
  assert.equal(stopAt(0, 1), LEAD);
});

test("the travel settles on each room instead of sliding past at one speed", () => {
  // Continuous, monotonic, and it starts and ends on whole rooms — an easing
  // applied per segment is the easiest place in this file to introduce a jump
  // at a segment boundary.
  let last = -1;
  for (let i = 0; i <= 4000; i++) {
    const at = roomsAt(i / 4000, ROOMS);
    assert.ok(at >= last - 1e-9, `travel went backwards at ${i / 4000}`);
    assert.ok(at >= 0 && at <= ROOMS - 1, `${at} is not a room`);
    last = at;
  }
  assert.equal(roomsAt(0, ROOMS), 0);
  assert.ok(Math.abs(roomsAt(1, ROOMS) - (ROOMS - 1)) < 1e-9);

  // Every room is still centred exactly, or the rail highlights the wrong one.
  for (let i = 0; i < ROOMS; i++)
    assert.ok(
      Math.abs(roomsAt(i / (ROOMS - 1), ROOMS) - i) < 1e-9,
      `room ${i} is not centred at its own stop`,
    );
});

test("the slow part is where the content is", () => {
  // The whole point of the easing: you can hold still on a room, and the speed
  // you cannot hold still at happens in the gap where there is nothing to read.
  const speed = (t: number) => (roomsAt(t + 1e-4, ROOMS) - roomsAt(t - 1e-4, ROOMS)) / 2e-4;
  const average = ROOMS - 1;

  for (let i = 0; i < ROOMS; i++) {
    const centred = speed(Math.min(0.999, Math.max(0.001, i / (ROOMS - 1))));
    assert.ok(centred / average < 0.6, `room ${i} passes at ${(centred / average).toFixed(2)}x`);
  }
  // And between two rooms it is quick, but never a lurch.
  const between = speed(0.5 / (ROOMS - 1));
  assert.ok(between / average > 1.2, "the gap should be quick");
  assert.ok(between / average < 1.4, "the gap should not be a lurch");
});

test("the rooms never outrun the scroll where you would want to stop", () => {
  // In pixels, not in screens. An earlier version compared screens of scroll to
  // screens of travel, got a comfortable 1.25, and passed a track that was
  // moving 1.28x faster than the hand — a screen is 900px tall and 1600px wide.
  //
  // With the settle easing the speed is no longer uniform, so the number that
  // matters is the speed *under a centred room*: that is where someone tries to
  // stop and read. The peak in the gap is allowed to be faster.
  const centreFactor = 0.45; // roomsAt's slope at a room, over the average
  for (const [vw, vh] of [
    [1280, 800],
    [1440, 900],
    [1680, 1050],
    [1920, 1080],
    [2560, 1440],
  ]) {
    for (const n of [3, 5, 8]) {
      const scrolled = ((heightFor(n) / 100) * vh - vh) * (1 - LEAD - TAIL);
      const gain = ((n - 1) * vw) / scrolled;
      assert.ok(
        gain * centreFactor < 0.8,
        `${vw}x${vh}, ${n} rooms: a centred room still moves at ${(gain * centreFactor).toFixed(2)}x the scroll`,
      );
      assert.ok(gain * 1.28 < 1.8, `${vw}x${vh}, ${n} rooms: peak ${(gain * 1.28).toFixed(2)}x is a lurch`);
      assert.ok(gain >= 0.6, `${vw}x${vh}, ${n} rooms: ${gain.toFixed(2)}x is a slog`);
    }
  }
});

test("the far wall is slower than the rooms, and never runs out of wall", () => {
  assert.ok(PARALLAX > 0 && PARALLAX < 1, "no parallax, or the wall overtakes the rooms");
  // The wall is as wide as the track but travels a fraction of the distance, so
  // the far edge can never come into view. `count` viewports wide, moving
  // `PARALLAX * (count - 1)` viewports, has to still cover the last screen.
  for (const n of [3, 5, 8])
    assert.ok(PARALLAX * (n - 1) + 1 <= n, `${n} rooms: the wall runs out`);
});

test("the far wall never costs the page a contrast ratio", () => {
  // The wall is a third ground: `--ink` and `--muted` were solved against
  // `--bg` and `--surface`, and the rooms sit on neither of them. The first
  // version mixed 13% of each palette colour into the ground, which moved the
  // lightness with it and put `--muted` at 3.76:1 on the darkest field — an AA
  // failure on the page whose entire argument is contrast.
  //
  // Building the wall with `tint` at the ground's own lightness makes it a
  // guarantee rather than a measurement: hue is free, lightness is the thing
  // every ink on top was solved against. This sweeps the whole shelf so a
  // raised chroma ceiling cannot quietly reintroduce the failure.
  let worstInk = Infinity;
  let worstMuted = Infinity;

  for (const entry of LIBRARY) {
    const colors = entry.colors.map((h) => fromHex(h)!);
    const chrome = buildChrome(paletteRoles(colors).accent);
    for (const colour of colors) {
      const wall = wallField(chrome.bg, colour);
      const ink = contrastFloor(chrome.ink, wall);
      const muted = contrastFloor(chrome.muted, wall);
      worstInk = Math.min(worstInk, ink);
      worstMuted = Math.min(worstMuted, muted);
      assert.ok(muted >= 4.5, `${entry.name}: --muted is ${muted.toFixed(3)}:1 on its own far wall`);
      assert.ok(ink >= 7, `${entry.name}: --ink is ${ink.toFixed(3)}:1 on its own far wall`);
    }
  }

  // Recorded so a regression reads as a number moving, not as a pass turning
  // into a fail one palette before anyone notices.
  assert.ok(worstMuted >= 4.5, `worst --muted across the shelf: ${worstMuted.toFixed(3)}`);
  assert.ok(worstInk >= 7, `worst --ink across the shelf: ${worstInk.toFixed(3)}`);
});

test("room 01's failing wall actually fails, for every palette on the shelf", () => {
  // The room's whole argument is that a grey picked by eye does not clear AA.
  // `naive` is derived rather than typed in, so a change to how it is built —
  // or to how surfaces are assigned — could quietly turn the demonstration into
  // two walls that both pass, and the room would go on claiming otherwise.
  let worst = 0;
  for (const entry of LIBRARY) {
    const colors = entry.colors.map((h) => fromHex(h)!);
    const surface = paletteRoles(colors).surface;
    const naive = { l: 0.63, c: Math.min(surface.c, 0.012), h: surface.h };
    const r = contrast(naive, surface);
    worst = Math.max(worst, r);
    assert.ok(r < 4.5, `${entry.name}: the "picked by eye" wall passes at ${r.toFixed(2)}:1`);
    // And the solved one has to actually solve it.
    assert.ok(contrastFloor(deriveInk(surface, 4.5), surface) >= 4.5, `${entry.name}: solved wall fails`);
  }
  assert.ok(worst < 4.5, `closest the failing wall gets to passing: ${worst.toFixed(2)}:1`);
});
