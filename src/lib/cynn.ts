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
  colour: number | null;
  founded_at: Date;
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
  hair_colour: string | null;
  hair_style: string | null;
  eyes: string | null;
  complexion: string | null;
  build: string | null;
  height_cm: number | null;
  marks: string | null;
  membership: "pending" | "admitted" | "disowned";
  /**
   * `departed` is a third value, not a delete — see db/016. Someone who takes
   * passage off the island stays on the roll with the line struck through; the
   * row is never removed and the name is never freed.
   */
  status: "living" | "dead" | "departed";
  at_town: string | null;
  created_at: Date;
};

/** What the census hands the database. Appearance is optional throughout. */
export type NewCharacter = {
  name: string;
  age: number | null;
  short: string;
  bio: string;
  bearing: string;
  trade: string;
  portraitPath: string | null;
  hairColour: string | null;
  hairStyle: string | null;
  eyes: string | null;
  complexion: string | null;
  build: string | null;
  heightCm: number | null;
  marks: string | null;
};

/**
 * The one place the character columns are listed.
 *
 * Founding and petitioning differ in what happens *around* the insert, never
 * in what a character is — writing the column list twice is how the two drift
 * and one of them silently stops recording someone's hair.
 */
const CHARACTER_INSERT = `
  INSERT INTO character
    (owner_id, cynn_id, name, age, portrait_path, short, bio, bearing, trade,
     hair_colour, hair_style, eyes, complexion, build, height_cm, marks)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`;

function characterValues(
  discordId: string,
  cynnId: string,
  c: NewCharacter,
): unknown[] {
  return [
    discordId, cynnId, c.name, c.age, c.portraitPath, c.short, c.bio,
    c.bearing, c.trade, c.hairColour, c.hairStyle, c.eyes, c.complexion,
    c.build, c.heightCm, c.marks,
  ];
}

export async function cynnFor(discordId: string): Promise<Cynn | null> {
  const { rows } = await pool.query<Cynn>(
    `SELECT c.id::text, c.name, c.motto, c.crest_path, c.origin_town,
            c.draw_card_id, c.draw_text, c.draw_hook, c.ar, c.successions,
            c.colour, c.founded_at
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
            bearing, trade, hair_colour, hair_style, eyes, complexion, build,
            height_cm, marks, membership, status, at_town, created_at
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
 * The colours the standing Houses already wear.
 *
 * Read before the insert so a collision is a sentence in the form rather than
 * a constraint violation after the crest has been uploaded. The unique index
 * is still the authority — this races, and losing the race is handled below.
 */
export async function takenColours(): Promise<number[]> {
  const { rows } = await pool.query<{ colour: number }>(
    `SELECT colour FROM cynn WHERE disbanded_at IS NULL AND colour IS NOT NULL`,
  );
  return rows.map((r) => Number(r.colour));
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
  colour: number;
  character: NewCharacter;
}): Promise<{ ok: true; cynnId: string } | { ok: false; reason: string }> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO cynn (name, motto, crest_path, origin_town, founded_by, colour)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id::text`,
      [params.houseName, params.motto || null, params.crestPath,
       params.originTown, params.discordId, params.colour],
    );
    const cynnId = rows[0].id;
    const c = params.character;
    // The founder admits themselves — there is nobody else to do it, and the
    // consent rule exists to stop people attaching to someone else's name.
    await client.query(CHARACTER_INSERT, characterValues(params.discordId, cynnId, c));
    // Not an UPDATE: `membership`, `admitted_at` and `admitted_by` are outside
    // the site's grants on purpose, because a site that can write membership is
    // a site where one bug admits anyone to any House. `cynn_admit_founder`
    // (db/013) is SECURITY DEFINER and carries the "only the founder, only
    // once, only at founding" rule with it.
    await client.query("SELECT cynn_admit_founder($1, $2)", [cynnId, params.discordId]);
    await client.query("COMMIT");
    return { ok: true, cynnId };
  } catch (err) {
    await client.query("ROLLBACK");
    const e = err as { code?: string; constraint?: string; message?: string };
    // A real constraint violation carries `constraint`; the ones raised by
    // cynn_admit_founder do not, which is the only way to tell "that name is
    // taken" from "you are already in the census" — both are 23505.
    if (e.code === "23505" && e.constraint === "cynn_colour_unique") {
      // Lost the race against another founding between takenColours() and
      // here. Rare, and the only honest thing to say is "pick another".
      return { ok: false, reason: "A House has just taken that colour. Choose another." };
    }
    if (e.code === "23505" && e.constraint) {
      return { ok: false, reason: "A House already carries that name." };
    }
    if (e.code === "23505") {
      return {
        ok: false,
        reason: e.message?.includes("already entered")
          ? "You are already entered in the census — one living name each."
          : "That House has already been founded.",
      };
    }
    if (e.code === "42501") {
      // Reaching this now means a grant is genuinely missing, not that the
      // founding path is trying to write membership — see db/013.
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
  character: NewCharacter;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const c = params.character;
  try {
    await pool.query(CHARACTER_INSERT, characterValues(params.discordId, params.cynnId, c));
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
