import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { characterFor, cynnFor, deedsFor, type Deed } from "@/lib/cynn";
import { isStaff, ticketsFor } from "@/lib/queries";
import { SignOut } from "@/components/auth-buttons";
import { TOWNS } from "@/lib/options";

export const dynamic = "force-dynamic";

/** Pence -> `£1 2s 10d`. Mirrors core/money.py. */
function formatPence(pence: number): string {
  const sign = pence < 0 ? "-" : "";
  const n = Math.abs(Math.trunc(pence));
  const parts: string[] = [];
  const pounds = Math.floor(n / 240);
  const shillings = Math.floor((n % 240) / 12);
  const d = n % 12;
  if (pounds) parts.push(`£${pounds}`);
  if (shillings) parts.push(`${shillings}s`);
  if (d || parts.length === 0) parts.push(`${d}d`);
  return sign + parts.join(" ");
}

const STATUS_COLOUR: Record<string, string> = {
  admitted: "border-[#4c9a2a]/50 text-[#a3be5c]",
  pending: "border-[#f0b429]/50 text-[#f0b429]",
  disowned: "border-[#6e8b74]/50 text-[#6e8b74]",
  open: "border-[#f0b429]/50 text-[#f0b429]",
  claimed: "border-[#e08a3c]/50 text-[#e08a3c]",
  closed: "border-[#6e8b74]/50 text-[#6e8b74]",
};

function Tag({ status }: { status: string }) {
  return (
    <span className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-wider ${
      STATUS_COLOUR[status] ?? "border-white/20 text-white/60"}`}>
      {status}
    </span>
  );
}

export default async function Me() {
  const session = await getServerSession(authOptions);
  if (!session?.discordId) redirect("/");

  let character = null, cynn = null;
  let deeds: Deed[] = [];
  let tickets: Awaited<ReturnType<typeof ticketsFor>> = [];
  let staff = false, unavailable = false;
  try {
    [character, cynn, tickets, staff] = await Promise.all([
      characterFor(session.discordId),
      cynnFor(session.discordId),
      ticketsFor(session.discordId),
      isStaff(session.discordId),
    ]);
    if (cynn) deeds = await deedsFor(cynn.id);
  } catch {
    unavailable = true;
  }

  const town = cynn ? TOWNS.find((t) => t.name === cynn!.origin_town) : null;

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
            The records are unreachable just now. Nothing is lost.
          </p>
        )}

        {!character && !unavailable && (
          <p className="mt-8 text-sm text-[#e8e2d4]/60">
            No character yet.{" "}
            <Link href="/apply" className="text-[#f0b429] hover:underline">
              Present yourself →
            </Link>
          </p>
        )}

        {character && (
          <section className="mt-12">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-serif text-3xl">{character.name}</h2>
                <p className="mt-1 text-sm text-[#e8e2d4]/55">
                  {[character.bearing, character.trade,
                    character.age ? `${character.age} years` : null]
                    .filter(Boolean).join(" · ")}
                </p>
              </div>
              <Tag status={character.membership} />
            </div>
            {character.short && (
              <p className="mt-4 text-[#e8e2d4]/80">{character.short}</p>
            )}
            {character.bio && (
              <details className="mt-4 rounded-sm border border-white/10 p-4">
                <summary className="cursor-pointer text-xs uppercase tracking-[0.2em] text-[#e8e2d4]/45">
                  Bio
                </summary>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[#e8e2d4]/75">
                  {character.bio}
                </p>
              </details>
            )}
          </section>
        )}

        {cynn && (
          <section className="mt-12">
            <h2 className="text-xs uppercase tracking-[0.3em] text-[#e8e2d4]/40">
              The House
            </h2>
            <div className="mt-4 rounded-sm border border-[#f0b429]/25 p-5">
              <div className="flex items-baseline justify-between gap-4">
                <span className="font-serif text-2xl">{cynn.name}</span>
                <span className="font-serif text-2xl text-[#f0b429]">
                  {cynn.ar} <span className="text-xs uppercase tracking-widest">Ār</span>
                </span>
              </div>
              {cynn.motto && (
                <p className="mt-1 text-sm italic text-[#e8e2d4]/55">
                  &ldquo;{cynn.motto}&rdquo;
                </p>
              )}
              <p className="mt-3 text-xs uppercase tracking-[0.2em] text-[#e8e2d4]/40">
                of {cynn.origin_town}
                {town && town.standing !== "neither" && ` · ${town.standing}`}
                {town?.forsaken && " · the name carries nowhere"}
              </p>
              {cynn.draw_text && (
                <p className="mt-4 border-t border-white/10 pt-4 text-sm leading-relaxed text-[#e8e2d4]/75">
                  {cynn.draw_text}
                </p>
              )}
              {cynn.draw_hook && (
                <p className="mt-2 text-sm italic text-[#e8e2d4]/45">{cynn.draw_hook}</p>
              )}
              <div className="mt-4 flex items-baseline justify-between border-t border-white/10 pt-4">
                <span className="text-xs uppercase tracking-[0.2em] text-[#e8e2d4]/50">
                  Purse
                </span>
                <span className="font-serif text-xl text-[#f0b429]">
                  {formatPence(0)}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-[#e8e2d4]/30">
                Held by the House. Crown scrip — good on the island.
              </p>
              <div className="mt-4 flex gap-4">
                <Link href="/tree"
                      className="text-xs uppercase tracking-[0.2em] text-[#f0b429] hover:underline">
                  The tree →
                </Link>
                <Link href="/board"
                      className="text-xs uppercase tracking-[0.2em] text-[#f0b429] hover:underline">
                  The board →
                </Link>
              </div>
            </div>

            {deeds.length > 0 && (
              <ul className="mt-4 space-y-2">
                {deeds.map((d, i) => (
                  <li key={i} className="flex items-baseline justify-between gap-4 text-sm">
                    <span className="text-[#e8e2d4]/70">{d.reason}</span>
                    <span className="whitespace-nowrap text-[#a3be5c]">+{d.ar} Ār</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {tickets.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xs uppercase tracking-[0.3em] text-[#e8e2d4]/40">
              Petitions
            </h2>
            <ul className="mt-4 space-y-3">
              {tickets.map((t) => (
                <li key={t.id}
                    className="flex items-center justify-between gap-4 rounded-sm border border-white/10 px-4 py-3">
                  <span className="truncate text-sm text-[#e8e2d4]/80">{t.topic}</span>
                  <Tag status={t.status} />
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mt-16 flex items-center gap-3">
          <SignOut />
          {staff && (
            <Link href="/admin"
                  className="rounded-sm border border-[#f0b429]/60 px-7 py-3 text-sm uppercase tracking-[0.25em] text-[#f0b429] transition-colors hover:bg-[#f0b429] hover:text-[#0b0f0c]">
              Praesidium
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
