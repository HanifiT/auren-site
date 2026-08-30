import Link from "next/link";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { characterFor } from "@/lib/cynn";
import { lines, recentDraws } from "@/lib/aedre";
import { TOWNS } from "@/lib/options";
import { Draw, Travel } from "./ui";

export const dynamic = "force-dynamic";

/**
 * The lines.
 *
 * Shared, regional and visible to everyone — that visibility is the point.
 * What one House takes, every other House can see is gone.
 *
 * Nothing here explains `wemm`. It is not shown, not totalled, and not
 * mentioned. Same discipline as the role names.
 */
export default async function Aedre() {
  const session = await getServerSession(authOptions);

  let all: Awaited<ReturnType<typeof lines>> = [];
  let draws: Awaited<ReturnType<typeof recentDraws>> = [];
  let me = null, unavailable = false;
  try {
    [all, draws] = await Promise.all([lines(), recentDraws()]);
    if (session?.discordId) me = await characterFor(session.discordId);
  } catch {
    unavailable = true;
  }

  const here = me?.at_town ?? null;

  return (
    <main className="leaf min-h-svh px-6 py-16">
      <div className="relative z-[1] mx-auto max-w-3xl">
        <Link href="/" className="text-xs uppercase tracking-[0.3em] text-ink-faint hover:text-rubric">
          ← Auren
        </Link>

        <p className="mt-8 text-xs uppercase tracking-[0.45em] text-ink-faint">
          Wyrdport keeps the old maps
        </p>
        <h1 className="mt-2 font-serif text-5xl">The Ǣdre</h1>
        <div aria-hidden className="mt-6 h-px w-32 bg-gradient-to-r from-rubric to-transparent" />

        <p className="mt-6 max-w-prose text-ink-soft">
          Veins under the ground. They run where they run, they give what they
          have, and what is taken from one is taken from everyone.
        </p>

        {unavailable && (
          <p className="mt-8 text-sm text-ink-faint">
            The ground is quiet just now.
          </p>
        )}

        {me && (
          <div className="mt-8 flex flex-wrap items-center gap-4 border border-vellum-deep px-4 py-3">
            <span className="text-xs uppercase tracking-[0.2em] text-ink-faint">
              {here ? `Standing in ${here}` : "Standing nowhere in particular"}
            </span>
            <Travel towns={TOWNS} at={here} />
          </div>
        )}

        <section className="mt-10 space-y-4">
          {all.map((l) => {
            const pct = Math.round((l.available / l.capacity) * 100);
            return (
              <div key={l.id} className="border border-vellum-deep p-5">
                <div className="flex items-baseline justify-between gap-4">
                  <h2 className="font-serif text-2xl">{l.name}</h2>
                  <span className="text-sm text-ink-faint">
                    under {l.town}
                  </span>
                </div>

                <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-[rgba(120,94,52,.2)]">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      background:
                        pct > 60 ? "#4d6b3f" : pct > 25 ? "#a87c2e" : "#94301e",
                    }}
                  />
                </div>
                <p className="mt-2 text-xs text-ink-faint">
                  {l.available} of {l.capacity} · recovers {l.refill_per_hour}/hour
                  {l.surfaced && " · it surfaces here"}
                </p>

                {me && here === l.town && <Draw available={l.available} />}
                {me && here !== l.town && (
                  <p className="mt-3 text-xs text-ink-faint">
                    You are not standing here.
                  </p>
                )}
              </div>
            );
          })}
        </section>

        {draws.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xs uppercase tracking-[0.3em] text-ink-faint">
              Lately
            </h2>
            <ul className="mt-4 space-y-1.5">
              {draws.map((d, i) => (
                <li key={i} className="flex items-baseline justify-between gap-4 text-sm">
                  <span className="text-ink-soft">
                    {d.who} drew from {d.line}
                  </span>
                  <span className="text-[#4d6b3f]">{d.amount}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
