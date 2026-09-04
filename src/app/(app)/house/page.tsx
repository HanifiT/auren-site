import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { cynnFor } from "@/lib/cynn";
import { TOWNS } from "@/lib/options";
import { deedsOf, formatPence, membersOf, purseOf } from "@/lib/roll";
import { OUTSIDE_ARITHMETIC, climb, standingFor } from "@/lib/standing";
import {
  Empty,
  Note,
  PageHead,
  Stamp,
  onDay,
} from "@/components/register";
import { Ornament } from "@/components/ornament";
import { Ladder } from "./ladder";

export const dynamic = "force-dynamic";

/**
 * The House — motto, seat, region, purse, members, and the ladder.
 *
 * The rungs come from `config/standing.yml` by way of `ladder.generated.ts`,
 * which `tools/gen_site_ladder.py` writes and `tests/test_site_ladder.py`
 * guards. Nothing on this page hardcodes a threshold.
 *
 * The purse and the Ār figure are on the page together and are never near each
 * other: separate panels, separate labels, no arithmetic between them, and a
 * sentence saying why. Ār gates access, coin gates volume, and the moment there
 * is a rate the first becomes a second money.
 */
export default async function House() {
  const session = await getServerSession(authOptions);
  if (!session?.discordId) redirect("/");

  let cynn = null;
  let purse = 0;
  let members: Awaited<ReturnType<typeof membersOf>> = [];
  let deeds: Awaited<ReturnType<typeof deedsOf>> = [];
  let unavailable = false;

  try {
    cynn = await cynnFor(session.discordId);
    if (cynn) {
      [purse, members, deeds] = await Promise.all([
        purseOf(cynn.id),
        membersOf(cynn.id),
        deedsOf(cynn.id),
      ]);
    }
  } catch {
    unavailable = true;
  }

  if (unavailable) {
    return (
      <>
        <PageHead eyebrow="The House" title="Cynn" />
        <Empty title="The records are unreachable just now." line="Nothing is lost." />
      </>
    );
  }

  if (!cynn) {
    return (
      <>
        <PageHead eyebrow="The House" title="Cynn" />
        <Empty
          title="No House."
          line="Standing belongs to a House and never to a person, so there is nothing yet for it to stand on. Found one, or petition an existing name, and this fills in."
        />
      </>
    );
  }

  const town = TOWNS.find((t) => t.name === cynn.origin_town);
  const standing = standingFor(cynn.ar, cynn.successions);
  const steps = climb(cynn.ar, cynn.successions);
  const eorl = OUTSIDE_ARITHMETIC.find((r) => r.how === "conferred");
  const nithing = OUTSIDE_ARITHMETIC.find((r) => r.how === "imposed");

  return (
    <>
      <PageHead
        eyebrow="Cynn · the House"
        title={cynn.name}
        epithet={cynn.motto ? `“${cynn.motto}”` : undefined}
        lede={
          <>
            Of {cynn.origin_town}
            {town && town.standing !== "neither"
              ? `, in the ${town.standing}`
              : ", of neither side"}
            . Founded {onDay(cynn.founded_at)}.
            {town?.forsaken &&
              " Blackmoor is forsaken: a name seated there reads down everywhere, its own region included."}
          </>
        }
        aside={
          <span className="tags" style={{ margin: 0 }}>
            <Stamp word={standing.rung.name} tone="gold" />
            {town?.forsaken && <Stamp word="forsaken seat" tone="quiet" />}
          </span>
        }
      />

      <div className="house-body">
        <div>
          <div className="section-head" style={{ marginTop: 0 }}>
            <Ornament mark="crozier" />
            <h2>The ladder</h2>
          </div>
          <p className="quiet" style={{ maxWidth: "62ch", marginBottom: "1rem" }}>
            Every rung, held or not, and what each unreached one is short by.
            Four of them want a completed succession as well as the Ār — a House
            with the number and no succession does not advance, however long it
            waits.
          </p>

          <Ladder steps={steps} />

          <p className="quiet" style={{ maxWidth: "62ch", marginTop: "1.2rem" }}>
            Neither end of the ladder is arithmetic.{" "}
            {eorl && (
              <>
                <b>{eorl.name}</b> is conferred by acclamation and has no
                threshold: it is not something a House climbs to.{" "}
              </>
            )}
            {nithing && (
              <>
                <b>{nithing.name}</b> is imposed by judgement, and is a stripping
                rather than a low rung.
              </>
            )}
          </p>
        </div>

        <div className="house-side">
          <section className="plate">
            <p className="plate-title">Standing</p>
            <p className="display" style={{ fontSize: "1.9rem" }}>
              {standing.rung.name}
            </p>
            <p className="epithet gloss">{standing.rung.sense}</p>
            <p className="plate-note">
              {cynn.ar} Ār · {cynn.successions} completed succession
              {cynn.successions === 1 ? "" : "s"}
            </p>
          </section>

          <section className="plate">
            <p className="plate-title">The purse</p>
            <p className="purse-figure">{formatPence(purse)}</p>
            <p className="plate-note">
              Held by the House. Crown scrip — good on the island. Balance is the
              sum of the ledger; there is no balance column anywhere.
            </p>
          </section>

          <section className="plate">
            <p className="plate-title">Of the House</p>
            {members.length === 0 ? (
              <p className="plate-note">Nobody bears the name.</p>
            ) : (
              <ul className="roster">
                {members.map((m) => (
                  <li key={m.id} className={m.status === "living" ? "" : "gone"}>
                    <span className="roster-main">{m.name}</span>
                    <span className="roster-note">
                      {m.status === "living"
                        ? m.trade ?? m.membership
                        : m.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="plate-note">
              The departed and the dead stay written. Succession replaces rather
              than accumulates.
            </p>
          </section>
        </div>
      </div>

      {cynn.draw_text && (
        <div className="pair pair--tight">
          <Note head="What the name carries">
            <p>{cynn.draw_text}</p>
            {cynn.draw_hook && <p className="hand">{cynn.draw_hook}</p>}
          </Note>
          <Note head="And what it does not">
            <p className="hand">
              The founding draw is the standing the <em>line</em> once held. It
              is not this House&apos;s rank: every House on the island enters at
              Cuma, and {cynn.name} has earned {cynn.ar} Ār since.
            </p>
          </Note>
        </div>
      )}

      <div className="section-head">
        <h2>Deeds entered against the House</h2>
      </div>
      {deeds.length === 0 ? (
        <div className="empty">Nothing entered yet.</div>
      ) : (
        <div className="scroll-x">
          <table>
            <thead>
              <tr>
                <th>Day</th>
                <th>Deed</th>
                <th>Attributed to</th>
                <th className="num">Ār</th>
              </tr>
            </thead>
            <tbody>
              {deeds.map((d) => (
                <tr key={d.id}>
                  <td>{onDay(d.awarded_at)}</td>
                  <td>{d.reason}</td>
                  <td className="quiet">{d.character_name ?? "—"}</td>
                  <td className="num">+{d.ar}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
