import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import Link from "next/link";

import { SignIn, SignOut } from "@/components/auth-buttons";

/**
 * The landing page.
 *
 * Spoiler discipline applies here exactly as it does in the server: nothing on
 * this page explains a name. The sun-to-green gradient and the Latin are
 * foreshadowing, and they only work if they sit inert.
 */
export default async function Home() {
  const session = await getServerSession(authOptions);

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#0b0f0c] text-[#e8e2d4]">
      {/* A day dying: the colour-role arc, as a background. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          background:
            "radial-gradient(120% 80% at 50% -10%, #e2725b 0%, #e08a3c 18%, #f0b429 32%, #ffd666 42%, #a3be5c 58%, #4c9a2a 72%, #388e5c 84%, #6e8b74 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(11,15,12,0.25) 0%, rgba(11,15,12,0.85) 55%, #0b0f0c 100%)",
        }}
      />

      <div className="relative mx-auto flex min-h-dvh max-w-3xl flex-col items-center justify-center px-6 py-24 text-center">
        <p className="mb-6 text-xs uppercase tracking-[0.45em] text-[#e8e2d4]/60">
          Spes ultima dea
        </p>

        <h1 className="font-serif text-6xl leading-none tracking-tight sm:text-8xl">
          Auren
        </h1>

        <div
          aria-hidden
          className="my-8 h-px w-40 bg-gradient-to-r from-transparent via-[#f0b429]/70 to-transparent"
        />

        <p className="max-w-xl text-balance text-lg leading-relaxed text-[#e8e2d4]/80">
          An island that grows without season, under a sun that has not set in
          living memory. The Crown keeps the records. The folk keep the ground.
        </p>

        <div className="mt-12 flex flex-col items-center gap-4">
          {session?.discordId ? (
            <>
              <p className="text-sm text-[#e8e2d4]/70">
                Signed in as{" "}
                <span className="text-[#f0b429]">{session.user?.name}</span>
                {session.inGuild ? (
                  <span className="ml-2 rounded-full border border-[#4c9a2a]/50 px-2 py-0.5 text-xs text-[#a3be5c]">
                    of the island
                  </span>
                ) : (
                  <span className="ml-2 rounded-full border border-[#6e8b74]/50 px-2 py-0.5 text-xs text-[#6e8b74]">
                    foreigner
                  </span>
                )}
              </p>
              <div className="flex gap-3">
                <Link
                  href="/me"
                  className="rounded-sm border border-[#f0b429]/60 px-7 py-3 text-sm uppercase tracking-[0.25em] text-[#f0b429] transition-colors hover:bg-[#f0b429] hover:text-[#0b0f0c]"
                >
                  Your record
                </Link>
                <SignOut />
              </div>
            </>
          ) : (
            <>
              <SignIn />
              <p className="text-xs text-[#e8e2d4]/45">
                Sign in with Discord to be counted among the citizenry.
              </p>
            </>
          )}
        </div>
      </div>

      <footer className="relative pb-8 text-center text-xs text-[#e8e2d4]/30">
        <Link href="/board" className="hover:text-[#f0b429]">
          the board
        </Link>
        <span className="mx-3">·</span>
        <Link href="/roster" className="hover:text-[#f0b429]">
          the census
        </Link>
        <span className="mx-3">·</span>
        auren-rp.xyz
      </footer>
    </main>
  );
}
