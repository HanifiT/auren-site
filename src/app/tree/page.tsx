import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { characterFor, cynnFor } from "@/lib/cynn";
import { edgesFor, householdOf, shapeKin } from "@/lib/tree";
import { Back, Leaf } from "@/components/leaf";
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
    <Leaf full width="max-w-2xl">
      <Back href="/me">← Your record</Back>

      <p className="eyebrow mt-10">The tree</p>
      <h1 className="display mt-3 text-[clamp(2.4rem,6vw,3.4rem)]">{house.name}</h1>
      <p className="mt-2 text-sm text-ink-soft">
        {me.name} · {household.length} in the House
      </p>
      <div className="hair mt-8" />

      <Awaiting edges={kin.awaiting} />

      <section className="mt-10 grid gap-8 sm:grid-cols-3">
        <Branch title="Parents" people={kin.parents} />
        <Branch title="Married to" people={kin.spouses} />
        <Branch title="Children" people={kin.children} />
      </section>

      <section className="mt-14 border-t border-vellum-deep pt-8">
        <p className="eyebrow">Claim a tie</p>
        <p className="mt-3 text-sm text-ink-soft">
          A claim is a claim about someone else, so it stays pending until they
          agree. Only agreed ties are in the tree.
        </p>
        <ClaimForm household={others} />
      </section>
    </Leaf>
  );
}
