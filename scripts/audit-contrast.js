/*
 * Contrast audit for the *rendered* page.
 *
 * Paste into the browser console with the app open. This is deliberately not a
 * unit test: it reads the real computed styles, composites the actual
 * background stack (including semi-transparent layers) through a canvas, and
 * computes the ratio from the 8-bit pixels a screen would show. The unit tests
 * check that the maths is right; this checks that what shipped is what the
 * maths described. Both bugs recorded in the README were found here, not there.
 *
 * Returns { checked, failed, demos, margin, fails } — `margin` is the tightest
 * ratio/requirement seen, so 1.0 means something sits exactly on the line.
 *
 * Elements inside [data-contrast-demo] are counted as `demos` rather than
 * failures: the case study deliberately renders one failing pair in order to
 * argue against it, and that example must not be able to hide a real
 * regression by making `failed: 0` unreachable.
 */
(() => {
  /*
   * Settle the page first. Every element carries a colour transition so that
   * a repaint reads as one wash rather than a snap, which means that for a
   * fraction of a second after any palette change this script would be
   * measuring colours that are part-way between two palettes — and reporting
   * failures that do not exist on any frame the user actually sees. Killing
   * the transition property cancels every one in flight; reading a computed
   * style immediately afterwards forces the recalculation, so by the time the
   * first sample is taken every element is showing its settled colour. The
   * rule is removed on the way out.
   *
   * This matters more than it sounds: it also makes the audit trustworthy in
   * a headless or backgrounded tab, where transitions never advance at all
   * and the page would otherwise be frozen mid-fade for as long as you look
   * at it.
   */
  const settle = document.createElement("style");
  settle.textContent = "*, *::before, *::after { transition: none !important }";
  document.head.append(settle);
  void getComputedStyle(document.body).color;

  const cv = document.createElement("canvas");
  cv.width = cv.height = 1;
  const ctx = cv.getContext("2d", { willReadFrequently: true });

  // Paint the ancestor stack bottom-up so alpha composites for real.
  const px = (layers) => {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, 1, 1);
    for (const c of layers) {
      ctx.fillStyle = c;
      ctx.fillRect(0, 0, 1, 1);
    }
    const d = ctx.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2]];
  };

  const lum = (rgb) => {
    const [r, g, b] = rgb.map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const ratio = (a, b) => {
    const [hi, lo] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (hi + 0.05) / (lo + 0.05);
  };

  const bgStack = (el) => {
    const s = [];
    for (let n = el; n; n = n.parentElement) {
      const bg = getComputedStyle(n).backgroundColor;
      if (bg && !/rgba\(0, 0, 0, 0\)|transparent/.test(bg)) s.unshift(bg);
    }
    return s;
  };

  let checked = 0;
  let demos = 0;
  let margin = Infinity;
  const fails = [];

  document.querySelectorAll("*").forEach((el) => {
    // Only elements holding their own text; otherwise every ancestor is counted.
    const txt = [...el.childNodes]
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent.trim())
      .join("");
    if (!txt) return;

    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || +cs.opacity === 0) return;

    // Deliberately-failing examples are measured but never counted against us.
    if (el.closest("[data-contrast-demo]")) {
      demos++;
      return;
    }

    const size = parseFloat(cs.fontSize);
    const large = size >= 24 || (size >= 18.66 && +cs.fontWeight >= 700);
    const need = large ? 3 : 4.5;

    checked++;
    const stack = bgStack(el);
    const r = ratio(px([...stack, cs.color]), px(stack));
    margin = Math.min(margin, r / need);

    // Half a hundredth of slack: the reported ratio is rounded to 2dp anyway.
    if (r < need - 0.005) {
      fails.push({ text: txt.slice(0, 48), size, ratio: +r.toFixed(2), need });
    }
  });

  settle.remove();
  return { checked, failed: fails.length, demos, margin: +margin.toFixed(3), fails };
})();
