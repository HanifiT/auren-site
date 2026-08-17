import Link from "next/link";
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
  if (!staff) redirect("/me");

  const [stats, apps, tickets] = await Promise.all([
    adminStats(),
    allApplications(),
    recentTickets(),
  ]);

  const pending = apps.filter((a) => a.status === "pending");

  return (
    <main className="min-h-dvh bg-[#0b0f0c] px-6 py-14 text-[#e8e2d4]">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/"
          className="text-xs uppercase tracking-[0.3em] text-[#e8e2d4]/40 hover:text-[#f0b429]"
        >
          ← Auren
        </Link>

        <h1 className="mt-6 font-serif text-4xl">The Praesidium</h1>
        <p className="mt-1 text-sm text-[#e8e2d4]/50">Staff console</p>

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
                  className="rounded-sm border border-[#f0b429]/30 bg-[#f0b429]/[0.04] p-4"
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="font-serif text-lg">{a.character_name}</span>
                    <span className="text-xs text-[#e8e2d4]/40">#{a.id}</span>
                  </div>
                  <p className="mt-2 text-sm text-[#e8e2d4]/65">
                    {a.answers?.concept}
                  </p>
                  <p className="mt-2 text-xs text-[#e8e2d4]/35">
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
                <thead className="text-left text-xs uppercase tracking-wider text-[#e8e2d4]/40">
                  <tr>
                    <th className="pb-2 font-normal">Name</th>
                    <th className="pb-2 font-normal">Player</th>
                    <th className="pb-2 font-normal">Status</th>
                    <th className="pb-2 font-normal">Submitted</th>
                  </tr>
                </thead>
                <tbody className="align-top">
                  {apps.map((a) => (
                    <tr key={a.id} className="border-t border-white/[0.06]">
                      <td className="py-2.5 pr-4 font-serif">{a.character_name}</td>
                      <td className="py-2.5 pr-4 font-mono text-xs text-[#e8e2d4]/50">
                        {a.applicant_id}
                      </td>
                      <td className="py-2.5 pr-4">
                        <Tag status={a.status} />
                      </td>
                      <td className="py-2.5 text-xs text-[#e8e2d4]/50">
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
                  className="flex items-center justify-between gap-4 rounded-sm border border-white/10 px-4 py-2.5"
                >
                  <span className="truncate text-sm text-[#e8e2d4]/75">
                    {t.topic}
                  </span>
                  <Tag status={t.status} />
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Economy">
          <div className="rounded-sm border border-dashed border-white/15 p-6">
            <p className="text-sm text-[#e8e2d4]/60">
              Not built. There is no economy schema, and there deliberately
              isn&apos;t one yet — the shape of it has not been decided.
            </p>
            <p className="mt-3 text-xs text-[#e8e2d4]/35">
              When it exists it belongs in the same database, written by the bot
              and read here, like everything above. This panel is a placeholder
              rather than a mock so nobody mistakes it for something that works.
            </p>
          </div>
        </Section>
      </div>
    </main>
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
      className={`rounded-sm border p-4 ${
        accent ? "border-[#f0b429]/40" : "border-white/10"
      }`}
    >
      <div
        className={`font-serif text-3xl ${
          accent ? "text-[#f0b429]" : "text-[#e8e2d4]"
        }`}
      >
        {value}
      </div>
      <div className="mt-1 text-[11px] uppercase tracking-wider text-[#e8e2d4]/40">
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
      <h2 className="mb-4 text-xs uppercase tracking-[0.3em] text-[#e8e2d4]/40">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-[#e8e2d4]/50">{children}</p>;
}

const STATUS_COLOUR: Record<string, string> = {
  approved: "border-[#4c9a2a]/50 text-[#a3be5c]",
  pending: "border-[#f0b429]/50 text-[#f0b429]",
  denied: "border-[#6e8b74]/50 text-[#6e8b74]",
  withdrawn: "border-[#6e8b74]/40 text-[#6e8b74]",
  open: "border-[#f0b429]/50 text-[#f0b429]",
  claimed: "border-[#e08a3c]/50 text-[#e08a3c]",
  closed: "border-[#6e8b74]/50 text-[#6e8b74]",
};

function Tag({ status }: { status: string }) {
  return (
    <span
      className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-wider ${
        STATUS_COLOUR[status] ?? "border-white/20 text-white/60"
      }`}
    >
      {status}
    </span>
  );
}

function Unavailable() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#0b0f0c] px-6 text-[#e8e2d4]">
      <p className="max-w-sm text-center text-sm text-[#6e8b74]">
        The records are unreachable, so I can&apos;t confirm you are staff.
        Access is denied rather than assumed.
      </p>
    </main>
  );
}
