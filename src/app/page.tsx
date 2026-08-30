import Image from "next/image";
import Link from "next/link";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { SignIn, SignOut } from "@/components/auth-buttons";
import { Tear } from "@/components/leaf";
import fell from "../../public/fell.jpg";

/**
 * The landing page.
 *
 * Spoiler discipline applies here exactly as it does in the server: nothing on
 * this page explains a name. `Spes ultima dea` and the sun-to-green arc are
 * foreshadowing, and they only work if they sit inert.
 *
 * The photograph is doing the work the old gradient did — the island is a
 * place before it is a premise. It is deliberately left bright; the scrim in
 * `.hero::after` darkens only the disc the type sits on.
 */
export default async function Home() {
  const session = await getServerSession(authOptions);

  return (
    <>
      <section className="hero">
        <div className="hero-plate">
          <Image
            src={fell}
            alt="Fells and a high tarn above Grasmere, in the English Lake District"
            fill
            priority
            placeholder="blur"
            sizes="100vw"
          />
        </div>

        <div className="on-plate max-w-[34rem] px-[6vw] py-[8vh] text-center">
          <p className="eyebrow mb-3">Spes Ultima Dea</p>
          <h1 className="wordmark my-1">Auren</h1>
          <div className="hero-rule mx-auto my-6" />

          <p className="mx-auto mb-10 max-w-[26rem] text-[1.06rem] leading-relaxed">
            An island that grows without season, under a sun that has not set in
            living memory. The Crown keeps the records. The folk keep the ground.
          </p>

          {session?.discordId ? (
            <>
              <p className="mb-4 text-[0.86rem] text-[#d9d0b4]">
                Signed in as{" "}
                <b className="font-semibold text-[#d9a94a]">{session.user?.name}</b>
                <span className="badge ml-2">
                  {session.inGuild ? "of the island" : "foreigner"}
                </span>
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link href="/me" className="act act--primary">
                  Your record
                </Link>
                <SignOut />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <SignIn />
              <p className="text-xs text-[#d9d0b4]">
                Sign in with Discord to be counted among the citizenry.
              </p>
            </div>
          )}
        </div>

        <div className="scroll-cue absolute bottom-[clamp(52px,6vw,90px)] left-1/2 z-[2] -translate-x-1/2">
          Read on
        </div>
        <Tear />
      </section>

      {/* What sits under the tear. */}
      <main className="leaf px-[6vw] py-[clamp(3rem,7vw,6rem)] pb-[clamp(4rem,8vw,7rem)]">
        <div className="relative z-[1] mx-auto max-w-[74rem]">
          <p className="eyebrow mb-3">Nineteen years of it</p>
          <h2 className="display text-[clamp(2.6rem,6vw,4.4rem)]">
            The ground remembers
            <br />
            what the roll does not.
          </h2>
          <p className="mt-6 max-w-[var(--measure)] text-[1.05rem] text-ink-soft">
            Three charters answer the failing harvest, and none of them agree.
            Take a name, take a side, and the island will hold you to it.
          </p>

          <div className="hair my-9" />

          <div className="flex flex-wrap gap-4">
            <Link href="/apply" className="act act--ink">
              Your record →
            </Link>
            <Link href="/roster" className="act act--ink">
              The census
            </Link>
          </div>
        </div>
      </main>

      <footer className="leaf border-t border-vellum-deep px-[6vw] py-8 text-center text-xs text-ink-soft">
        <div className="relative z-[1]">
          <Link href="/board" className="hover:text-rubric">
            the board
          </Link>
          <span className="mx-3">·</span>
          <Link href="/aedre" className="hover:text-rubric">
            the ǣdre
          </Link>
          <span className="mx-3">·</span>
          <Link href="/roster" className="hover:text-rubric">
            the census
          </Link>
          <span className="mx-3">·</span>
          auren-rp.xyz
          <p className="mt-4 text-[0.68rem] text-ink-faint">
            Fells above Grasmere ·{" "}
            <a
              className="underline decoration-vellum-deep underline-offset-2 hover:text-rubric"
              href="https://commons.wikimedia.org/wiki/File:Rugged_Ridges_and_Remote_Tarns_%E2%80%93_Lake_District_from_Grasmere_Heights.jpg"
              rel="noreferrer"
            >
              TXGemGem
            </a>
            ,{" "}
            <a
              className="underline decoration-vellum-deep underline-offset-2 hover:text-rubric"
              href="https://creativecommons.org/licenses/by-sa/4.0"
              rel="license noreferrer"
            >
              CC BY-SA 4.0
            </a>
          </p>
        </div>
      </footer>
    </>
  );
}
