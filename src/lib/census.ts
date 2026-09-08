import { pool } from "./db";

/**
 * What the census needs to look up, and what it writes when it is finished.
 *
 * The reads here are what let the flow tell a player something true *while they
 * are still typing* — that the House they named already stands, that the parent
 * they named is somebody else's character. Saying either afterwards is too
 * late: by then they have committed to a name they cannot change, or entered a
 * tie they thought was a fact.
 */

export const LIVING_CAP = 3;

export type LivingSoul = { id: string; name: string; house: string | null };

/**
 * The owner's living characters.
 *
 * The cap is enforced by `character_living_cap` (db/018) and this is not that
 * check — it is what lets the refusal name the souls that would have to depart
 * first, which a constraint violation cannot.
 */
export async function livingFor(discordId: string): Promise<LivingSoul[]> {
  const { rows } = await pool.query<LivingSoul>(
    `SELECT ch.id::text, ch.name, cy.name AS house
       FROM character ch
       LEFT JOIN cynn cy ON cy.id = ch.cynn_id
      WHERE ch.owner_id = $1
        AND ch.status = 'living'
        AND ch.membership = 'admitted'
      ORDER BY ch.created_at`,
    [discordId],
  );
  return rows;
}

export type StandingHouse = { id: string; name: string; origin_town: string };

/**
 * A House by name, if one stands.
 *
 * Case-insensitive, matching `cynn_name_unique`, which is on `lower(name)` and
 * partial on `disbanded_at IS NULL` — so a disbanded name is free again and
 * this will not find it.
 */
export async function houseByName(name: string): Promise<StandingHouse | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const { rows } = await pool.query<StandingHouse>(
    `SELECT id::text, name, origin_town FROM cynn
      WHERE lower(name) = lower($1) AND disbanded_at IS NULL LIMIT 1`,
    [trimmed],
  );
  return rows[0] ?? null;
}

export type NameMatch = {
  /** The name as it was typed. */
  typed: string;
  id: string;
  name: string;
  /** True when a player bears this name — which makes a tie to it a claim. */
  isPlayer: boolean;
  house: string | null;
};

/**
 * Which of these names already belong to somebody.
 *
 * THE WHOLE FOREBEAR/CLAIM SPLIT TURNS ON THIS. A name nobody bears is a
 * forebear and is entered directly; a name somebody bears is a claim about
 * them and waits for their agreement. One query for the lot, because the flow
 * asks after every keystroke and nine round trips per character is not a
 * design.
 *
 * `isPlayer` is what actually decides, not merely "a row exists": a forebear
 * somebody else already entered has no owner and nobody to ask, so naming the
 * same grandmother is not a claim on anybody.
 */
export async function matchNames(names: string[]): Promise<NameMatch[]> {
  const wanted = Array.from(new Set(names.map((n) => n.trim()).filter(Boolean)));
  if (wanted.length === 0) return [];
  const { rows } = await pool.query<{
    id: string; name: string; owner_id: string | null; house: string | null;
  }>(
    `SELECT DISTINCT ON (lower(ch.name))
            ch.id::text, ch.name, ch.owner_id::text, cy.name AS house
       FROM character ch
       LEFT JOIN cynn cy ON cy.id = ch.cynn_id
      WHERE lower(ch.name) = ANY($1::text[])
      ORDER BY lower(ch.name), (ch.owner_id IS NOT NULL) DESC, ch.created_at`,
    [wanted.map((n) => n.toLowerCase())],
  );
  const byLower = new Map(rows.map((r) => [r.name.toLowerCase(), r]));
  const out: NameMatch[] = [];
  for (const typed of wanted) {
    const hit = byLower.get(typed.toLowerCase());
    if (!hit) continue;
    out.push({
      typed,
      id: hit.id,
      name: hit.name,
      isPlayer: hit.owner_id !== null,
      house: hit.house,
    });
  }
  return out;
}

/** A forebear: somebody who was never a player. Nobody to ask. */
export async function addForebear(
  cynnId: string, name: string, actor: string,
): Promise<string> {
  const { rows } = await pool.query<{ cynn_add_forebear: string }>(
    "SELECT cynn_add_forebear($1, $2, $3)::text",
    [cynnId, name, actor],
  );
  return rows[0].cynn_add_forebear;
}

export type EdgeSpec = {
  kind: "parent_of" | "married_to";
  fromId: string;
  toId: string;
  /** Confirmed on sight, which is legal only when one end is a forebear. */
  agreed: boolean;
  claimedBy: string;
};

/**
 * Write a tie.
 *
 * `agreed` is checked at the database as well as here:
 * `kin_edge_confirmed_on_insert` (db/019) refuses a confirmed edge with a
 * player at both ends, whoever wrote it. So a bug in the caller cannot defeat
 * the consent rule — it can only produce an error.
 */
export async function writeEdge(e: EdgeSpec): Promise<{ ok: boolean; reason?: string }> {
  try {
    await pool.query(
      `INSERT INTO kin_edge (kind, from_id, to_id, claimed_by, confirmed,
                             confirmed_at)
       VALUES ($1, $2, $3, $4, $5, CASE WHEN $5 THEN now() ELSE NULL END)`,
      [e.kind, e.fromId, e.toId, e.claimedBy, e.agreed],
    );
    return { ok: true };
  } catch (err) {
    const m = (err as { message?: string; code?: string });
    if (m.code === "23505") return { ok: true }; // already claimed; not an error
    if (m.message?.includes("own ancestor")) {
      return { ok: false, reason: "That would make somebody their own ancestor." };
    }
    if (m.message?.includes("two parents")) {
      return { ok: false, reason: "They already have two parents." };
    }
    if (m.message?.includes("starts pending")) {
      return { ok: false, reason: "A tie between two players starts pending." };
    }
    console.error("writeEdge failed", err);
    return { ok: false, reason: "That tie could not be written." };
  }
}
