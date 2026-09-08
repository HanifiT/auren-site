import { LIVING_CAP } from "./census";
import { pool } from "./db";

/**
 * The counts the shell needs, and the House purse.
 *
 * Every function here is a reader. The site's role has SELECT on all of it and
 * the write grants it does hold (db/007, 008, 012) are for prose and
 * appearance — none of these tables' standing or money columns are the site's
 * to touch. Anything that needs to write goes through the bot.
 */

/**
 * Character slots for one player.
 *
 * THREE LIVING CHARACTERS PER OWNER IS A DATABASE CONSTRAINT, not a setting.
 * It was one, held by the partial unique index `character_one_living_per_owner`
 * (db/007); a unique index cannot say three, so db/018 replaced it with the
 * `character_living_cap` trigger. The number lives in `LIVING_CAP` in
 * lib/census.ts and is imported here rather than written twice.
 *
 * The departed and the dead are counted separately because they stay on the
 * roll and do not take a place. That rule is unchanged — it just applies
 * against three now. Succession replaces rather than accumulates.
 */
export type Slots = {
  living: number;
  /** The cap. Named rather than inlined so the reason travels with it. */
  livingAllowed: number;
  departed: number;
  dead: number;
  /** Entered but not yet admitted to a House. */
  pending: number;
};

export async function slotsFor(discordId: string): Promise<Slots> {
  const { rows } = await pool.query<{ status: string; membership: string; n: string }>(
    `SELECT status, membership, count(*)::text AS n
       FROM character WHERE owner_id = $1
      GROUP BY status, membership`,
    [discordId],
  );
  const slots: Slots = {
    living: 0, livingAllowed: LIVING_CAP, departed: 0, dead: 0, pending: 0,
  };
  for (const r of rows) {
    const n = Number(r.n);
    if (r.status === "dead") slots.dead += n;
    else if (r.status === "departed") slots.departed += n;
    else if (r.membership === "admitted") slots.living += n;
    else slots.pending += n;
  }
  return slots;
}

/**
 * The House purse, in pence.
 *
 * `balance` is a view over `ledger`, grouped by (account_kind, account_id).
 * There is no balance column anywhere — balance is SUM(amount_pence), which is
 * why reconciliation is free and a duping bug shows as a mismatch rather than
 * as quietly wrong numbers.
 *
 * `account_kind` matters: ledger.account_id holds both Discord snowflakes and
 * cynn ids, and without the discriminator House 123 and member 123 share a
 * purse (db/009).
 */
export async function purseOf(cynnId: string): Promise<number> {
  const { rows } = await pool.query<{ pence: string }>(
    `SELECT pence::text FROM balance
      WHERE account_kind = 'house' AND account_id = $1`,
    [cynnId],
  );
  return Number(rows[0]?.pence ?? 0);
}

/** Pence -> `£1 2s 10d`. Mirrors core/money.py. Integer pence throughout. */
export function formatPence(pence: number): string {
  const sign = pence < 0 ? "-" : "";
  const n = Math.abs(Math.trunc(pence));
  const parts: string[] = [];
  const pounds = Math.floor(n / 240);
  const shillings = Math.floor((n % 240) / 12);
  const d = n % 12;
  if (pounds) parts.push(`£${pounds}`);
  if (shillings) parts.push(`${shillings}s`);
  if (d || parts.length === 0) parts.push(`${d}d`);
  return sign + parts.join(" ");
}

export type Member = {
  id: string;
  name: string;
  status: "living" | "dead" | "departed";
  membership: "pending" | "admitted" | "disowned";
  trade: string | null;
  owner_id: string | null;
};

/** Everyone the House has ever held, living or otherwise. */
export async function membersOf(cynnId: string): Promise<Member[]> {
  const { rows } = await pool.query<Member>(
    `SELECT id::text, name, status, membership, trade, owner_id::text
       FROM character WHERE cynn_id = $1
      ORDER BY (status = 'living') DESC, created_at`,
    [cynnId],
  );
  return rows;
}

export type CharacterDeed = {
  id: string;
  tier: string;
  ar: number;
  reason: string;
  awarded_at: Date;
  character_name: string | null;
};

/**
 * Deeds entered against the House, with who they were attributed to.
 *
 * Ār moves the House, never the member — but a deed is attributed to a person,
 * and a table of deeds with the name struck off is a table nobody can read.
 */
export async function deedsOf(cynnId: string, limit = 40): Promise<CharacterDeed[]> {
  const { rows } = await pool.query<CharacterDeed>(
    `SELECT d.id::text, d.tier, d.ar, d.reason, d.awarded_at, c.name AS character_name
       FROM deed d LEFT JOIN character c ON c.id = d.character_id
      WHERE d.cynn_id = $1
      ORDER BY d.awarded_at DESC
      LIMIT $2`,
    [cynnId, limit],
  );
  return rows;
}

/** Deeds attributed to one character, for their own record. */
export async function deedsForCharacter(characterId: string): Promise<CharacterDeed[]> {
  const { rows } = await pool.query<CharacterDeed>(
    `SELECT id::text, tier, ar, reason, awarded_at, NULL AS character_name
       FROM deed WHERE character_id = $1 ORDER BY awarded_at DESC`,
    [characterId],
  );
  return rows;
}
