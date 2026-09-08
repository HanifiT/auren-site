import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { cynnFor } from "@/lib/cynn";
import { claimsFor, openMissions, submittedClaims } from "@/lib/missions";
import { isStaff } from "@/lib/queries";
import { TOWNS } from "@/lib/options";
import { Empty, PageHead, Stamp } from "@/components/register";
import { Ornament } from "@/components/ornament";
import { PostMission, Reward, Settle, SubmitWork, TakeButton } from "./ui";

export const dynamic = "force-dynamic";

/**
 * The job board.
 *
 * Work is claimed by a House, not a person — the purse it pays into and the
 * standing it moves both belong to the House, so claiming as an individual
 * would have nowhere to put either.
 *
 * Moved into the app shell. It previously rendered for signed-out visitors with
 * a "sign in to take work" prompt; the shell redirects those to the landing
 * page, so that branch is gone. It was the only anonymous view behind the rail
 * and the rail never showed it to anyone signed out anyway.
 */
export default async function Board() {
  const session = await getServerSession(authOptions);
  if (!session?.discordId) redirect("/");

  let missions: Awaited<ReturnType<typeof openMissions>> = [];
  let mine: Awaited<ReturnType<typeof claimsFor>> = [];
  let awaiting: Awaited<ReturnType<typeof submittedClaims>> = [];
  let house = null, staff = false, unavailable = false;

  try {
    missions = await openMissions();
    [house, staff] = await Promise.all([
      cynnFor(session.discordId),
      isStaff(session.discordId),
    ]);
    if (house) mine = await claimsFor(house.id);
    if (staff) awaiting = await submittedClaims();
  } catch {
    unavailable = true;
  }

  const claimedIds = new Set(mine.map((c) => c.mission_id));

  return (
    <>
      <PageHead
        eyebrow="Edicta · the board"
        title="The Board"
        lede="Work posted by the Crown and taken by Houses. The purse it pays and the standing it moves both belong to the House, so a person cannot take it alone."
        aside={staff ? <PostMission towns={TOWNS} /> : undefined}
      />

      {unavailable && (
        <Empty
          title="The board is unreachable just now."
          line="Nothing is lost."
        />
      )}

      {staff && awaiting.length > 0 && (
        <section className="awaiting">
          <p className="note-head">Awaiting settlement — {awaiting.length}</p>
          <p>
            Work submitted and not yet paid or refused. Settling writes a
            balanced batch against the Crown; nothing here creates money.
          </p>
          <ul className="roster spaced-tight">
            {awaiting.map((c) => (
              <li key={c.id}>
                <div className="pending-row">
                  <span className="roster-main roster-main--large">{c.title}</span>
                  <Reward p={c.reward_pence} tier={c.ar_tier} />
                </div>
                <span className="roster-note">{c.house_name}</span>
                {c.note && <p className="hand spaced-tight">{c.note}</p>}
                <div className="spaced-tight">
                  <Settle claimId={c.id} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="section-head">
        <Ornament mark="lantern" />
        <h2>Work posted</h2>
      </div>

      {missions.length === 0 ? (
        <Empty
          title="Nothing on the board."
          line="The Crown posts work here when it has any. What is posted is open to every House at once, and the pay is named before anybody takes it."
        />
      ) : (
        <div className="pair pair--tight">
          {missions.map((m) => (
            <section key={m.id} className="note">
              <div className="pending-row">
                <h3>{m.title}</h3>
                <Reward p={m.reward_pence} tier={m.ar_tier} />
              </div>
              <p className="roster-note">
                {[m.town, m.slots ? `${m.taken}/${m.slots} taken` : "uncapped"]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <p className="spaced-tight">{m.brief}</p>
              {house && (
                <div className="actions">
                  <TakeButton missionId={m.id} taken={claimedIds.has(m.id)} />
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      {!house && !unavailable && (
        <p className="quiet spaced">
          You have no House, so there is nothing for work to pay into. Found one
          or petition an existing name and the board opens.
        </p>
      )}

      {mine.length > 0 && (
        <>
          <div className="section-head">
            <h2>Your House&apos;s work</h2>
          </div>
          <ul className="roster">
            {mine.map((c) => (
              <li key={c.id}>
                <div className="pending-row">
                  <span className="roster-main">{c.title}</span>
                  <Stamp
                    word={c.status}
                    tone={
                      c.status === "paid"
                        ? "leaf"
                        : c.status === "rejected"
                          ? "quiet"
                          : "gold"
                    }
                  />
                </div>
                {c.status === "claimed" && <SubmitWork claimId={c.id} />}
                {c.note && c.status !== "claimed" && (
                  <p className="hand spaced-tight">{c.note}</p>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
