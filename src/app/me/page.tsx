import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { charactersFor, isStaff, ticketsFor } from "@/lib/queries";
import { balanceOf, getSheet } from "@/lib/sheet";
import { STATS, formatPence } from "@/lib/stats";
import { SignOut } from "@/components/auth-buttons";

export const dynamic = "force-dynamic";

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
      className={`rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-wider ${
        STATUS_COLOUR[status] ?? "border-white/20 text-white/60"
      }`}
    >
      {status}
    </span>
  );
}

export default async function Me() {
  const session = await getServerSession(authOptions);
  if (!session?.discordId) redirect("/");

  // If the database is down the page should say so, not 500. The bot owns
  // this data and the site is a reader; a reader that cannot read is a
  // degraded page, not a broken one.
  let characters: Awaited<ReturnType<typeof charactersFor>> = [];
  let tickets: Awaited<ReturnType<typeof ticketsFor>> = [];
  let unavailable = false;
  let staff = false;
  let sheet: Awaited<ReturnType<typeof getSheet>> = null;
  let purse = 0;
  try {
    [characters, tickets, staff, sheet, purse] = await Promise.all([
      charactersFor(session.discordId),
      ticketsFor(session.discordId),
      isStaff(session.discordId),
      getSheet(session.discordId),
      balanceOf(session.discordId),
    ]);
  } catch {
    unavailable = true;
  }

  return (
    <main className="min-h-dvh bg-[#0b0f0c] px-6 py-16 text-[#e8e2d4]">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="text-xs uppercase tracking-[0.3em] text-[#e8e2d4]/40 hover:text-[#f0b429]">
          ← Auren
        </Link>

        <h1 className="mt-6 font-serif text-4xl">{session.user?.name}</h1>
        <p className="mt-1 text-sm text-[#e8e2d4]/50">
          {session.inGuild ? "of the island" : "not yet of the island"}
        </p>

        {unavailable && (
          <p className="mt-8 rounded-sm border border-[#6e8b74]/40 px-4 py-3 text-sm text-[#6e8b74]">
            The records are unreachable just now. Nothing is lost — try again shortly.
          </p>
        )}

        <section className="mt-12">
          <h2 className="text-xs uppercase tracking-[0.3em] text-[#e8e2d4]/40">
            Characters
          </h2>
          {characters.length === 0 ? (
            <p className="mt-4 text-sm text-[#e8e2d4]/50">
              None yet. Submit one in the server.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {characters.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between rounded-sm border border-white/10 px-4 py-3"
                >
                  <span className="font-serif text-lg">{c.character_name}</span>
                  <Tag status={c.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {sheet && (
          <section className="mt-12">
            <h2 className="text-xs uppercase tracking-[0.3em] text-[#e8e2d4]/40">
              The record
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {STATS.map((stat) => {
                const score = sheet![stat.key];
                const mod = Math.floor((score - 10) / 2);
                return (
                  <div
                    key={stat.key}
                    className="rounded-sm border border-white/10 p-4 text-center"
                  >
                    <div className="font-serif text-3xl text-[#f0b429]">
                      {score}
                    </div>
                    <div className="mt-1 text-xs text-[#e8e2d4]/40">
                      {mod >= 0 ? `+${mod}` : mod}
                    </div>
                    <div className="mt-2 font-serif text-sm">{stat.name}</div>
                    <div className="text-[10px] text-[#e8e2d4]/35">
                      {stat.gloss}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex items-baseline justify-between rounded-sm border border-[#f0b429]/25 px-4 py-3">
              <span className="text-xs uppercase tracking-[0.2em] text-[#e8e2d4]/50">
                Purse
              </span>
              <span className="font-serif text-2xl text-[#f0b429]">
                {formatPence(purse)}
              </span>
            </div>
            <p className="mt-2 text-[11px] text-[#e8e2d4]/30">
              Crown scrip. Good on the island.
            </p>
          </section>
        )}

        <section className="mt-12">
          <h2 className="text-xs uppercase tracking-[0.3em] text-[#e8e2d4]/40">
            Petitions
          </h2>
          {tickets.length === 0 ? (
            <p className="mt-4 text-sm text-[#e8e2d4]/50">None.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {tickets.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-4 rounded-sm border border-white/10 px-4 py-3"
                >
                  <span className="truncate text-sm text-[#e8e2d4]/80">
                    {t.topic}
                  </span>
                  <Tag status={t.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="mt-16 flex items-center gap-3">
          <SignOut />
          {staff && (
            <Link
              href="/admin"
              className="rounded-sm border border-[#f0b429]/60 px-7 py-3 text-sm uppercase tracking-[0.25em] text-[#f0b429] transition-colors hover:bg-[#f0b429] hover:text-[#0b0f0c]"
            >
              Praesidium
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
