import { epithet } from "@/lib/naming";
import { approvedCharacters } from "@/lib/queries";
import { Back, Leaf } from "@/components/leaf";

export const dynamic = "force-dynamic";

/**
 * The public roster: approved characters only.
 *
 * Spoiler discipline applies. This lists what players wrote about their own
 * characters and adds no commentary of its own.
 */
export default async function Roster() {
  let characters: Awaited<ReturnType<typeof approvedCharacters>> = [];
  let unavailable = false;
  try {
    characters = await approvedCharacters();
  } catch {
    unavailable = true;
  }

  return (
    <Leaf full>
      <Back href="/">← Auren</Back>

      <p className="eyebrow mt-10">Roll of souls</p>
      <h1 className="display mt-3 text-[clamp(2.4rem,6vw,3.6rem)]">The Census</h1>
      <p className="mt-2 text-sm text-ink-soft">
        {unavailable
          ? "The records are unreachable just now."
          : `${characters.length} accepted`}
      </p>
      <div className="hair mt-8" />

      <ul className="mt-10 grid gap-6 sm:grid-cols-2">
        {characters.map((c, i) => (
          <li
            key={c.id}
            className="record p-6 transition-transform hover:-translate-y-0.5"
          >
            <span className="numeral !text-left text-base">{i + 1}</span>
            <h2 className="display mt-1 text-2xl">
              {epithet(c.character_name, c.house_name)}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              {c.answers?.concept ?? ""}
            </p>
          </li>
        ))}
      </ul>

      {!unavailable && characters.length === 0 && (
        <p className="mt-10 text-sm text-ink-soft">Nobody has been accepted yet.</p>
      )}
    </Leaf>
  );
}
