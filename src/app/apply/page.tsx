import Link from "next/link";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { characterFor, cynnFor, listHouses } from "@/lib/cynn";
import { SignIn } from "@/components/auth-buttons";
import { CreateForm } from "./form";
import { DrawCard } from "./draw";

export const dynamic = "force-dynamic";

/**
 * The front door.
 *
 * The Discord modal remains as a fallback, but it caps at five fields and
 * cannot hold a portrait, a crest, a town picker and a bio. This is where
 * creation actually happens.
 *
 * Crown voice: official settlement literature for a place that is lying to
 * you. Spoiler discipline holds — nothing here explains a name.
 */
export default async function Apply() {
  const session = await getServerSession(authOptions);

  if (!session?.discordId) {
    return (
      <Shell>
        <p className="mt-6 text-[#e8e2d4]/70">
          The census is kept by name. Sign in with Discord to be entered.
        </p>
        <div className="mt-8"><SignIn /></div>
      </Shell>
    );
  }

  let character = null, cynn = null, houses: { id: string; name: string }[] = [];
  try {
    [character, cynn, houses] = await Promise.all([
      characterFor(session.discordId),
      cynnFor(session.discordId),
      listHouses(),
    ]);
  } catch {
    return (
      <Shell>
        <p className="mt-6 text-[#6e8b74]">
          The records are unreachable just now. Nothing is lost — try again
          shortly.
        </p>
      </Shell>
    );
  }

  // Founded, not yet drawn. The one remaining step.
  if (cynn && !cynn.draw_card_id) {
    return (
      <Shell>
        <p className="mt-6 text-[#e8e2d4]/70">
          <span className="font-serif text-xl text-[#f0b429]">{cynn.name}</span>{" "}
          stands. What it was known for before it took ship is not yet written.
        </p>
        <DrawCard cynnId={cynn.id} />
      </Shell>
    );
  }

  if (character) {
    return (
      <Shell>
        <p className="mt-6 text-[#e8e2d4]/70">
          {character.membership === "pending"
            ? "Your petition is with the House. They will answer it."
            : "You are entered in the census."}
        </p>
        <Link href="/me"
              className="mt-8 inline-block text-sm uppercase tracking-[0.25em] text-[#f0b429] hover:underline">
          Your record →
        </Link>
      </Shell>
    );
  }

  return (
    <Shell>
      <p className="mt-6 max-w-prose text-[#e8e2d4]/70">
        Every soul on the island is entered in the census. Found a House or
        petition an existing one; once the record is read, the rest of the
        island opens to you.
      </p>
      <CreateForm houses={houses} />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh bg-[#0b0f0c] px-6 py-16 text-[#e8e2d4]">
      <div className="mx-auto max-w-2xl">
        <Link href="/"
              className="text-xs uppercase tracking-[0.3em] text-[#e8e2d4]/40 hover:text-[#f0b429]">
          ← Auren
        </Link>
        <p className="mt-8 text-xs uppercase tracking-[0.45em] text-[#e8e2d4]/50">
          Census
        </p>
        <h1 className="mt-2 font-serif text-5xl">Adventus</h1>
        <div aria-hidden
             className="mt-6 h-px w-32 bg-gradient-to-r from-[#f0b429]/70 to-transparent" />
        {children}
      </div>
    </main>
  );
}
