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

/** Is this account staff? Written by the bot from guild roles; the site's
 *  Postgres role has no UPDATE grant on the column, so it cannot be forged
 *  from here even by a bug in this file. */
export async function isStaff(discordId: string): Promise<boolean> {
  const { rows } = await pool.query<{ is_staff: boolean }>(
    "SELECT is_staff FROM account WHERE discord_id = $1",
    [discordId],
  );
  return rows[0]?.is_staff === true;
}

/** Every application, any status. Admin only. */
export async function allApplications(limit = 200): Promise<ApplicationRow[]> {
  const { rows } = await pool.query<ApplicationRow>(
    `SELECT id::text, applicant_id::text, character_name, answers,
            status, submitted_at, decided_at
       FROM application
      ORDER BY (status = 'pending') DESC, submitted_at DESC
      LIMIT $1`,
    [limit],
  );
  return rows;
}

export type AdminStats = {
  accounts: number;
  staff: number;
  characters: number;
  pending: number;
  ticketsOpen: number;
  ticketsTotal: number;
};

export async function adminStats(): Promise<AdminStats> {
  const { rows } = await pool.query<Record<string, string>>(`
    SELECT
      (SELECT count(*) FROM account)                              AS accounts,
      (SELECT count(*) FROM account WHERE is_staff)               AS staff,
      (SELECT count(*) FROM application WHERE status='approved')  AS characters,
      (SELECT count(*) FROM application WHERE status='pending')   AS pending,
      (SELECT count(*) FROM ticket WHERE status <> 'closed')      AS tickets_open,
      (SELECT count(*) FROM ticket)                               AS tickets_total
  `);
  const r = rows[0] ?? {};
  const n = (v: string | undefined) => Number(v ?? 0);
  return {
    accounts: n(r.accounts), staff: n(r.staff),
    characters: n(r.characters), pending: n(r.pending),
    ticketsOpen: n(r.tickets_open), ticketsTotal: n(r.tickets_total),
  };
}

export async function recentTickets(limit = 25): Promise<
  (TicketRow & { opener_id: string })[]
> {
  const { rows } = await pool.query<TicketRow & { opener_id: string }>(
    `SELECT id::text, opener_id::text, topic, status, opened_at, closed_at
       FROM ticket ORDER BY opened_at DESC LIMIT $1`,
    [limit],
  );
  return rows;
}
