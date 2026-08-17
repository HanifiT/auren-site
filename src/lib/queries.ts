import { pool } from "./db";

/**
 * Read-only queries for the site.
 *
 * The bot owns every table read here; the site's Postgres role has SELECT and
 * nothing more on them (db/002_site_grants.sql). So these are queries, never
 * mutations, and that boundary is enforced below this code rather than by it.
 *
 * `discord_id` is returned as a string everywhere. Postgres BIGINT exceeds
 * Number.MAX_SAFE_INTEGER, and `pg` hands back a string for exactly that
 * reason — coercing it to a number silently corrupts the last digits.
 */

export type ApplicationRow = {
  id: string;
  applicant_id: string;
  character_name: string;
  answers: Record<string, string>;
  status: "pending" | "approved" | "denied" | "withdrawn";
  submitted_at: Date;
  decided_at: Date | null;
};

export type TicketRow = {
  id: string;
  topic: string;
  status: "open" | "claimed" | "closed";
  opened_at: Date;
  closed_at: Date | null;
};

/** Approved characters, newest first. The public roster. */
export async function approvedCharacters(limit = 60): Promise<ApplicationRow[]> {
  const { rows } = await pool.query<ApplicationRow>(
    `SELECT id::text, applicant_id::text, character_name, answers,
            status, submitted_at, decided_at
       FROM application
      WHERE status = 'approved'
      ORDER BY decided_at DESC NULLS LAST
      LIMIT $1`,
    [limit],
  );
  return rows;
}

export async function charactersFor(discordId: string): Promise<ApplicationRow[]> {
  const { rows } = await pool.query<ApplicationRow>(
    `SELECT id::text, applicant_id::text, character_name, answers,
            status, submitted_at, decided_at
       FROM application
      WHERE applicant_id = $1
      ORDER BY submitted_at DESC`,
    [discordId],
  );
  return rows;
}

export async function ticketsFor(discordId: string): Promise<TicketRow[]> {
  const { rows } = await pool.query<TicketRow>(
    `SELECT id::text, topic, status, opened_at, closed_at
       FROM ticket
      WHERE opener_id = $1
      ORDER BY opened_at DESC
      LIMIT 25`,
    [discordId],
  );
  return rows;
}
