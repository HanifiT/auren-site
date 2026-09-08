import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { LIVING_CAP } from "@/lib/census";
import { cynnForCharacter, livingCharactersFor, type Character, type Cynn } from "@/lib/cynn";
import { TOWNS } from "@/lib/options";
import { formatPence, membersOf, purseOf, slotsFor } from "@/lib/roll";
import { epithet, ofNoHouse } from "@/lib/naming";
import { standingFor } from "@/lib/standing";
import { Empty, PageHead, Stamp, Strip } from "@/components/register";
import { Ornament } from "@/components/ornament";

export const dynamic = "force-dynamic";

/**
 * The Hearth — the landing view once signed in, and what `/me` used to be.
 *
 * Your living souls, your House's standing, and a counts strip. Everything on
 * it is read: the site's role has SELECT on all of it, and the standing and
 * money columns are not the site's to write in any case.
 *
 * THIS IS A CHOICE OF RECORD NOW, NOT A SINGLE CARD. Three living characters
 * per owner are possible (db/018), so the Hearth lists them and each opens its
 * own record — `/record?soul=<id>`. With one, that is the same page it always
 * was, with one card on it.
 *
 * The two figures in the strip people will want to compare — Ār and the purse —
 * are separate cells with separate labels and no arithmetic between them. Ār
 * gates access; coin gates volume; there is no rate.
 */
export default async function Hearth() {
  const session = await getServerSession(authOptions);
  if (!session?.discordId) redirect("/");

  let living: Character[] = [];
  let slots = {
    living: 0, livingAllowed: LIVING_CAP, departed: 0, dead: 0, pending: 0,
  };
  let unavailable = false;

  try {
    [living, slots] = await Promise.all([
      livingCharactersFor(session.discordId),
      slotsFor(session.discordId),
    ]);
  } catch {
    unavailable = true;
  }

  const who = session.user?.name ?? "Unnamed";

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

  // Each soul's House, and the standing that goes with it. Two souls may well
  // be in different Houses, so the House is a property of the soul rather than
  // of the account.
  const souls: { character: Character; cynn: Cynn | null }[] = await Promise.all(
    living.map(async (c) => ({ character: c, cynn: await cynnForCharacter(c.id) })),
  );

  // The counts strip follows the first soul's House — the one whose record the
  // Hearth opens by default. Named on the strip so it cannot be read as a total
  // across several Houses, which it is not.
  const lead = souls[0] ?? null;
  const cynn = lead?.cynn ?? null;
  const standing = cynn ? standingFor(cynn.ar, cynn.successions) : null;
  const town = cynn ? TOWNS.find((t) => t.name === cynn.origin_town) : null;

  let purse = 0;
  let members: Awaited<ReturnType<typeof membersOf>> = [];
  if (cynn) {
    try {
      [purse, members] = await Promise.all([purseOf(cynn.id), membersOf(cynn.id)]);
    } catch {
      /* the counts go quiet rather than the page */
    }
  }
  const houseLiving = members.filter((m) => m.status === "living");

  return (
    <>
      <PageHead
        eyebrow="Roll of souls"
        title={who}
        epithet={session.inGuild ? "of the island" : "not yet of the island"}
        lede={
          souls.length > 1
            ? `${souls.length} living souls to this name, and whatever has been written down about each. Everything here is read from the record; the record is kept in Discord.`
            : "Your living soul, your House, and whatever has been written down about both. Everything here is read from the record; the record is kept in Discord."
        }
        aside={
          <span className="tags tags--flush">
            <span className="tag">
              {slots.living} of {slots.livingAllowed} living
            </span>
          </span>
        }
      />

      {souls.length === 0 ? (
        <section className="plate">
          <p className="plate-title">Your soul on the roll</p>
          <p className="plate-note">
            Nothing is written against this name yet. The census sits open at the
            next blank line.
          </p>
          <p className="actions">
            <Link href="/apply" className="btn">Present yourself</Link>
          </p>
        </section>
      ) : (
        <div className="pair">
          {souls.map(({ character, cynn: house }) => (
            <section key={character.id} className="plate">
              <p className="plate-title">
                {souls.length > 1 ? "A soul on the roll" : "Your soul on the roll"}
              </p>
              <p className="plate-name">{epithet(character.name, house?.name)}</p>
              <p className="epithet">
                {house ? `seated at ${house.origin_town}` : ofNoHouse()}
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
                <Stamp
                  word={character.membership}
                  tone={character.membership === "admitted" ? "leaf" : "gold"}
                />
                {character.at_town && (
                  <span className="tag">at {character.at_town}</span>
                )}
              </p>
              <p className="actions">
                <Link href={`/record?soul=${character.id}`} className="btn">
                  Read the record
                </Link>
                <Link href={`/tree?soul=${character.id}`} className="btn btn--ghost">
                  The tree
                </Link>
              </p>
            </section>
          ))}

          {/* The blank line, while there is one. */}
          {souls.length < slots.livingAllowed && (
            <section className="plate plate--blank">
              <p className="plate-title">The next blank line</p>
              <p className="plate-note">
                {slots.livingAllowed - souls.length} of{" "}
                {slots.livingAllowed} still open. The departed and the dead stay
                written and do not take a place.
              </p>
              <p className="actions">
                <Link href="/apply" className="btn btn--ghost">
                  Present another
                </Link>
              </p>
            </section>
          )}
        </div>
      )}

      {cynn && standing && (
        <>
          <div className="section-head">
            <h2>Where {cynn.name} stands</h2>
          </div>
          <section className="plate">
            <p className="plate-name">{standing.rung.name}</p>
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
              {town && town.region !== "neither" && (
                <span className="tag">{town.region}</span>
              )}
              {town?.forsaken && <Stamp word="reads down everywhere" tone="quiet" />}
            </p>
            <p className="actions">
              <Link href="/house" className="btn">Open the House</Link>
            </p>
          </section>

          <Strip
            cells={[
              { n: slots.living, label: "your living souls" },
              { n: cynn.ar, label: `Ār · ${cynn.name}` },
              { n: formatPence(purse), label: "in the purse" },
              { n: cynn.successions, label: "successions" },
              { n: houseLiving.length, label: "of the House" },
            ]}
          />
        </>
      )}

      <div className="section-head">
        <Ornament mark="hawthorn" />
        <h2>The rule the counts obey</h2>
      </div>
      <p className="lede follows">
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
        <p className="lede follows">
          {slots.living} of {slots.livingAllowed} living.{" "}
          {slots.departed > 0 && `${slots.departed} departed. `}
          {slots.dead > 0 && `${slots.dead} dead. `}
          The roll holds {slots.livingAllowed} living souls to a name — a
          database constraint, not a setting. Departed and dead stay written and
          do not take a place.
        </p>
      </div>
    </>
  );
}
