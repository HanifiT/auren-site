/**
 * The ladder, as the site reads it.
 *
 * The rungs themselves are NOT here — they are generated into
 * `ladder.generated.ts` from `config/standing.yml` by
 * `tools/gen_site_ladder.py`, and `tests/test_site_ladder.py` fails if the two
 * drift. This file is only the arithmetic on top of them, and it mirrors
 * `Standing.rank_for` in `core/standing.py` exactly: scan the whole ladder and
 * keep the last rung satisfying BOTH conditions, rather than stopping at the
 * first blocked one. The two only agree for every input if this one does the
 * same.
 *
 * TWO NUMBERS THAT ARE NOT THE SAME NUMBER:
 *
 *   card.ar    the founding draw, 1–10. What the name already carries.
 *   rank       a band on ACCUMULATED Ār, and the bands start at 25.
 *
 * Every House enters at Cuma. A draw of 10 is still Cuma.
 *
 * ĀR AND COIN NEVER CONVERT. Nothing in this file, and nothing in any view that
 * uses it, may produce a combined figure, a rate, or one bar covering both.
 * The moment there is a rate, Ār is a second money and stops meaning anything.
 */
import { LADDER, OUTSIDE_ARITHMETIC, type Rung } from "./ladder.generated";

export { LADDER, OUTSIDE_ARITHMETIC };
export type { Rung };

export type Standing = {
  /** The rung actually held. Never null: every House holds Cuma at worst. */
  rung: Rung;
  /** Where `rung` sits in LADDER. 0 for Cuma, which is a real index. */
  index: number;
  /** The next rung up, or null at the top of the arithmetic. */
  next: Rung | null;
  /** The lowest rung reached on Ār but held back for want of successions. */
  blocked: Rung | null;
};

/**
 * Which rung an Ār total sits on.
 *
 * Cuma is index 0 at threshold 0. Every guard below compares against `null`
 * explicitly rather than testing truthiness, because `0` is the correct answer
 * in three different places here and a falsy check hides the rung every House
 * on the island starts on.
 */
export function standingFor(ar: number, successions = 0): Standing {
  let index = 0;
  let blocked: Rung | null = null;

  for (let i = 0; i < LADDER.length; i++) {
    const r = LADDER[i];
    if (ar < r.threshold) continue;
    if (successions < r.requiresSuccessions) {
      if (blocked === null) blocked = r;
      continue;
    }
    index = i;
  }

  const rung = LADDER[index];
  const next = index + 1 < LADDER.length ? LADDER[index + 1] : null;
  return { rung, index, next, blocked };
}

/**
 * One rung as the ladder view needs it.
 *
 * A single "23 Ār to Ċeorl" line tells a player nothing about the shape of the
 * climb, so every rung is rendered at once and every unreached one says what it
 * is short by — in BOTH currencies, because they are separate gates and a House
 * can be over the Ār threshold and still not advance.
 */
export type Step = {
  rung: Rung;
  /** Held: this House is at or above it on both counts. */
  held: boolean;
  /** The one currently occupied. */
  current: boolean;
  /** Ār still wanted. 0 means the Ār gate is already met. */
  arShort: number;
  /** Successions still wanted. 0 means that gate is met or absent. */
  successionsShort: number;
};

/** Every rung, in order, with what each unreached one is short by. */
export function climb(ar: number, successions = 0): Step[] {
  const here = standingFor(ar, successions);
  return LADDER.map((rung, i) => {
    const arShort = Math.max(0, rung.threshold - ar);
    const successionsShort = Math.max(0, rung.requiresSuccessions - successions);
    return {
      rung,
      held: arShort === 0 && successionsShort === 0 && i <= here.index,
      current: i === here.index,
      arShort,
      successionsShort,
    };
  });
}

/** "58 Ār short · wants 1 completed succession", or null once it is held. */
export function shortfall(step: Step): string | null {
  if (step.held) return null;
  const parts: string[] = [];
  parts.push(
    step.arShort > 0
      ? `${step.arShort} Ār short`
      : "Ār enough",
  );
  if (step.successionsShort > 0) {
    parts.push(
      `wants ${step.successionsShort} completed succession` +
        (step.successionsShort > 1 ? "s" : ""),
    );
  }
  return parts.join(" · ");
}
