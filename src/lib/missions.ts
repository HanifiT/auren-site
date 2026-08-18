import { pool } from "./db";

/**
 * The job board.
 *
 * Staff post work here; Houses claim it; settling pays the House purse and may
 * attribute a deed. All three are driven from the web, which is why the
 * settlement path matters: the site has no INSERT on `ledger` and is not
 * getting one, so `mission_settle()` is a SECURITY DEFINER function the site
 * may EXECUTE but whose tables it cannot touch.
 *
 * `reward_pence` on a mission is a *posted price*. Writing it creates no
 * money; the only thing that does is a balanced batch attributed to the Crown,
 * written by that function.
 */

export type Mission = {
  id: string;
  title: string;
  brief: string;
  reward_pence: number;
  ar_tier: string | null;
  slots: number | null;
  town: string | null;
  status: "open" | "closed";
  posted_at: Date;
  closes_at: Date | null;
  taken: number;
};

export type Claim = {
  id: string;
  mission_id: string;
  title: string;
  reward_pence: number;
  ar_tier: string | null;
  status: "claimed" | "submitted" | "paid" | "rejected";
  note: string | null;
  claimed_at: Date;
  house_name?: string;
};

export async function openMissions(): Promise<Mission[]> {
  const { rows } = await pool.query<Mission>(
    `SELECT m.id::text, m.title, m.brief, m.reward_pence, m.ar_tier, m.slots,
            m.town, m.status, m.posted_at, m.closes_at,
            (SELECT count(*) FROM mission_claim c
              WHERE c.mission_id = m.id AND c.status <> 'rejected')::int AS taken
       FROM mission m
      WHERE m.status = 'open'
        AND (m.closes_at IS NULL OR m.closes_at > now())
      ORDER BY m.posted_at DESC`,
  );
  return rows;
}

export async function claimsFor(cynnId: string): Promise<Claim[]> {
  const { rows } = await pool.query<Claim>(
    `SELECT c.id::text, c.mission_id::text, m.title, m.reward_pence, m.ar_tier,
            c.status, c.note, c.claimed_at
       FROM mission_claim c JOIN mission m ON m.id = c.mission_id
      WHERE c.cynn_id = $1 ORDER BY c.claimed_at DESC`,
    [cynnId],
  );
  return rows;
}

/** Everything awaiting a staff decision. */
export async function submittedClaims(): Promise<Claim[]> {
  const { rows } = await pool.query<Claim>(
    `SELECT c.id::text, c.mission_id::text, m.title, m.reward_pence, m.ar_tier,
            c.status, c.note, c.claimed_at, cy.name AS house_name
       FROM mission_claim c
       JOIN mission m ON m.id = c.mission_id
       JOIN cynn cy ON cy.id = c.cynn_id
      WHERE c.status = 'submitted' ORDER BY c.submitted_at`,
  );
  return rows;
}

export async function postMission(params: {
  title: string; brief: string; rewardPence: number;
  arTier: string | null; slots: number | null; town: string | null;
  postedBy: string;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  try {
    await pool.query(
      `INSERT INTO mission (title, brief, reward_pence, ar_tier, slots, town,
                            posted_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [params.title, params.brief, params.rewardPence, params.arTier,
       params.slots, params.town, params.postedBy],
    );
    return { ok: true };
  } catch (err) {
    console.error("postMission failed", err);
    return { ok: false, reason: "That could not be posted." };
  }
}

export async function claimMission(params: {
  missionId: string; cynnId: string; characterId: string | null;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  try {
    await pool.query(
      `INSERT INTO mission_claim (mission_id, cynn_id, character_id)
       VALUES ($1, $2, $3)`,
      [params.missionId, params.cynnId, params.characterId],
    );
    return { ok: true };
  } catch (err) {
    const e = err as { code?: string; message?: string };
    // The slot trigger and the one-claim-per-House index both speak plainly.
    if (e.code === "23505") return { ok: false, reason: "Your House already has this work." };
    if (e.message?.includes("places on that work")) {
      return { ok: false, reason: "Every place on that work is taken." };
    }
    if (e.message?.includes("is closed")) {
      return { ok: false, reason: "That work is closed." };
    }
    console.error("claimMission failed", err);
    return { ok: false, reason: "The records are unreachable just now." };
  }
}

export async function submitClaim(claimId: string, cynnId: string, note: string) {
  // Scoped by cynn_id so a claim id from someone else's House does nothing.
  await pool.query(
    `UPDATE mission_claim SET note = $3, status = 'submitted',
                              submitted_at = now()
      WHERE id = $1 AND cynn_id = $2 AND status = 'claimed'`,
    [claimId, cynnId, note],
  );
}

/** Pay or reject. Goes through the function; the site writes no ledger row. */
export async function settleClaim(
  claimId: string, actor: string, pay: boolean,
): Promise<{ ok: true; paid: number; ar: number } | { ok: false; reason: string }> {
  try {
    const { rows } = await pool.query<{ paid_pence: number; ar_awarded: number }>(
      "SELECT paid_pence, ar_awarded FROM mission_settle($1, $2, $3)",
      [claimId, actor, pay],
    );
    return { ok: true, paid: rows[0]?.paid_pence ?? 0, ar: rows[0]?.ar_awarded ?? 0 };
  } catch (err) {
    const msg = (err as { message?: string }).message ?? "";
    if (msg.includes("already been settled")) {
      return { ok: false, reason: "That was already settled." };
    }
    console.error("settleClaim failed", err);
    return { ok: false, reason: "That could not be settled." };
  }
}
