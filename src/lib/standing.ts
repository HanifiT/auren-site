/**
 * The ladder.
 *
 * Mirrored from `config/standing.yml`, which the bot loads through
 * `core/standing.py`. The site had no copy of this at all, so it could print
 * `cynn.ar` and never name the standing that number sits on.
 *
 * TWO NUMBERS THAT ARE NOT THE SAME NUMBER, restated here because this file is
 * where they get confused:
 *
 *   card.ar    the founding draw, 1–10. What the name already carries.
 *   rank       a band on ACCUMULATED Ār, and the bands start at 25.
 *
 * Every House enters at Cuma. A draw of 10 is still Cuma — it makes you the
 * best-named new arrival on the island and leaves Eorl a very long way off.
 *
 * FOUR RUNGS GATE ON COMPLETED SUCCESSIONS, not one. The prose in standing.md
 * and standing.yml both say "two rungs need generational depth"; the data gates
 * four, and believing the prose is how this file ends up disagreeing with
 * rank_for(). Checked against the loader across Ār 0–1299 × successions 0–2.
 *
 * Neither end of the ladder is arithmetic and neither belongs here: Nīðing is
 * imposed by judgement, Eorl is conferred by acclamation.
 */
export type Rung = {
  name: string;
  threshold: number;
  requiresSuccessions: number;
  /** Plain English, for readers who do not have the Old English. */
  sense: string;
};

export const LADDER: Rung[] = [
  { name: "Cuma",       threshold: 0,    requiresSuccessions: 0, sense: "newcomer" },
  { name: "Ċeorl",      threshold: 25,   requiresSuccessions: 0, sense: "freeman" },
  { name: "Bonda",      threshold: 60,   requiresSuccessions: 0, sense: "householder" },
  { name: "Genēat",     threshold: 120,  requiresSuccessions: 0, sense: "retainer" },
  { name: "Þegn",       threshold: 220,  requiresSuccessions: 0, sense: "sworn and landed" },
  { name: "Hold",       threshold: 400,  requiresSuccessions: 1, sense: "landholder by inherited right" },
  { name: "Ealdormann", threshold: 600,  requiresSuccessions: 1, sense: "elder, speaks for a district" },
  { name: "Hersir",     threshold: 850,  requiresSuccessions: 1, sense: "chieftain" },
  { name: "Hlāford",    threshold: 1100, requiresSuccessions: 2, sense: "lord, the one who gives bread" },
];

export type Standing = {
  /** The rung actually held. */
  rung: Rung;
  /** The next rung up, or null at the top of the arithmetic. */
  next: Rung | null;
  /** Reached on Ār but held back for want of successions, if any. */
  blocked: Rung | null;
};

/**
 * Which rung an Ār total sits on.
 *
 * Scans the whole ladder and keeps the last rung satisfying BOTH conditions,
 * rather than stopping at the first blocked one — this is what
 * `core/standing.py` does, and the two only agree for every input if this one
 * does the same.
 */
export function standingFor(ar: number, successions = 0): Standing {
  let rung = LADDER[0];
  let blocked: Rung | null = null;
  for (const r of LADDER) {
    if (ar < r.threshold) continue;
    if (successions < r.requiresSuccessions) {
      if (!blocked) blocked = r;
      continue;
    }
    rung = r;
  }
  const next = LADDER.find((r) => r.threshold > rung.threshold) ?? null;
  return { rung, next, blocked };
}
