import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { characterFor } from "@/lib/cynn";
import { lines, recentDraws } from "@/lib/aedre";
import { TOWNS } from "@/lib/options";
import { Empty, PageHead } from "@/components/register";
import { Ornament } from "@/components/ornament";
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
 *
 * The fill bar stays green and the numerals are gold: the bar is the line's
 * condition and the figures are a quantity, which is the same split the rest of
 * the app uses. It is deliberately NOT the old three-colour bar — a bar that
 * turns red at a threshold is a judgement, and the line does not make one.
 */
export default async function Aedre() {
  const session = await getServerSession(authOptions);
  if (!session?.discordId) redirect("/");

  let all: Awaited<ReturnType<typeof lines>> = [];
  let draws: Awaited<ReturnType<typeof recentDraws>> = [];
  let me = null, unavailable = false;
  try {
    [all, draws] = await Promise.all([lines(), recentDraws()]);
    me = await characterFor(session.discordId);
  } catch {
    unavailable = true;
  }

  const here = me?.at_town ?? null;

  return (
    <>
      <PageHead
        eyebrow="Wyrdport keeps the old maps"
        title="The Ǣdre"
        lede="Veins under the ground. They run where they run, they give what they have, and what is taken from one is taken from everyone."
      />

      {unavailable && (
        <Empty title="The ground is quiet just now." line="Nothing is lost." />
      )}

      {me && (
        <section className="standing-here">
          <div>
            <p className="f-label">Standing</p>
            <p className="plate-name">{here ?? "Nowhere in particular"}</p>
          </div>
          <Travel towns={TOWNS} at={here} />
        </section>
      )}

      <div className="section-head">
        <Ornament mark="toadstool" />
        <h2>The lines</h2>
      </div>

      {all.length === 0 && !unavailable ? (
        <Empty
          title="No line has been surveyed."
          line="Wyrdport keeps the old maps, and there is nothing on them yet."
        />
      ) : (
        <div className="f-stack">
          {all.map((l) => {
            const pct = Math.round((l.available / l.capacity) * 100);
            return (
              <section key={l.id} className="vein">
                <div className="pending-row">
                  <h3>{l.name}</h3>
                  <span className="quiet">under {l.town}</span>
                </div>

                <div
                  className="vein-bar"
                  role="img"
                  aria-label={`${l.available} of ${l.capacity} remaining`}
                >
                  <i style={{ width: `${pct}%` }} />
                </div>

                <p className="vein-figures">
                  <span className="vein-num">{l.available}</span>
                  <span className="quiet"> of </span>
                  <span className="vein-num">{l.capacity}</span>
                  <span className="quiet">
                    {" "}· recovers {l.refill_per_hour}/hour
                    {l.surfaced && " · it surfaces here"}
                  </span>
                </p>

                {me && here === l.town && <Draw available={l.available} />}
                {me && here !== l.town && (
                  <p className="quiet spaced-tight">You are not standing here.</p>
                )}
              </section>
            );
          })}
        </div>
      )}

      {draws.length > 0 && (
        <>
          <div className="section-head">
            <h2>Lately</h2>
          </div>
          <ul className="roster">
            {draws.map((d, i) => (
              <li key={i} className="pending-row">
                <span className="roster-main">
                  {d.who} drew from {d.line}
                </span>
                <span className="vein-num">{d.amount}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
