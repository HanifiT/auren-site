import Link from "next/link";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { cynnFor } from "@/lib/cynn";
import { claimsFor, openMissions, submittedClaims } from "@/lib/missions";
import { isStaff } from "@/lib/queries";
import { TOWNS } from "@/lib/options";
import { SignIn } from "@/components/auth-buttons";
import { PostMission, Reward, Settle, SubmitWork, TakeButton } from "./ui";

export const dynamic = "force-dynamic";

/**
 * The job board.
 *
 * Work is claimed by a House, not a person — the purse it pays into and the
 * standing it moves both belong to the House, so claiming as an individual
 * would have nowhere to put either.
 */
export default async function Board() {
  const session = await getServerSession(authOptions);

  let missions: Awaited<ReturnType<typeof openMissions>> = [];
  let mine: Awaited<ReturnType<typeof claimsFor>> = [];
  let awaiting: Awaited<ReturnType<typeof submittedClaims>> = [];
  let house = null, staff = false, unavailable = false;

  try {
    missions = await openMissions();
    if (session?.discordId) {
      [house, staff] = await Promise.all([
        cynnFor(session.discordId),
        isStaff(session.discordId),
      ]);
      if (house) mine = await claimsFor(house.id);
      if (staff) awaiting = await submittedClaims();
    }
  } catch {
    unavailable = true;
  }

  const claimedIds = new Set(mine.map((c) => c.mission_id));

  return (
    <main className="leaf min-h-svh px-6 py-16">
      <div className="relative z-[1] mx-auto max-w-3xl">
        <Link href="/" className="text-xs uppercase tracking-[0.3em] text-ink-faint hover:text-rubric">
          ← Auren
        </Link>

        <div className="mt-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.45em] text-ink-faint">
              Edicta
            </p>
            <h1 className="mt-2 font-serif text-5xl">The Board</h1>
          </div>
          {staff && <PostMission towns={TOWNS} />}
        </div>
        <div aria-hidden className="mt-6 h-px w-32 bg-gradient-to-r from-rubric to-transparent" />

        {unavailable && (
          <p className="mt-8 border border-vellum-deep px-4 py-3 text-sm text-ink-faint">
            The board is unreachable just now.
          </p>
        )}

        {!session?.discordId && (
          <div className="mt-8">
            <p className="mb-4 text-sm text-ink-soft">
              Sign in to take work.
            </p>
            <SignIn />
          </div>
        )}

        {staff && awaiting.length > 0 && (
          <section className="mt-12 border border-vellum-deep bg-[rgba(148,48,30,.05)] p-5">
            <h2 className="text-xs uppercase tracking-[0.3em] text-rubric">
              Awaiting settlement — {awaiting.length}
            </h2>
            <ul className="mt-4 space-y-4">
              {awaiting.map((c) => (
                <li key={c.id} className="border-t border-vellum-deep pt-4 first:border-0 first:pt-0">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="font-serif text-lg">{c.title}</span>
                    <Reward p={c.reward_pence} tier={c.ar_tier} />
                  </div>
                  <p className="mt-1 text-xs text-ink-faint">{c.house_name}</p>
                  {c.note && (
                    <p className="mt-2 text-sm text-ink-soft">{c.note}</p>
                  )}
                  <div className="mt-3"><Settle claimId={c.id} /></div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-12">
          <h2 className="text-xs uppercase tracking-[0.3em] text-ink-faint">
            Work posted
          </h2>
          {missions.length === 0 ? (
            <p className="mt-4 text-sm text-ink-faint">
              Nothing on the board.
            </p>
          ) : (
            <ul className="mt-4 space-y-4">
              {missions.map((m) => (
                <li key={m.id} className="border border-vellum-deep p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-serif text-xl">{m.title}</h3>
                      <p className="mt-1 text-xs uppercase tracking-wider text-ink-faint">
                        {[m.town, m.slots ? `${m.taken}/${m.slots} taken` : "uncapped"]
                          .filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <Reward p={m.reward_pence} tier={m.ar_tier} />
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                    {m.brief}
                  </p>
                  {house && (
                    <div className="mt-4 flex justify-end">
                      <TakeButton missionId={m.id} taken={claimedIds.has(m.id)} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {mine.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xs uppercase tracking-[0.3em] text-ink-faint">
              Your House&apos;s work
            </h2>
            <ul className="mt-4 space-y-3">
              {mine.map((c) => (
                <li key={c.id} className="border border-vellum-deep p-4">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="font-serif">{c.title}</span>
                    <span className="text-[11px] uppercase tracking-wider text-ink-faint">
                      {c.status}
                    </span>
                  </div>
                  {c.status === "claimed" && <SubmitWork claimId={c.id} />}
                  {c.note && c.status !== "claimed" && (
                    <p className="mt-2 text-sm text-ink-soft">{c.note}</p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
