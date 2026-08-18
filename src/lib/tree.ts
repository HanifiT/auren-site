import { pool } from "./db";

/**
 * The family tree.
 *
 * Only `parent_of` and `married_to` are stored; siblings, cousins,
 * grandparents and in-laws are traversal. Store them and you eventually get a
 * tree where A is B's brother and also B's uncle, with no way to say which is
 * wrong.
 *
 * Every edge needs both ends to agree. A claim is a claim *about someone
 * else*, so an unconfirmed edge renders as pending and is not in `kin_tree`.
 * That is the whole difference between a family tree and an argument.
 */

export type Edge = {
  id: string;
  kind: "parent_of" | "married_to";
  from_id: string;
  to_id: string;
  from_name: string;
  to_name: string;
  confirmed: boolean;
  claimed_by: string | null;
};

export type Kin = {
  parents: { id: string; name: string; confirmed: boolean }[];
  children: { id: string; name: string; confirmed: boolean }[];
  spouses: { id: string; name: string; confirmed: boolean }[];
  /** Claims made *about* you that you have not answered. */
  awaiting: Edge[];
};

export async function edgesFor(characterId: string): Promise<Edge[]> {
  const { rows } = await pool.query<Edge>(
    `SELECT e.id::text, e.kind, e.from_id::text, e.to_id::text,
            a.name AS from_name, b.name AS to_name,
            e.confirmed, e.claimed_by::text
       FROM kin_edge e
       JOIN character a ON a.id = e.from_id
       JOIN character b ON b.id = e.to_id
      WHERE e.from_id = $1 OR e.to_id = $1
      ORDER BY e.confirmed DESC, e.created_at`,
    [characterId],
  );
  return rows;
}

export function shapeKin(characterId: string, edges: Edge[]): Kin {
  const kin: Kin = { parents: [], children: [], spouses: [], awaiting: [] };
  for (const e of edges) {
    const other = e.from_id === characterId
      ? { id: e.to_id, name: e.to_name }
      : { id: e.from_id, name: e.from_name };
    const entry = { ...other, confirmed: e.confirmed };

    if (e.kind === "married_to") kin.spouses.push(entry);
    else if (e.from_id === characterId) kin.children.push(entry);
    else kin.parents.push(entry);

    // Somebody else claimed this and it is unanswered — the claim is about
    // you, so you are the one who confirms it.
    if (!e.confirmed && e.claimed_by !== null && String(e.claimed_by) !== characterId) {
      kin.awaiting.push(e);
    }
  }
  return kin;
}

export async function householdOf(cynnId: string) {
  const { rows } = await pool.query<{ id: string; name: string; status: string }>(
    `SELECT id::text, name, status FROM character
      WHERE cynn_id = $1 ORDER BY created_at`,
    [cynnId],
  );
  return rows;
}

/** Claim an edge. It is a claim, not a fact, until the other end agrees. */
export async function claimEdge(params: {
  kind: "parent_of" | "married_to";
  fromId: string;
  toId: string;
  claimedBy: string;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  try {
    await pool.query(
      `INSERT INTO kin_edge (kind, from_id, to_id, claimed_by)
       VALUES ($1, $2, $3, $4)`,
      [params.kind, params.fromId, params.toId, params.claimedBy],
    );
    return { ok: true };
  } catch (err) {
    const e = err as { code?: string; message?: string };
    if (e.code === "23505") return { ok: false, reason: "That claim already exists." };
    if (e.message?.includes("own ancestor")) {
      return { ok: false, reason: "That would make somebody their own ancestor." };
    }
    if (e.message?.includes("two parents")) {
      return { ok: false, reason: "They already have two parents." };
    }
    if (e.code === "23514") return { ok: false, reason: "Nobody is their own parent." };
    console.error("claimEdge failed", err);
    return { ok: false, reason: "The records are unreachable just now." };
  }
}

export async function confirmEdge(edgeId: string, byCharacter: string) {
  await pool.query(
    `UPDATE kin_edge SET confirmed = true, confirmed_at = now(),
                        confirmed_by = $2
      WHERE id = $1 AND confirmed = false`,
    [edgeId, byCharacter],
  );
}
