/**
 * House colours.
 *
 * A House picks one colour at founding and wears it as a Discord role. Three
 * things can go wrong with a freely chosen colour, and all three are silent —
 * nothing errors, the House just looks broken:
 *
 * 1. **Black is not a colour to Discord.** `0x000000` means "no colour", and a
 *    role set to it renders in the default grey. db/015 rejects it at the
 *    column too; this is the same refusal where somebody can read it.
 * 2. **The colour must survive every ground it is ever drawn on.** It is the
 *    member's name in Discord and, once the parchment design lands, the wax of
 *    the House's seal on the site. Four grounds, listed in `SURFACES`.
 *
 *    This is deliberately not a plain contrast ratio. Contrast is symmetric, so
 *    pure black scores 1.66 against the dark background — better than dark navy
 *    — and a symmetric test would wave black straight through. A name has to be
 *    *lighter* than a dark background and *darker* than a light one, which
 *    makes the test directional: a band, checked at both ends.
 *
 *    A floor alone was the first version and it was wrong at the other end:
 *    `#fffef8` clears any dark-ground floor and is invisible on light theme.
 *    Two grounds was the second version and it was wrong at *both* ends,
 *    because the two it picked were the lenient ones — see `SURFACES`.
 * 3. **Two Houses in the same colour** are two Houses nobody can tell apart in
 *    a member list. The database enforces exact uniqueness; this catches the
 *    near-misses it cannot, which are the ones that actually cause the
 *    confusion.
 */

/**
 * Every ground a House colour is drawn on, and which way it has to go to be
 * seen there. Adding a surface is one line, which is the point of the list.
 *
 * `lighter` means the colour must be lighter than the ground by MIN_RATIO;
 * `darker` means the reverse. Two are Discord's themes; two are the site's own
 * — the dark rail the House seals sit in, and the parchment they are laid on.
 *
 * **Neither Discord surface is the binding one.** The rail (`--fell`, L=0.067)
 * is a *lighter* dark than Discord's #313338 (L=0.033) and so demands a higher
 * floor; the parchment (L=0.826) is a *darker* light than white and so demands
 * a lower ceiling. Calibrating against Discord alone left both ends wrong:
 * #b03030 passed Discord at 1.99 and scored 1.42 on the rail, which is exactly
 * where a House seal is struck.
 *
 * **Checked before the seals exist, because the column is write-once.** There
 * is no UPDATE grant on `cynn.colour` (db/015), so a House founded under a
 * loose constraint can never be corrected once the seal reaches parchment. A
 * write-once value has to satisfy every surface it will ever appear on.
 */
const SURFACES = [
  { name: "Discord's dark theme", ground: 0x313338, side: "lighter" },
  { name: "the rail", ground: 0x35502f, side: "lighter" },
  { name: "Discord's light theme", ground: 0xffffff, side: "darker" },
  { name: "parchment", ground: 0xf3ead2, side: "darker" },
] as const;

/**
 * How far a name must sit from each background, as a contrast ratio taken in
 * the direction that makes it readable — lighter than the dark one, darker
 * than the light one. Both ends use the same number, which is what makes this
 * a band rather than two unrelated rules.
 *
 * 1.8 admits a deep blood red (#B03030) and refuses the crown red (#8B1A1A) at
 * the dark end, and refuses near-whites at the light end. One constant,
 * deliberately: the usable band is a luminance of roughly 0.10 to 0.53.
 */
const MIN_RATIO = 1.8;

/**
 * Redmean distance below which two colours read as the same at a glance. A
 * cheap approximation of perceptual distance that needs no dependency and is
 * markedly better than plain RGB Euclidean around reds and blues.
 */
const MIN_DISTANCE = 40;

function channels(rgb: number): [number, number, number] {
  return [(rgb >> 16) & 0xff, (rgb >> 8) & 0xff, rgb & 0xff];
}

function linear(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance, 0..1. */
export function luminance(rgb: number): number {
  const [r, g, b] = channels(rgb);
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/**
 * Perceptual distance, "redmean". 0 is identical; ~765 is black to white.
 * https://en.wikipedia.org/wiki/Color_difference#sRGB
 */
export function distance(a: number, b: number): number {
  const [r1, g1, b1] = channels(a);
  const [r2, g2, b2] = channels(b);
  const rbar = (r1 + r2) / 2;
  const dr = r1 - r2, dg = g1 - g2, db = b1 - b2;
  return Math.sqrt(
    (2 + rbar / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rbar) / 256) * db * db,
  );
}

export type ColourCheck =
  | { ok: true; value: number }
  | { ok: false; reason: string };

/**
 * Parse and judge a `#rrggbb` from the form.
 *
 * `taken` is the colours of the Houses that already stand. Passing it is what
 * turns "that is a legal colour" into "that is a colour you may have".
 */
export function readColour(raw: string, taken: readonly number[] = []): ColourCheck {
  const text = raw.trim();
  if (!text) return { ok: false, reason: "Your House needs a colour." };

  const m = /^#?([0-9a-f]{6})$/i.exec(text);
  if (!m) {
    return { ok: false, reason: "That is not a colour. Use six hex digits, like #4C9A2A." };
  }
  const value = parseInt(m[1], 16);

  if (value === 0) {
    // Not pedantry: Discord stores 0 as "no colour" and the House would come
    // out the same grey as everybody else, with nothing to show it had failed.
    return { ok: false, reason: "Black is not a colour a House can wear. Choose something with light in it." };
  }

  // Every surface, in the one direction that makes a mark readable on it. The
  // first failure is the one reported: naming the surface makes the refusal
  // actionable, where "that colour is not allowed" would not be.
  const lum = luminance(value);
  for (const surface of SURFACES) {
    const ground = luminance(surface.ground);
    if (surface.side === "lighter") {
      if (lum < MIN_RATIO * (ground + 0.05) - 0.05) {
        return {
          ok: false,
          reason: `That is too dark to read against ${surface.name}. Choose something lighter.`,
        };
      }
    } else if (lum > (ground + 0.05) / MIN_RATIO - 0.05) {
      return {
        ok: false,
        reason: `That is too pale to read against ${surface.name}. Choose something deeper.`,
      };
    }
  }

  for (const other of taken) {
    if (distance(value, other) < MIN_DISTANCE) {
      return {
        ok: false,
        reason: "Another House already stands in that colour, or one too near it.",
      };
    }
  }

  return { ok: true, value };
}

export function toHex(value: number): string {
  return `#${value.toString(16).padStart(6, "0")}`;
}
