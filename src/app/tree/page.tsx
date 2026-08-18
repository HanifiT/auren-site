import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { characterFor, cynnFor } from "@/lib/cynn";
import { edgesFor, householdOf, shapeKin } from "@/lib/tree";
import { Awaiting, Branch, ClaimForm } from "./ui";

export const dynamic = "force-dynamic";

export default async function Tree() {
  const session = await getServerSession(authOptions);
  if (!session?.discordId) redirect("/");

  const [me, house] = await Promise.all([
    characterFor(session.discordId),
    cynnFor(session.discordId),
  ]);
  if (!me || !house) redirect("/apply");

  const [edges, household] = await Promise.all([
    edgesFor(me.id),
    householdOf(house.id),
  ]);
  const kin = shapeKin(me.id, edges);
  const others = household.filter((p) => p.id !== me.id);

  return (
    <main className="min-h-dvh bg-[#0b0f0c] px-6 py-16 text-[#e8e2d4]">
      <div className="mx-auto max-w-2xl">
        <Link href="/me"
              className="text-xs uppercase tracking-[0.3em] text-[#e8e2d4]/40 hover:text-[#f0b429]">
          ← Your record
        </Link>

        <h1 className="mt-6 font-serif text-4xl">{house.name}</h1>
        <p className="mt-1 text-sm text-[#e8e2d4]/50">
          {me.name} · {household.length} in the House
        </p>

        <Awaiting edges={kin.awaiting} />

        <section className="mt-10 grid gap-8 sm:grid-cols-3">
          <Branch title="Parents" people={kin.parents} />
          <Branch title="Married to" people={kin.spouses} />
          <Branch title="Children" people={kin.children} />
        </section>

        <section className="mt-12 border-t border-white/10 pt-8">
          <h2 className="text-xs uppercase tracking-[0.3em] text-[#e8e2d4]/40">
            Claim a tie
          </h2>
          <p className="mt-2 text-sm text-[#e8e2d4]/55">
            A claim is a claim about someone else, so it stays pending until
            they agree. Only agreed ties are in the tree.
          </p>
          <ClaimForm household={others} />
        </section>
      </div>
    </main>
  );
}
