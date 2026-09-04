import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { characterFor, cynnFor } from "@/lib/cynn";
import { TOWNS } from "@/lib/options";
import { formatPence, membersOf, purseOf, slotsFor } from "@/lib/roll";
import { standingFor } from "@/lib/standing";
import { Empty, PageHead, Stamp, Strip } from "@/components/register";
import { Ornament } from "@/components/ornament";

export const dynamic = "force-dynamic";

/**
 * The Hearth — the landing view once signed in, and what `/me` used to be.
 *
 * Your living character, your House's standing, and a counts strip. Everything
 * on it is read: the site's role has SELECT on all of it, and the standing and
 * money columns are not the site's to write in any case.
 *
 * The two figures in the strip that people will want to compare — Ār and the
 * purse — are separate cells with separate labels and no arithmetic between
 * them. Ār gates access; coin gates volume; there is no rate.
 */
export default async function Hearth() {
  const session = await getServerSession(authOptions);
  if (!session?.discordId) redirect("/");

  let character = null, cynn = null;
  let purse = 0;
  let members: Awaited<ReturnType<typeof membersOf>> = [];
  let slots = { living: 0, livingAllowed: 1, departed: 0, dead: 0, pending: 0 };
  let unavailable = false;

  try {
    [character, cynn, slots] = await Promise.all([
      characterFor(session.discordId),
      cynnFor(session.discordId),
      slotsFor(session.discordId),
    ]);
    if (cynn) {
      [purse, members] = await Promise.all([purseOf(cynn.id), membersOf(cynn.id)]);
    }
  } catch {
    unavailable = true;
  }

  const who = session.user?.name ?? "Unnamed";
  const town = cynn ? TOWNS.find((t) => t.name === cynn.origin_town) : null;
  const standing = cynn ? standingFor(cynn.ar, cynn.successions) : null;
  const living = members.filter((m) => m.status === "living");

  if (unavailable) {
    return (
      <>
        <PageHead eyebrow="Roll of souls" title={who} />
        <Empty
          title="The records are unreachable just now."
          line="Nothing is lost. The bot owns the database and the site only reads it, so nothing here can have written a half-finished row."
        />
      </>
    );
  }

  return (
    <>
      <PageHead
        eyebrow="Roll of souls"
        title={who}
        epithet={session.inGuild ? "of the island" : "not yet of the island"}
        lede="One living soul, one House, and whatever has been written down about both. Everything here is read from the record; the record is kept in Discord."
      />

      <div className="pair">
        <section className="plate">
          <p className="plate-title">Your soul on the roll</p>
          {character ? (
            <>
              <p className="display" style={{ fontSize: "1.95rem" }}>
                {character.name}
              </p>
              <p className="epithet">
                {cynn ? `of ${cynn.name}, of ${cynn.origin_town}` : "of no House"}
              </p>
              <p className="plate-note">
                {[
                  character.age !== null ? `${character.age} winters` : null,
                  character.trade,
                  character.bearing ? `${character.bearing.toLowerCase()} of bearing` : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "nothing entered against the body yet"}
              </p>
              <p className="tags">
                <Stamp word={character.membership} />
                {character.at_town && <span className="tag">at {character.at_town}</span>}
              </p>
              <p className="actions">
                <Link href="/record" className="btn">
                  Read the record
                </Link>
              </p>
            </>
          ) : (
            <>
              <p className="plate-note">
                Nothing is written against this name yet. The census sits open at
                the next blank line.
              </p>
              <p className="actions">
                <Link href="/apply" className="btn">
                  Present yourself
                </Link>
              </p>
            </>
          )}
        </section>

        <section className="plate">
          <p className="plate-title">Where the House stands</p>
          {cynn && standing ? (
            <>
              <p className="display" style={{ fontSize: "1.95rem" }}>
                {standing.rung.name}
              </p>
              <p className="epithet gloss">{standing.rung.sense}</p>
              <p className="plate-note">
                {cynn.ar} Ār held
                {standing.blocked
                  ? ` · ${standing.blocked.name} is within reach on Ār and wants ${standing.blocked.requiresSuccessions} completed succession${standing.blocked.requiresSuccessions > 1 ? "s" : ""}`
                  : standing.next
                    ? ` · ${standing.next.threshold - cynn.ar} to ${standing.next.name}`
                    : " · top of the arithmetic"}
              </p>
              <p className="tags">
                <span className="tag">{cynn.origin_town}</span>
                {town && town.standing !== "neither" && (
                  <span className="tag">{town.standing}</span>
                )}
                {town?.forsaken && <Stamp word="reads down everywhere" tone="quiet" />}
              </p>
              <p className="actions">
                <Link href="/house" className="btn">
                  Open the House
                </Link>
              </p>
            </>
          ) : (
            <p className="plate-note">
              No House. Standing belongs to a House, never to a person, so there
              is nothing to stand on yet.
            </p>
          )}
        </section>
      </div>

      {cynn && (
        <Strip
          cells={[
            { n: slots.living, label: "living" },
            { n: cynn.ar, label: "Ār" },
            { n: formatPence(purse), label: "in the purse" },
            { n: cynn.successions, label: "successions" },
            { n: living.length, label: "of the House" },
          ]}
        />
      )}

      <div className="section-head">
        <Ornament mark="hawthorn" />
        <h2>The rule the counts obey</h2>
      </div>
      <p className="lede" style={{ marginTop: 0 }}>
        Ār and coin are separate axes and never convert. Ār gates access — who
        will deal with the House at all, whether another will marry into it.
        Coin gates volume, once somebody has agreed to sell. There is no rate
        between them and no figure anywhere that combines them.
      </p>

      {/* On narrow the rail's foot is hidden, so the slot count lives here
          instead of being pushed off the end of a horizontal scroller. */}
      <div className="only-narrow">
        <div className="section-head">
          <h2>Your place on the roll</h2>
        </div>
        <p className="lede" style={{ marginTop: 0 }}>
          {slots.living} of {slots.livingAllowed} living.{" "}
          {slots.departed > 0 && `${slots.departed} departed. `}
          {slots.dead > 0 && `${slots.dead} dead. `}
          The roll holds one living soul to a name — it is a database constraint,
          not a setting. Departed and dead stay written and do not take the
          place.
        </p>
      </div>
    </>
  );
}
