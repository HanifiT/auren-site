import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { LIVING_CAP, livingFor } from "@/lib/census";
import { TOWNS } from "@/lib/towns.generated";
import { Empty, PageHead } from "@/components/register";
import { Ornament } from "@/components/ornament";
import { Census } from "./census";

export const dynamic = "force-dynamic";

/**
 * The census.
 *
 * Rebuilt inside the shell as a multi-step page of the register: one section
 * open at a time, everything already answered still legible above it, and the
 * record being assembled shown throughout.
 *
 * The capacity check happens here, on the server, before the flow renders — a
 * form that lets somebody fill in six steps and then refuses is a worse refusal
 * than one that never opened. It is not the enforcement: `character_living_cap`
 * (db/018) is, and it holds whatever this page does.
 */
export default async function Apply() {
  const session = await getServerSession(authOptions);
  if (!session?.discordId) redirect("/");

  let living: Awaited<ReturnType<typeof livingFor>> = [];
  let unavailable = false;
  try {
    living = await livingFor(session.discordId);
  } catch {
    unavailable = true;
  }

  if (unavailable) {
    return (
      <>
        <PageHead eyebrow="Census · adventus" title="Present yourself" />
        <Empty
          title="The records are unreachable just now."
          line="Nothing is lost, and nothing has been written. Try again shortly."
        />
      </>
    );
  }

  return (
    <>
      <PageHead
        eyebrow="Census · adventus"
        title="Present yourself"
        lede="Every soul on the island is entered here. The register asks a great deal and refuses almost nothing: only where you stand is chosen from a list, and everything else is yours to say in your own words."
        aside={
          <span className="tags tags--flush">
            <span className="tag">
              {living.length} of {LIVING_CAP} living
            </span>
          </span>
        }
      />

      <div className="section-head section-head--flush">
        <Ornament mark="crozier" />
        <h2>The blank line</h2>
      </div>

      <Census
        towns={TOWNS}
        who={session.user?.name ?? "Unnamed"}
        startFull={living.length >= LIVING_CAP}
        startLiving={living}
      />
    </>
  );
}
