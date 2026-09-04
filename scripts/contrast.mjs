/**
 * The contrast audit.
 *
 * Run with `npm run audit:contrast`. It reads the palette out of globals.css
 * rather than restating it, so a token edited there is audited here without
 * anybody remembering to update two files.
 *
 * Every pair below is one that actually occurs in the app — a surface and
 * something drawn on it. Translucent surfaces are composited over their ground
 * first, because `rgba(168,132,44,.13)` on parchment is a colour and auditing
 * the token instead of the composite is auditing something nobody sees.
 *
 * Thresholds are WCAG 2.1 AA: 4.5:1 for text, 3:1 for large text (>=24px, or
 * >=18.66px bold) and for the boundary of a user-interface component.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, "..", "src", "app", "globals.css"), "utf8");

/** Pull the fell-country block's tokens. The Crown block above it is not ours. */
function token(name) {
  const block = css.slice(css.indexOf("── fell country"));
  const m = block.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!m) throw new Error(`no --${name} in the fell-country block`);
  return m[1];
}

const P = Object.fromEntries(
  ["vellum", "vellum-deep", "leaf", "leaf-deep", "gold", "gold-lit", "bark",
   "moss", "gold-ink", "moss-ink", "rail-quiet"].map((n) => [n, token(n)]),
);
P.rail = P["leaf-deep"];
P.rubric = "#94301e"; // Crown token, still used for a form error

const hex = (c) => {
  const h = c.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};
const lin = (c) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const lum = (c) => {
  const [r, g, b] = hex(c);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};
/** Composite a translucent layer over an opaque ground. */
const over = (fg, alpha, bg) => {
  const [a, b] = [hex(fg), hex(bg)];
  const m = a.map((v, i) => Math.round(v * alpha + b[i] * (1 - alpha)));
  return "#" + m.map((v) => v.toString(16).padStart(2, "0")).join("");
};

const GROUND = {
  page: P.vellum,
  panel: P["vellum-deep"],
  rail: P.rail,
  "rail, active item": over("#000000", 0.28, P.rail),
  "gold tint (awaiting, portrait)": over(P.gold, 0.09, P.vellum),
  "gold tint (ledger head)": over(P.gold, 0.13, P["vellum-deep"]),
  "button, solid": P.leaf,
};

/** [ground, colour, what it is, threshold] */
const PAIRS = [
  ["page", P.leaf, "body text", 4.5],
  ["page", P["leaf-deep"], "headings", 4.5],
  ["page", P.bark, "secondary text, eyebrows, field names", 4.5],
  ["page", P["moss-ink"], "glosses, quiet text, empty fields", 4.5],
  ["page", P["gold-ink"], "Ār figures, the purse, rung shortfalls", 4.5],
  ["page", P.rubric, "the claim form's error", 4.5],
  ["page", P.moss, "form control and unreached rung-mark boundary", 3],
  ["page", P["gold-ink"], "focus ring", 3],

  ["panel", P.leaf, "body text on a plate or note", 4.5],
  ["panel", P["leaf-deep"], "headings, field values", 4.5],
  ["panel", P.bark, "plate titles, note heads, the hand", 4.5],
  ["panel", P["moss-ink"], "plate notes, roster notes", 4.5],
  ["panel", P["gold-ink"], "the purse figure", 4.5],

  ["gold tint (awaiting, portrait)", P.leaf, "the awaiting panel's prose", 4.5],
  ["gold tint (awaiting, portrait)", P["moss-ink"], "the absent-likeness label", 4.5],
  ["gold tint (ledger head)", P.bark, "ledger block heads", 4.5],

  ["rail", P.vellum, "the wordmark, active labels", 4.5],
  ["rail", P["vellum-deep"], "slot names", 4.5],
  ["rail", P["rail-quiet"], "inactive labels, subs, the motto, notes", 4.5],
  ["rail", P["gold-lit"], "the active nav mark, filled slot pip", 3],
  ["rail, active item", P.vellum, "the active label on its darker ground", 4.5],
  ["rail, active item", P["gold-lit"], "the active mark on its darker ground", 3],

  ["button, solid", P.vellum, "button label", 4.5],
];

let failed = 0;
let ground = null;
for (const [g, fg, what, need] of PAIRS) {
  if (g !== ground) {
    ground = g;
    console.log(`\n  ${g}  ${GROUND[g]}`);
  }
  const r = ratio(fg, GROUND[g]);
  const ok = r >= need;
  if (!ok) failed++;
  console.log(
    `    ${ok ? "pass" : "FAIL"}  ${r.toFixed(2).padStart(5)} : 1  ` +
      `(needs ${need})  ${fg}  ${what}`,
  );
}

console.log(
  failed === 0
    ? "\n  All surfaces meet AA.\n"
    : `\n  ${failed} pair(s) below threshold.\n`,
);
process.exit(failed === 0 ? 0 : 1);
