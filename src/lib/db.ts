import { Pool } from "pg";

/**
 * Postgres pool.
 *
 * The bot owns this database; the site reads it and writes only the parts of
 * `account` that a login legitimately produces. That boundary is enforced by
 * grants in db/002_site_grants.sql, not by convention here — so a bug in this
 * file cannot, for example, set is_staff.
 *
 * The pool is cached on globalThis because Next's dev server re-evaluates
 * modules on every hot reload, and a fresh pool per reload exhausts Postgres
 * connections within a few minutes of editing.
 */
const globalForPg = globalThis as unknown as { aurenPool?: Pool };

export const pool =
  globalForPg.aurenPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
  });

if (process.env.NODE_ENV !== "production") globalForPg.aurenPool = pool;

export type Account = {
  discord_id: string;
  username: string;
  global_name: string | null;
  avatar_hash: string | null;
  first_seen_at: Date;
  last_login_at: Date | null;
  in_guild: boolean;
  is_staff: boolean;
};

/**
 * Record a login. Inserts on first sight, refreshes the mutable fields after.
 *
 * `discord_id` arrives as a string because Discord snowflakes exceed
 * Number.MAX_SAFE_INTEGER — parsing one into a JS number silently corrupts the
 * last few digits, and the corruption looks like a valid id.
 */
export async function recordLogin(params: {
  discordId: string;
  username: string;
  globalName: string | null;
  avatarHash: string | null;
  inGuild: boolean;
}): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(
      `INSERT INTO account (discord_id, username, global_name, avatar_hash,
                            in_guild, last_login_at)
       VALUES ($1, $2, $3, $4, $5, now())
       ON CONFLICT (discord_id) DO UPDATE
         SET username      = EXCLUDED.username,
             global_name   = EXCLUDED.global_name,
             avatar_hash   = EXCLUDED.avatar_hash,
             in_guild      = EXCLUDED.in_guild,
             last_login_at = now()`,
      [
        params.discordId,
        params.username,
        params.globalName,
        params.avatarHash,
        params.inGuild,
      ],
    );
  } finally {
    client.release();
  }
}

export async function getAccount(discordId: string): Promise<Account | null> {
  const { rows } = await pool.query<Account>(
    "SELECT * FROM account WHERE discord_id = $1",
    [discordId],
  );
  return rows[0] ?? null;
}
