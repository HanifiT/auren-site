import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import {
  adminStats,
  allApplications,
  isStaff,
  recentTickets,
} from "@/lib/queries";
import { Empty, PageHead, Stamp, Strip, onDay } from "@/components/register";
import { Ornament } from "@/components/ornament";

export const dynamic = "force-dynamic";

/**
 * The Praesidium — staff only.
 *
 * The gate is `account.is_staff`, which the bot writes from live guild roles.
 * The site's Postgres role has no UPDATE grant on that column, so this page
 * cannot be talked into granting access to itself — the worst a bug here can do
 * is deny somebody. Losing a staff role in Discord revokes this on the bot's
 * next sync rather than instantly, which is worth knowing before treating it as
 * a boundary for anything graver than reading counts.
 *
 * The rail hides the link for non-staff; that is presentation. This check is
 * the one that matters, and it fails closed when the database is unreachable.
 *
 * EVERY DECISION STILL HAPPENS IN DISCORD. The site has INSERT on `application`
 * and deliberately not UPDATE (db/004), so it can put a row in the review queue
 * and can never approve one. This console reads the queue; it does not work it.
 */
export default async function Praesidium() {
  const session = await getServerSession(authOptions);
  if (!session?.discordId) redirect("/");

  let staff = false;
  try {
    staff = await isStaff(session.discordId);
  } catch {
    // Database down: deny. Failing closed is the only safe direction for a
    // permission check, and it matches how the bot's guard behaves.
    return (
      <>
        <PageHead eyebrow="Staff console" title="The Praesidium" />
        <Empty
          title="The records are unreachable."
          line="So I cannot confirm you are staff. Access is denied rather than assumed."
        />
      </>
    );
  }
  if (!staff) redirect("/hearth");

  const [stats, apps, tickets] = await Promise.all([
    adminStats(),
    allApplications(),
    recentTickets(),
  ]);
  const pending = apps.filter((a) => a.status === "pending");

  return (
    <>
      <PageHead
        eyebrow="Staff console"
        title="The Praesidium"
        lede="Counts, the roll, and the petitions. Everything below is read from the same database the bot writes."
      />

      <Strip
        cells={[
          { n: stats.accounts, label: "accounts" },
          { n: stats.staff, label: "staff" },
          { n: stats.characters, label: "characters" },
          { n: stats.pending, label: "awaiting review" },
          { n: stats.ticketsOpen, label: "petitions open" },
          { n: stats.ticketsTotal, label: "petitions all" },
        ]}
      />

      {pending.length > 0 && (
        <>
          <div className="section-head">
            <Ornament mark="toadstool" />
            <h2>Awaiting review — {pending.length}</h2>
          </div>
          <ul className="roster">
            {pending.map((a) => (
              <li key={a.id} className="pending-row">
                <div>
                  <p className="roster-main" style={{ fontSize: "1.1rem" }}>
                    {a.character_name}
                  </p>
                  {a.answers?.concept && (
                    <p className="roster-note">{a.answers.concept}</p>
                  )}
                </div>
                <Stamp word="decide in Discord" tone="gold" />
              </li>
            ))}
          </ul>
          <p className="quiet" style={{ marginTop: "0.7rem" }}>
            Approve and deny live on the review message, so every decision has an
            author. The site has no UPDATE grant on `application` and could not
            approve one if it tried.
          </p>
        </>
      )}

      <div className="section-head">
        <h2>The roll</h2>
      </div>
      {apps.length === 0 ? (
        <Empty title="Nobody has applied yet." line="The census is empty." />
      ) : (
        <div className="scroll-x">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Player</th>
                <th>Status</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {apps.map((a) => (
                <tr key={a.id}>
                  <td style={{ fontFamily: "var(--font-display)" }}>
                    {a.character_name}
                  </td>
                  <td className="quiet snowflake">{a.applicant_id}</td>
                  <td>
                    <Stamp
                      word={a.status}
                      tone={a.status === "approved" ? "leaf" : a.status === "pending" ? "gold" : "quiet"}
                    />
                  </td>
                  <td className="quiet">{onDay(a.submitted_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="section-head">
        <h2>Petitions</h2>
      </div>
      {tickets.length === 0 ? (
        <Empty title="Nothing open." line="No tickets have been raised." />
      ) : (
        <ul className="roster">
          {tickets.map((t) => (
            <li key={t.id} className="pending-row">
              <span className="roster-main">{t.topic}</span>
              <Stamp
                word={t.status}
                tone={t.status === "closed" ? "quiet" : "gold"}
              />
            </li>
          ))}
        </ul>
      )}

      <div className="section-head">
        <h2>Economy</h2>
      </div>
      <div className="unbuilt">
        <p>
          <b>Not built.</b> There is no economy schema, and there deliberately
          isn&apos;t one yet — the shape of it has not been decided.
        </p>
        <p className="quiet" style={{ marginTop: "0.6rem" }}>
          When it exists it belongs in the same database, written by the bot and
          read here, like everything above. This panel is a placeholder rather
          than a mock so that nobody mistakes it for something that works. The
          shilling ledger (db/005) is a different thing: it exists, it balances,
          and it is what the House purse is read from.
        </p>
      </div>
    </>
  );
}
