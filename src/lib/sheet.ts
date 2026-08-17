import { randomInt } from "crypto";

import { pool } from "./db";

/**
 * Character sheets.
 *
 * THE ROLL IS SERVER-SIDE AND COMMITTED BEFORE IT IS SHOWN. That ordering is
 * the entire feature:
 *
 *   1. player clicks roll — an explicit action, never on page load
 *   2. the server generates the values
 *   3. the server writes them, committed
 *   4. only then does the response render them
 *
 * Rolled in the browser means rolled by the player. Rolled on the server but
 * persisted only at submit means the player refreshes until the numbers are
 * good. Either way the honest players end up the weak ones.
 *
 * Immutability is a grant, not a convention: this role has INSERT on
 * sheet_roll and no UPDATE, and the table is unique on owner_id. A bug here
 * cannot reroll anybody, because it was never able to write twice.
 *
 * `randomInt` from node:crypto rather than Math.random — this decides how
 * strong someone's character is, which is exactly the kind of thing people
 * try to predict.
 */

export { STATS, formatPence } from "./stats";
export type { StatKey } from "./stats";

import type { StatKey } from "./stats";

export type Roll = {
  id: string;
  values: number[];
  dice: number[][];
  rolled_at: Date;
};

export type Sheet = Record<StatKey, number> & {
  id: string;
  created_at: Date;
};

/** 4d6, drop the lowest. Six times. */
function rollOne(): { total: number; dice: number[] } {
  const dice = [randomInt(1, 7), randomInt(1, 7), randomInt(1, 7), randomInt(1, 7)];
  const total = [...dice].sort((a, b) => b - a).slice(0, 3)
    .reduce((s, d) => s + d, 0);
  return { total, dice };
}

export async function getRoll(discordId: string): Promise<Roll | null> {
  const { rows } = await pool.query<Roll>(
    "SELECT id::text, values, dice, rolled_at FROM sheet_roll WHERE owner_id = $1",
    [discordId],
  );
  return rows[0] ?? null;
}

/**
 * Roll, persist, then return. Never the other way round.
 *
 * If a roll already exists it is returned unchanged — coming back to an
 * abandoned form shows the same numbers, and there is no path that produces
 * different ones.
 */
export async function rollFor(discordId: string): Promise<Roll> {
  const existing = await getRoll(discordId);
  if (existing) return existing;

  const results = Array.from({ length: 6 }, rollOne);
  const values = results.map((r) => r.total);
  const dice = results.map((r) => r.dice);

  try {
    const { rows } = await pool.query<Roll>(
      `INSERT INTO sheet_roll (owner_id, values, dice)
       VALUES ($1, $2::smallint[], $3::jsonb)
       RETURNING id::text, values, dice, rolled_at`,
      [discordId, values, JSON.stringify(dice)],
    );
    return rows[0];
  } catch (err) {
    // Unique violation: two clicks arrived together. The first won, and the
    // loser gets the winner's numbers rather than an error.
    if ((err as { code?: string }).code === "23505") {
      const raced = await getRoll(discordId);
      if (raced) return raced;
    }
    throw err;
  }
}

export async function getSheet(discordId: string): Promise<Sheet | null> {
  const { rows } = await pool.query<Sheet>(
    `SELECT id::text, maegen, searu, haelu, frod, hyge, mod, created_at
       FROM character_sheet WHERE owner_id = $1`,
    [discordId],
  );
  return rows[0] ?? null;
}

/**
 * Commit an assignment.
 *
 * The database checks that the six values are a permutation of the roll, so
 * this cannot be talked into an all-18s sheet even if the form is bypassed
 * entirely.
 */
export async function assignSheet(
  discordId: string,
  rollId: string,
  assignment: Record<StatKey, number>,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  try {
    await pool.query(
      `INSERT INTO character_sheet
         (owner_id, roll_id, maegen, searu, haelu, frod, hyge, mod)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        discordId, rollId,
        assignment.maegen, assignment.searu, assignment.haelu,
        assignment.frod, assignment.hyge, assignment.mod,
      ],
    );
    return { ok: true };
  } catch (err) {
    const e = err as { code?: string; message?: string };
    if (e.code === "23505") {
      return { ok: false, reason: "Your sheet is already recorded." };
    }
    if (e.message?.includes("not a permutation")) {
      return {
        ok: false,
        reason: "Those numbers aren't the ones you rolled.",
      };
    }
    console.error("assignSheet failed", err);
    return { ok: false, reason: "The records are unreachable just now." };
  }
}


export async function balanceOf(discordId: string): Promise<number> {
  const { rows } = await pool.query<{ pence: string }>(
    "SELECT pence FROM balance WHERE account_id = $1",
    [discordId],
  );
  return Number(rows[0]?.pence ?? 0);
}
