import Link from "next/link";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { hasPending } from "@/lib/queries";
import { SignIn } from "@/components/auth-buttons";
import { ApplyForm } from "./form";

export const dynamic = "force-dynamic";

/**
 * The second door.
 *
 * The Discord modal stays; this exists because a gated member can see one
 * channel, and asking them to find a button inside a server they cannot
 * navigate is the wrong order of operations.
 *
 * Crown voice: official settlement literature for a place that is lying to
 * you. Spoiler discipline holds — "what do they want on the island" is doing
 * quiet work and only works if nothing points at it.
 */
export default async function Apply() {
  const session = await getServerSession(authOptions);

  if (!session?.discordId) {
    return (
      <Shell>
        <p className="mt-6 text-[#e8e2d4]/70">
          The census is kept by name. Sign in with Discord to be entered.
        </p>
        <div className="mt-8">
          <SignIn />
        </div>
      </Shell>
    );
  }

  let pending = false;
  let unavailable = false;
  try {
    pending = await hasPending(session.discordId);
  } catch {
    unavailable = true;
  }

  if (unavailable) {
    return (
      <Shell>
        <p className="mt-6 text-[#6e8b74]">
          The records are unreachable just now. Nothing is lost — try again
          shortly.
        </p>
      </Shell>
    );
  }

  if (pending) {
    return (
      <Shell>
        <p className="mt-6 text-[#e8e2d4]/70">
          You have already presented a character. Nothing further is needed —
          you will be told when the record has been read.
        </p>
        <Link
          href="/me"
          className="mt-8 inline-block text-sm uppercase tracking-[0.25em] text-[#f0b429] hover:underline"
        >
          Your record →
        </Link>
      </Shell>
    );
  }

  return (
    <Shell>
      <p className="mt-6 max-w-prose text-[#e8e2d4]/70">
        Every soul on the island is entered in the census. Present a character
        below; once the record is read, the rest of the island opens to you.
      </p>
      <ApplyForm />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh bg-[#0b0f0c] px-6 py-16 text-[#e8e2d4]">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="text-xs uppercase tracking-[0.3em] text-[#e8e2d4]/40 hover:text-[#f0b429]"
        >
          ← Auren
        </Link>
        <p className="mt-8 text-xs uppercase tracking-[0.45em] text-[#e8e2d4]/50">
          Census
        </p>
        <h1 className="mt-2 font-serif text-5xl">Adventus</h1>
        <div
          aria-hidden
          className="mt-6 h-px w-32 bg-gradient-to-r from-[#f0b429]/70 to-transparent"
        />
        {children}
      </div>
    </main>
  );
}
