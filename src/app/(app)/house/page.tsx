import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { cynnFor, deedsFor } from "@/lib/cynn";
import { TOWNS } from "@/lib/options";
import { formatPence, membersOf, purseOf } from "@/lib/roll";
import { climb, standingFor } from "@/lib/standing";

export const dynamic = "force-dynamic";

/**
 * The House.
 *
 * The ladder is the signature element and it is rendered whole — every rung at
 * once, with what each unreached one is short by. See `src/lib/standing.ts`;
 * the rungs themselves come from `config/standing.yml` by way of
 * `ladder.generated.ts`.
 */
export default async function House() {
  const session = await getServerSession(authOptions);
  if (!session?.discordId) redirect("/");

  const cynn = await cynnFor(session.discordId);
  if (!cynn) redirect("/hearth");

  const [purse, members, deeds] = await Promise.all([
    purseOf(cynn.id),
    membersOf(cynn.id),
    deedsFor(cynn.id),
  ]);

  const town = TOWNS.find((t) => t.name === cynn.origin_town);
  const standing = standingFor(cynn.ar, cynn.successions);
  const steps = climb(cynn.ar, cynn.successions);

  return (
    <>
      <header>
        <p className="eyebrow">The House</p>
        <h1 className="display mt-3 text-[clamp(2.4rem,6vw,3.6rem)]">{cynn.name}</h1>
        {cynn.motto && <p className="mt-1 italic text-ink-soft">{cynn.motto}</p>}
        <p className="mt-2 text-sm text-ink-soft">
          of {cynn.origin_town}
          {town && town.standing !== "neither" && ` · ${town.standing}`}
          {town?.forsaken && " · the name carries nowhere"}
        </p>
      </header>

      <p className="mt-8">
        {standing.rung.name} — {cynn.ar} Ār, {cynn.successions} successions.
      </p>

      <ol className="mt-4">
        {steps.map((s) => (
          <li key={s.rung.name}>
            {s.rung.name} · {s.rung.threshold} Ār
            {s.rung.requiresSuccessions > 0 &&
              ` · ${s.rung.requiresSuccessions} succession`}
            {s.held ? " — held" : ""}
            {s.current ? " — you are here" : ""}
          </li>
        ))}
      </ol>

      <p className="mt-8">Purse: {formatPence(purse)}</p>
      <ul className="mt-4">
        {members.map((m) => (
          <li key={m.id}>
            {m.name} — {m.status}
          </li>
        ))}
      </ul>
      <ul className="mt-4">
        {deeds.map((d, i) => (
          <li key={i}>
            {d.reason} +{d.ar} Ār
          </li>
        ))}
      </ul>
    </>
  );
}
