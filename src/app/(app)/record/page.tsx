import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { characterFor, cynnFor } from "@/lib/cynn";
import { inchesToWords } from "@/lib/options";

export const dynamic = "force-dynamic";

/**
 * The record — the character sheet.
 *
 * Lifted out of the old `/me`, which carried the sheet and the House on one
 * page. Split because they answer different questions and the House needs the
 * whole ladder beside it.
 */
export default async function Record() {
  const session = await getServerSession(authOptions);
  if (!session?.discordId) redirect("/");

  const [character, cynn] = await Promise.all([
    characterFor(session.discordId),
    cynnFor(session.discordId),
  ]);
  if (!character) redirect("/hearth");

  return (
    <>
      <header>
        <p className="eyebrow">Roll of souls · entered</p>
        <h1 className="display mt-3 text-[clamp(2.4rem,6vw,3.6rem)]">
          {character.name}
        </h1>
        <p className="mt-1 italic text-ink-soft">
          {cynn ? `of ${cynn.name}, of ${cynn.origin_town}` : "of no House"}
        </p>
      </header>

      <div className="sheet-grid mt-8">
        <Box label="Age" value={character.age} />
        <Box label="Bearing" value={character.bearing} />
        <Box label="Trade" value={character.trade} />
        <Box
          label="Height"
          value={character.height_cm ? `${character.height_cm} cm` : null}
          note={character.height_cm ? inchesToWords(character.height_cm) : null}
        />
        <Box label="Build" value={character.build} />
        <Box label="Hair" value={character.hair_colour} note={character.hair_style} />
        <Box label="Eyes" value={character.eyes} />
        <Box label="Complexion" value={character.complexion} />
      </div>

      <div className="panel mt-6">
        <span className="box-label">Marks</span>
        <p className="mt-1">{character.marks || "—"}</p>
      </div>
      <div className="panel mt-4">
        <span className="box-label">In the margin</span>
        <p className="mt-1">{character.short || "—"}</p>
      </div>
      <div className="panel mt-4">
        <span className="box-label">The long account</span>
        <p className="mt-1 whitespace-pre-wrap">{character.bio || "—"}</p>
      </div>
    </>
  );
}

function Box({
  label,
  value,
  note,
}: {
  label: string;
  value?: string | number | null;
  note?: string | null;
}) {
  const empty = value === null || value === undefined || value === "";
  return (
    <div className="box">
      <span className="box-label">{label}</span>
      <span className={`box-value ${empty ? "box-value--empty" : ""}`}>
        {empty ? "not said" : value}
      </span>
      {note && !empty && (
        <span className="mt-1 block text-[0.78rem] text-ink-soft">{note}</span>
      )}
    </div>
  );
}
