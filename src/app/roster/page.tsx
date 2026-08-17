import Link from "next/link";

import { approvedCharacters } from "@/lib/queries";

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
    <main className="min-h-dvh bg-[#0b0f0c] px-6 py-16 text-[#e8e2d4]">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-xs uppercase tracking-[0.3em] text-[#e8e2d4]/40 hover:text-[#f0b429]">
          ← Auren
        </Link>

        <h1 className="mt-6 font-serif text-4xl">The Census</h1>
        <p className="mt-2 text-sm text-[#e8e2d4]/50">
          {unavailable
            ? "The records are unreachable just now."
            : `${characters.length} accepted`}
        </p>

        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {characters.map((c) => (
            <li
              key={c.id}
              className="rounded-sm border border-white/10 p-5 transition-colors hover:border-[#f0b429]/40"
            >
              <h2 className="font-serif text-xl">{c.character_name}</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#e8e2d4]/65">
                {c.answers?.concept ?? ""}
              </p>
            </li>
          ))}
        </ul>

        {!unavailable && characters.length === 0 && (
          <p className="mt-10 text-sm text-[#e8e2d4]/50">
            Nobody has been accepted yet.
          </p>
        )}
      </div>
    </main>
  );
}
