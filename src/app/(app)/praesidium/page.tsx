import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import {
  adminStats,
  allApplications,
  isStaff,
  recentTickets,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

/**
 * Staff console.
 *
 * The gate is `account.is_staff`, which the bot writes from live guild roles.
 * The site's Postgres role has no UPDATE grant on that column, so this page
 * cannot be talked into granting access to itself — the worst a bug here can
 * do is deny someone.
 *
 * Losing a staff role in Discord revokes this on the bot's next sync rather
 * than instantly. Worth knowing before treating it as a security boundary for
 * anything graver than reading counts.
 */
export default async function Admin() {
  const session = await getServerSession(authOptions);
  if (!session?.discordId) redirect("/");

  let staff = false;
  try {
    staff = await isStaff(session.discordId);
  } catch {
    // Database down: deny. Failing closed is the only safe direction for a
    // permission check, and it matches how the bot's guard behaves.
    return <Unavailable />;
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
      <div>
        <h1 className="mt-6 font-serif text-4xl">The Praesidium</h1>
        <p className="mt-1 text-sm text-ink-faint">Staff console</p>

        <section className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Accounts" value={stats.accounts} />
          <Stat label="Staff" value={stats.staff} />
          <Stat label="Characters" value={stats.characters} />
          <Stat label="Pending" value={stats.pending} accent={stats.pending > 0} />
          <Stat label="Tickets open" value={stats.ticketsOpen} accent={stats.ticketsOpen > 0} />
          <Stat label="Tickets all" value={stats.ticketsTotal} />
        </section>

        {pending.length > 0 && (
          <Section title={`Awaiting review — ${pending.length}`}>
            <ul className="space-y-3">
              {pending.map((a) => (
                <li
                  key={a.id}
                  className="border border-vellum-deep bg-[rgba(148,48,30,.05)] p-4"
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="font-serif text-lg">{a.character_name}</span>
                    <span className="text-xs text-ink-faint">#{a.id}</span>
                  </div>
                  <p className="mt-2 text-sm text-ink-soft">
                    {a.answers?.concept}
                  </p>
                  <p className="mt-2 text-xs text-ink-faint">
                    decide in Discord — approve and deny live on the review
                    message, so every decision has an author
                  </p>
                </li>
              ))}
            </ul>
          </Section>
        )}

        <Section title="Characters">
          {apps.length === 0 ? (
            <Empty>Nobody has applied yet.</Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[34rem] text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-ink-faint">
                  <tr>
                    <th className="pb-2 font-normal">Name</th>
                    <th className="pb-2 font-normal">Player</th>
                    <th className="pb-2 font-normal">Status</th>
                    <th className="pb-2 font-normal">Submitted</th>
                  </tr>
                </thead>
                <tbody className="align-top">
                  {apps.map((a) => (
                    <tr key={a.id} className="border-t border-vellum-deep">
                      <td className="py-2.5 pr-4 font-serif">{a.character_name}</td>
                      <td className="py-2.5 pr-4 font-mono text-xs text-ink-faint">
                        {a.applicant_id}
                      </td>
                      <td className="py-2.5 pr-4">
                        <Tag status={a.status} />
                      </td>
                      <td className="py-2.5 text-xs text-ink-faint">
                        {new Date(a.submitted_at).toISOString().slice(0, 10)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section title="Petitions">
          {tickets.length === 0 ? (
            <Empty>No tickets yet.</Empty>
          ) : (
            <ul className="space-y-2">
              {tickets.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-4 border border-vellum-deep px-4 py-2.5"
                >
                  <span className="truncate text-sm text-ink-soft">
                    {t.topic}
                  </span>
                  <Tag status={t.status} />
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Economy">
          <div className="border border-dashed border-vellum-deep p-6">
            <p className="text-sm text-ink-soft">
              Not built. There is no economy schema, and there deliberately
              isn&apos;t one yet — the shape of it has not been decided.
            </p>
            <p className="mt-3 text-xs text-ink-faint">
              When it exists it belongs in the same database, written by the bot
              and read here, like everything above. This panel is a placeholder
              rather than a mock so nobody mistakes it for something that works.
            </p>
          </div>
        </Section>
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div
      className={`border p-4 ${
        accent ? "border-vellum-deep" : "border-vellum-deep"
      }`}
    >
      <div
        className={`font-serif text-3xl ${
          accent ? "text-rubric" : "text-ink"
        }`}
      >
        {value}
      </div>
      <div className="mt-1 text-[11px] uppercase tracking-wider text-ink-faint">
        {label}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12">
      <h2 className="mb-4 text-xs uppercase tracking-[0.3em] text-ink-faint">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-ink-faint">{children}</p>;
}

const STATUS_COLOUR: Record<string, string> = {
  approved: "border-[#4d6b3f] text-[#4d6b3f]",
  pending: "border-gilt text-gilt",
  denied: "border-vellum-deep text-ink-faint",
  withdrawn: "border-vellum-deep text-ink-faint",
  open: "border-gilt text-gilt",
  claimed: "border-[#e08a3c]/50 text-[#e08a3c]",
  closed: "border-vellum-deep text-ink-faint",
};

function Tag({ status }: { status: string }) {
  return (
    <span
      className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-wider ${
        STATUS_COLOUR[status] ?? "border-vellum-deep text-white/60"
      }`}
    >
      {status}
    </span>
  );
}

function Unavailable() {
  return (
    <div className="grid place-items-center py-24">
      <p className="max-w-sm text-center text-sm text-ink-faint">
        The records are unreachable, so I can&apos;t confirm you are staff.
        Access is denied rather than assumed.
      </p>
    </div>
  );
}
