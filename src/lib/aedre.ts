import { pool } from "./db";

/**
 * The Ǣdre.
 *
 * The energy is in the ground, not the character. There is no per-character
 * pool: a character has *access*, and what depletes is the line — shared,
 * regional, and visible to everyone on this page.
 *
 * `wemm` is deliberately not exposed by anything here. It is on the character
 * row, it only increases, and nothing in the interface explains it or shows
 * it. That is not an oversight.
 */

export type Line = {
  id: string;
  name: string;
  town: string;
  capacity: number;
  available: number;
  refill_per_hour: number;
  surfaced: boolean;
};

export async function lines(): Promise<Line[]> {
  const { rows } = await pool.query<Line>(
    `SELECT id::text, name, town, capacity, available, refill_per_hour, surfaced
       FROM aedre_state ORDER BY capacity DESC`,
  );
  return rows;
}

export async function recentDraws(limit = 12) {
  const { rows } = await pool.query<{
    line: string; town: string; amount: number; drawn_at: Date; who: string;
  }>(
    `SELECT a.name AS line, a.town, w.amount, w.drawn_at, c.name AS who
       FROM wylm_draw w
       JOIN aedre a ON a.id = w.aedre_id
       JOIN character c ON c.id = w.character_id
      ORDER BY w.drawn_at DESC LIMIT $1`,
    [limit],
  );
  return rows;
}

export async function draw(
  characterId: string, amount: number,
): Promise<{ ok: true; line: string; took: number; remaining: number }
         | { ok: false; reason: string }> {
  try {
    const { rows } = await pool.query(
      "SELECT line, took, remaining FROM aedre_draw($1, $2)",
      [characterId, amount],
    );
    const r = rows[0];
    return { ok: true, line: r.line, took: r.took, remaining: r.remaining };
  } catch (err) {
    // The function's messages are already readable and in voice, so they are
    // passed through rather than translated.
    const msg = (err as { message?: string }).message ?? "";
    const known = ["not standing anywhere", "no line runs under",
                   "is low", "the dead draw nothing", "nothing to draw"];
    if (known.some((k) => msg.includes(k))) {
      return { ok: false, reason: msg.replace(/^ERROR:\s*/, "") };
    }
    console.error("draw failed", err);
    return { ok: false, reason: "The line did not answer." };
  }
}

export async function moveTo(characterId: string, town: string) {
  await pool.query("UPDATE character SET at_town = $2 WHERE id = $1",
    [characterId, town]);
}
