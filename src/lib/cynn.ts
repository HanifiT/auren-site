import { pool } from "./db";

/**
 * Houses, characters, and the draw.
 *
 * The site may write prose and origin. It may not write standing — `ar`,
 * `successions`, the draw columns and `wemm` are not in its INSERT grant, let
 * alone its UPDATE grant (db/008). The draw happens through `cynn_draw()`, a
 * SECURITY DEFINER function the site may EXECUTE but whose columns it cannot
 * touch: it asks for a draw and is handed the result.
 */

export type Cynn = {
  id: string;
  name: string;
  motto: string | null;
  crest_path: string | null;
  origin_town: string;
  draw_card_id: string | null;
  draw_text: string | null;
  draw_hook: string | null;
  ar: number;
  successions: number;
};

export type Character = {
  id: string;
  cynn_id: string | null;
  name: string;
  age: number | null;
  portrait_path: string | null;
  short: string | null;
  bio: string | null;
  bearing: string | null;
  trade: string | null;
  membership: "pending" | "admitted" | "disowned";
  status: "living" | "dead";
};

export async function cynnFor(discordId: string): Promise<Cynn | null> {
  const { rows } = await pool.query<Cynn>(
    `SELECT c.id::text, c.name, c.motto, c.crest_path, c.origin_town,
            c.draw_card_id, c.draw_text, c.draw_hook, c.ar, c.successions
       FROM cynn c JOIN character ch ON ch.cynn_id = c.id
      WHERE ch.owner_id = $1 AND ch.status = 'living'
      LIMIT 1`,
    [discordId],
  );
  return rows[0] ?? null;
}

export async function characterFor(discordId: string): Promise<Character | null> {
  const { rows } = await pool.query<Character>(
    `SELECT id::text, cynn_id::text, name, age, portrait_path, short, bio,
            bearing, trade, membership, status
       FROM character WHERE owner_id = $1 AND status = 'living' LIMIT 1`,
    [discordId],
  );
  return rows[0] ?? null;
}

export async function listHouses(): Promise<{ id: string; name: string; ar: number }[]> {
  const { rows } = await pool.query(
    `SELECT id::text, name, ar FROM cynn
      WHERE disbanded_at IS NULL ORDER BY name`,
  );
  return rows;
}

/**
 * Found a House and make its first character, in one transaction.
 *
 * Both or neither: a House with no members is unreachable, and a character
 * with no House has nowhere to put its standing.
 */
export async function foundCynn(params: {
  discordId: string;
  houseName: string;
  motto: string;
  originTown: string;
  crestPath: string | null;
  character: {
    name: string; age: number | null; short: string; bio: string;
    bearing: string; trade: string; portraitPath: string | null;
  };
}): Promise<{ ok: true; cynnId: string } | { ok: false; reason: string }> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO cynn (name, motto, crest_path, origin_town, founded_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING id::text`,
      [params.houseName, params.motto || null, params.crestPath,
       params.originTown, params.discordId],
    );
    const cynnId = rows[0].id;
    const c = params.character;
    // The founder admits themselves — there is nobody else to do it, and the
    // consent rule exists to stop people attaching to someone else's name.
    await client.query(
      `INSERT INTO character
         (owner_id, cynn_id, name, age, portrait_path, short, bio, bearing, trade)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [params.discordId, cynnId, c.name, c.age, c.portraitPath,
       c.short, c.bio, c.bearing, c.trade],
    );
    await client.query(
      `UPDATE character SET membership = 'admitted', admitted_at = now(),
                            admitted_by = $1
        WHERE owner_id = $1 AND cynn_id = $2`,
      [params.discordId, cynnId],
    );
    await client.query("COMMIT");
    return { ok: true, cynnId };
  } catch (err) {
    await client.query("ROLLBACK");
    const e = err as { code?: string; message?: string };
    if (e.code === "23505") {
      return { ok: false, reason: "A House already carries that name." };
    }
    if (e.code === "42501") {
      // Exactly what the column grants are for.
      return { ok: false, reason: "That field is not the site's to write." };
    }
    console.error("foundCynn failed", err);
    return { ok: false, reason: "The records are unreachable just now." };
  } finally {
    client.release();
  }
}

/** Petition to join. Stays pending until the House admits it. */
export async function petitionCynn(params: {
  discordId: string;
  cynnId: string;
  character: {
    name: string; age: number | null; short: string; bio: string;
    bearing: string; trade: string; portraitPath: string | null;
  };
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const c = params.character;
  try {
    await pool.query(
      `INSERT INTO character
         (owner_id, cynn_id, name, age, portrait_path, short, bio, bearing, trade)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [params.discordId, params.cynnId, c.name, c.age, c.portraitPath,
       c.short, c.bio, c.bearing, c.trade],
    );
    return { ok: true };
  } catch (err) {
    console.error("petitionCynn failed", err);
    return { ok: false, reason: "The records are unreachable just now." };
  }
}

/**
 * Draw the House's history.
 *
 * Committed inside the function before it returns — the client animates toward
 * a result it was handed and never produces one. Calling twice raises.
 */
export async function drawFor(cynnId: string): Promise<
  | { ok: true; card: { ar: number; line: string; text: string; hook: string | null } }
  | { ok: false; reason: string }
> {
  try {
    const { rows } = await pool.query(
      "SELECT ar, line, text, hook FROM cynn_draw($1)",
      [cynnId],
    );
    const r = rows[0];
    return { ok: true, card: { ar: r.ar, line: r.line, text: r.text, hook: r.hook } };
  } catch (err) {
    const msg = (err as { message?: string }).message ?? "";
    if (msg.includes("already drawn")) {
      return { ok: false, reason: "This House has already drawn its history." };
    }
    console.error("drawFor failed", err);
    return { ok: false, reason: "The dice could not be recorded." };
  }
}

export type Deed = {
  tier: string;
  ar: number;
  reason: string;
  awarded_at: Date;
};

export async function deedsFor(cynnId: string): Promise<Deed[]> {
  const { rows } = await pool.query<Deed>(
    `SELECT tier, ar, reason, awarded_at FROM deed
      WHERE cynn_id = $1 ORDER BY awarded_at DESC LIMIT 10`,
    [cynnId],
  );
  return rows;
}
