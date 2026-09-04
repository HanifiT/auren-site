import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { characterFor, cynnFor } from "@/lib/cynn";
import { edgesFor, householdOf, shapeKin } from "@/lib/tree";
import { Empty, PageHead } from "@/components/register";
import { Ornament } from "@/components/ornament";
import { Awaiting, Branch, ClaimForm } from "./ui";

export const dynamic = "force-dynamic";

/**
 * The Tree — parents, married to, children, and the claim-a-tie flow.
 *
 * Only `parent_of` and `married_to` are stored; siblings, cousins,
 * grandparents and in-laws are traversal (db/007). Store them and you
 * eventually get a tree where A is B's brother and also B's uncle, with no way
 * to say which is wrong.
 *
 * EVERY EDGE NEEDS BOTH ENDS TO AGREE, and that is why the pending explanation
 * sits above the branches rather than under the form: a player who has claimed
 * a tie and cannot see it in the tree needs the reason before they need the
 * button again. `kin_tree` is a view over the confirmed edges only. Pending
 * ones render here, greyed and labelled, because hiding them entirely would
 * make the claim look lost.
 *
 * The site's grant on `kin_edge` is INSERT plus UPDATE of the three
 * confirmation columns and nothing else — it can make a claim and it can agree
 * to one, and it can never manufacture a confirmed edge in a single write.
 */
export default async function Tree() {
  const session = await getServerSession(authOptions);
  if (!session?.discordId) redirect("/");

  let me = null, house = null;
  let unavailable = false;
  try {
    [me, house] = await Promise.all([
      characterFor(session.discordId),
      cynnFor(session.discordId),
    ]);
  } catch {
    unavailable = true;
  }

  if (unavailable) {
    return (
      <>
        <PageHead eyebrow="Þe trēow · the tree" title="The Tree" />
        <Empty title="The records are unreachable just now." line="Nothing is lost." />
      </>
    );
  }

  if (!me || !house) {
    return (
      <>
        <PageHead eyebrow="Þe trēow · the tree" title="The Tree" />
        <Empty
          title="Nobody to hang a tie on."
          line="A tie is between two people in the census. Present yourself first, and this fills in."
        />
      </>
    );
  }

  const [edges, household] = await Promise.all([
    edgesFor(me.id),
    householdOf(house.id),
  ]);
  const kin = shapeKin(me.id, edges);
  const others = household.filter((p) => p.id !== me.id);

  return (
    <>
      <PageHead
        eyebrow="Þe trēow · the tree"
        title={house.name}
        epithet={`${me.name} · ${household.length} in the House`}
        lede="A tie is a claim about somebody else, so it waits until they agree. Only agreed ties are the tree; a claim of your own shows here, marked, so it does not look lost."
      />

      <Awaiting edges={kin.awaiting} />

      <div className="section-head" style={{ marginTop: "1.6rem" }}>
        <Ornament mark="hawthorn" />
        <h2>Kin</h2>
      </div>

      <section className="kin">
        <Branch title="Parents" people={kin.parents} />
        <Branch title="Married to" people={kin.spouses} />
        <Branch title="Children" people={kin.children} />
      </section>

      <div className="section-head">
        <h2>Claim a tie</h2>
      </div>
      <p className="lede" style={{ marginTop: 0 }}>
        Claiming somebody as your father is a claim about them, so nothing you
        enter here renders as agreed until they say so. Only parentage and
        marriage are stored — siblings, cousins and grandparents are read off
        those two rather than written down, which is what stops the tree
        contradicting itself. Forebears who were never players are entered by
        staff.
      </p>
      <ClaimForm household={others} />
    </>
  );
}
