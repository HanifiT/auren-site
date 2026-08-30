import Link from "next/link";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { characterFor, cynnFor, listHouses } from "@/lib/cynn";
import { SignIn } from "@/components/auth-buttons";
import { Back } from "@/components/leaf";
import { CreateForm } from "./form";
import { DrawCard } from "./draw";
import { Scroll } from "./scroll";

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
        <p className="mt-6 text-ink-soft">
          The census is kept by name. Sign in with Discord to be entered.
        </p>
        <div className="mt-8">
          <SignIn variant="ink" />
        </div>
      </Shell>
    );
  }

  let character = null,
    cynn = null,
    houses: { id: string; name: string }[] = [];
  try {
    [character, cynn, houses] = await Promise.all([
      characterFor(session.discordId),
      cynnFor(session.discordId),
      listHouses(),
    ]);
  } catch {
    return (
      <Shell>
        <p className="mt-6 text-ink-soft">
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
        <p className="mt-6 text-ink-soft">
          <span className="display text-2xl text-rubric">{cynn.name}</span> stands.
          What it was known for before it took ship is not yet written.
        </p>
        <DrawCard cynnId={cynn.id} />
      </Shell>
    );
  }

  if (character) {
    return (
      <Shell>
        <p className="mt-6 text-ink-soft">
          {character.membership === "pending"
            ? "Your petition is with the House. They will answer it."
            : "You are entered in the census."}
        </p>
        <Link href="/me" className="act act--ink mt-8">
          Your record →
        </Link>
      </Shell>
    );
  }

  return (
    <Shell>
      <CreateForm houses={houses} />
    </Shell>
  );
}

/**
 * The sheet itself. Everything the census can say is said on one unrolled
 * scroll, whatever state it is in — the register does not change stationery.
 */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="leaf leaf--dark min-h-svh px-6 py-[clamp(3rem,7vw,6rem)]">
      <div className="relative z-[1] mx-auto max-w-3xl">
        <div className="mb-10">
          <Back href="/me">← Your record</Back>
        </div>

        <Scroll>
          <p className="eyebrow">Census</p>
          <h1 className="display mt-3 text-[clamp(2.4rem,5.5vw,3.8rem)]">Adventus</h1>
          <p className="mt-4 max-w-[var(--measure)] text-ink-soft">
            Every soul on the island is entered here. Found a House or petition
            an existing one. Once the line is read back, the rest of the island
            opens to you.
          </p>
          <div className="hair mb-2 mt-8" />
          {children}
        </Scroll>
      </div>
    </main>
  );
}
