import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { cynnForCharacter, livingCharactersFor, soulFor } from "@/lib/cynn";
import { epithet, ofNoHouse } from "@/lib/naming";
import { inchesToWords } from "@/lib/options";
import { deedsForCharacter } from "@/lib/roll";
import {
  Empty,
  Field,
  Ledger,
  LedgerBlock,
  Note,
  PageHead,
  Stamp,
  onDay,
} from "@/components/register";
import { Ornament } from "@/components/ornament";

export const dynamic = "force-dynamic";

/**
 * The Record — the character sheet, in the manner of a filled-in registry.
 *
 * Dense on purpose: small labelled fields in a ruled grid, because that is most
 * of what makes a sheet read as a sheet rather than as a paragraph about a
 * person. Empty fields still print — a sheet with the gaps quietly removed
 * reads as a shorter sheet, which is a lie about what the census holds, and on
 * the day a character is entered most of it is empty.
 *
 * VOICE, BORN AND TONGUE ARE REAL COLUMNS NOW (db/018). They printed "no such
 * column" until the census started collecting them, which it does — so they are
 * ordinary fields that read "not said" when nobody answered, like every other.
 *
 * CARRIED AND OATHS STILL HAVE NO COLUMN and keep saying so in words rather
 * than as a field. There is no item table and no oath table anywhere in the
 * schema, and that is deliberate rather than pending. Filling them with
 * plausible text would be a mock, and a mock on a page whose whole claim is
 * "this is what is written down" is the worst place to put one.
 *
 * Everything here is a read. Amending a record happens in Discord — the site's
 * Postgres role can write prose and appearance (db/012) but this view is not
 * the census form, and departure in particular is the bot's to write.
 */
export default async function Record({
  searchParams,
}: {
  searchParams: { soul?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.discordId) redirect("/");

  let character = null, cynn = null;
  let living: Awaited<ReturnType<typeof livingCharactersFor>> = [];
  let deeds: Awaited<ReturnType<typeof deedsForCharacter>> = [];
  let unavailable = false;
  try {
    // WHICH record. Three living souls per owner are possible (db/018), so the
    // page needs telling; `soulFor` scopes the id to the owner and falls back
    // to the first living one, so a stale or edited link lands on something
    // true rather than on an error or on somebody else's record.
    [character, living] = await Promise.all([
      soulFor(session.discordId, searchParams.soul),
      livingCharactersFor(session.discordId),
    ]);
    if (character) {
      [cynn, deeds] = await Promise.all([
        cynnForCharacter(character.id),
        deedsForCharacter(character.id),
      ]);
    }
  } catch {
    unavailable = true;
  }

  if (unavailable) {
    return (
      <>
        <PageHead eyebrow="Roll of souls" title="The Record" />
        <Empty
          title="The records are unreachable just now."
          line="Nothing is lost."
        />
      </>
    );
  }

  if (!character) {
    return (
      <>
        <PageHead eyebrow="Roll of souls" title="The Record" />
        <Empty
          title="Nothing is written against this name."
          line="The census sits open at the next blank line. Present yourself and the Praesidium enters you here."
        />
      </>
    );
  }

  const entered = onDay(character.created_at);
  const totalAr = deeds.reduce((n, d) => n + d.ar, 0);

  return (
    <>
      <PageHead
        eyebrow={`Roll of souls · entered ${entered ?? "—"}`}
        title={epithet(character.name, cynn?.name)}
        epithet={
          cynn
            ? `Seated at ${cynn.origin_town}. The settlement is a field below, not part of the name.`
            : ofNoHouse()
        }
        aside={<Stamp word={character.membership} />}
      />

      {living.length > 1 && (
        <nav className="souls" aria-label="Which record">
          {living.map((c) => (
            <a
              key={c.id}
              href={`/record?soul=${c.id}`}
              className={`soul${c.id === character.id ? " on" : ""}`}
              aria-current={c.id === character.id ? "page" : undefined}
            >
              {c.name}
            </a>
          ))}
        </nav>
      )}

      <div className="record-top">
        <figure className="portrait">
          {character.portrait_path ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={`/api/media/${character.portrait_path}`}
              alt={`${character.name}, as entered in the census`}
            />
          ) : (
            <div className="portrait-absent">
              <span>No likeness taken</span>
            </div>
          )}
          <figcaption>
            {cynn ? cynn.name : ofNoHouse()}
          </figcaption>
        </figure>

        <Ledger>
          <LedgerBlock head="Of the body">
            <Field
              name="Age"
              value={character.age}
              under={character.age !== null ? "winters" : null}
            />
            <Field
              name="Height"
              value={character.height_cm ? `${character.height_cm} cm` : null}
              under={
                character.height_cm ? inchesToWords(character.height_cm) : null
              }
            />
            <Field name="Build" value={character.build} />
            <Field name="Bearing" value={character.bearing} />
            <Field
              name="Hair"
              value={character.hair_colour}
              under={character.hair_style}
            />
            <Field name="Eyes" value={character.eyes} />
            <Field name="Complexion" value={character.complexion} />
            <Field name="Voice" value={character.voice} />
          </LedgerBlock>

          <LedgerBlock head="Of the life">
            <Field name="Trade" value={character.trade} />
            <Field name="Born" value={character.born} />
            <Field name="House" value={cynn?.name ?? null} />
            <Field
              name="Seat"
              value={cynn?.origin_town ?? null}
              under={cynn ? "where the House's line carries" : null}
            />
            <Field name="Came" value={entered} under="entered in the census" />
            <Field name="Tongue" value={character.tongue} />
            <Field
              name="Last placed"
              value={character.at_town}
              under={character.at_town ? "by the census" : null}
            />
          </LedgerBlock>
        </Ledger>
      </div>

      <div className="pair pair--tight">
        <Note head="Marks">
          {character.marks ? (
            <p>{character.marks}</p>
          ) : (
            <p className="hand">Nothing the assessor thought worth noting.</p>
          )}
        </Note>
        <Note head="In the margin">
          {character.short ? (
            <p className="hand">{character.short}</p>
          ) : (
            <p className="hand">Nothing written in the margin.</p>
          )}
        </Note>
      </div>

      <section className="long">
        <p className="note-head">The long account</p>
        {character.bio ? (
          <p>{character.bio}</p>
        ) : (
          <p className="hand">No account given.</p>
        )}
      </section>

      <div className="pair pair--tight">
        <Note head="Carried">
          <p className="hand">
            The register keeps no list of belongings. There is no item table in
            the schema, and there deliberately isn&apos;t one yet.
          </p>
        </Note>
        <Note head="Oaths sworn">
          <p className="hand">
            The register keeps no oaths. Bonds between Houses live in the tree
            and are agreed by both ends; a personal oath has nowhere to be
            written yet.
          </p>
        </Note>
      </div>

      <div className="section-head">
        <Ornament mark="lantern" />
        <h2>Entered by the Crown</h2>
      </div>
      <p className="quiet measured">
        Deeds are witnessed, attributed and authored. The Ār they carry moves the
        House, never the person — a member accumulates nothing, which is why
        recruiting is not a strategy.
      </p>

      {deeds.length === 0 ? (
        <div className="empty spaced">
          Nothing entered against this name yet.
        </div>
      ) : (
        <div className="scroll-x spaced">
          <table>
            <thead>
              <tr>
                <th>Day</th>
                <th>Deed</th>
                <th>Tier</th>
                <th className="num">Ār to the House</th>
              </tr>
            </thead>
            <tbody>
              {deeds.map((d) => (
                <tr key={d.id}>
                  <td>{onDay(d.awarded_at)}</td>
                  <td>{d.reason}</td>
                  <td className="quiet">{d.tier}</td>
                  <td className="num">+{d.ar}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={3} className="quiet">
                  Carried to {cynn?.name ?? "no House"}
                </td>
                <td className="num">+{totalAr}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div className="section-head">
        <h2>Leaving</h2>
      </div>
      <p className="lede follows">
        Taking passage off the island sets this record to <em>departed</em> — a
        third status beside living and dead, not a deletion. The line stays on
        the roll with a stroke through it, the name is never freed, and the
        living place it held is released. It is written in Discord: the site
        reads the roll and the bot keeps it.
      </p>
    </>
  );
}
