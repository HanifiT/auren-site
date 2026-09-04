/**
 * GENERATED FROM config/standing.yml — DO NOT EDIT BY HAND.
 *
 * Regenerate with `python tools/gen_site_ladder.py`.
 * `tests/test_site_ladder.py` fails if this file and the YAML disagree, so an
 * edit here without a matching edit there is caught rather than believed.
 *
 * WHERE THE PROSE AND THE CONFIG DISAGREE, THE CONFIG IS RIGHT. docs/standing.md
 * says "two rungs need generational depth"; the data gates four. This file is
 * the data.
 *
 * Both ends of the ladder are outside arithmetic and are therefore not in
 * `LADDER`: Nīðing is imposed by judgement, Eorl is conferred by acclamation.
 * They are exported separately so a view can name them without a threshold.
 */

export type Rung = {
  /** `rank` in the YAML. Cuma is 1 there and index 0 here — see NOTE below. */
  rank: number;
  name: string;
  /** Accumulated Ār. Cuma's is 0, which is a real threshold, not a missing one. */
  threshold: number;
  /** Completed successions the House must also have. */
  requiresSuccessions: number;
  /** Plain English, for readers who do not have the Old English. */
  sense: string;
};

/**
 * NOTE, because this is the bug the ladder keeps having:
 *
 * Cuma sits at index 0 AND at threshold 0 AND, in the YAML, at rank 1. Every
 * one of those is falsy or near enough that a `if (rung)` / `if (index)` /
 * `if (ar)` guard silently hides the rung every House starts on. Compare
 * against `null` explicitly. `standingFor(0, 0)` returning Cuma is asserted by
 * `src/lib/standing.test.ts`.
 */

export const LADDER: Rung[] = [
  { rank: 1, name: "Cuma", threshold: 0, requiresSuccessions: 0, sense: "A comer. A stranger who has arrived and not yet been placed." },
  { rank: 2, name: "Ċeorl", threshold: 25, requiresSuccessions: 0, sense: "Freeman. Owns himself, owes no man service." },
  { rank: 3, name: "Bonda", threshold: 60, requiresSuccessions: 0, sense: "Householder. Has a hearth, a roof, and something worth defending." },
  { rank: 4, name: "Genēat", threshold: 120, requiresSuccessions: 0, sense: "Retainer. Someone's man — a rise, because it means someone chose you." },
  { rank: 5, name: "Þegn", threshold: 220, requiresSuccessions: 0, sense: "Sworn and landed. Counted in the reckoning of a district." },
  { rank: 6, name: "Hold", threshold: 400, requiresSuccessions: 1, sense: "A landholder with inherited right." },
  { rank: 7, name: "Ealdormann", threshold: 600, requiresSuccessions: 1, sense: "Elder-man. Speaks for a district, and is answerable for it." },
  { rank: 8, name: "Hersir", threshold: 850, requiresSuccessions: 1, sense: "Chieftain. Can raise men, and men come." },
  { rank: 9, name: "Hlāford", threshold: 1100, requiresSuccessions: 2, sense: "Lord — hlāfweard, loaf-ward, the one who gives bread." },
];

/** Imposed by judgement or conferred by acclamation. Never reached by Ār. */
export const OUTSIDE_ARITHMETIC = [
  { name: "Nīðing", how: "imposed" as const, sense: "Outcast. Oath-breaker. Stripped, not merely low." },
  { name: "Eorl", how: "conferred" as const, sense: "The Norse jarl, same word. The top of what a name can become without a crown." },
];

/** The anchor a threshold is measured in: one notable deed. */
export const NOTABLE_AR = 10;
