import Link from "next/link";

/**
 * The torn edge where the landscape stops and the sheet begins.
 *
 * Two paths, the same outline offset — a tear has a thickness, and the darker
 * under-path is the fibre showing where the sheet parted.
 */
const TEAR =
  "M0 34 L38 26 L74 37 L112 22 L150 33 L192 24 L228 36 L268 27 L306 40 L344 25 " +
  "L382 34 L420 21 L462 33 L500 26 L540 38 L578 24 L618 35 L658 22 L698 34 L736 27 " +
  "L776 39 L814 25 L854 33 L892 21 L932 32 L972 26 L1010 37 L1050 23 L1090 34 " +
  "L1128 26 L1166 36 L1200 28";

export function Tear() {
  return (
    <svg
      className="absolute inset-x-0 -bottom-px z-10 h-[clamp(38px,5vw,74px)] w-full"
      viewBox="0 0 1200 60"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path style={{ fill: "var(--vellum)" }} d={`${TEAR} L1200 60 L0 60Z`} />
      <path style={{ fill: "var(--vellum-deep)" }} opacity=".7" d={`${TEAR} L1200 34 L0 40Z`} />
    </svg>
  );
}

/**
 * A page of the register. Everything that is not the hero sits on one of
 * these: parchment by default, the darker fell for the census.
 */
export function Leaf({
  children,
  dark = false,
  full = false,
  width = "max-w-3xl",
}: {
  children: React.ReactNode;
  dark?: boolean;
  full?: boolean;
  width?: string;
}) {
  return (
    <main
      className={`leaf ${dark ? "leaf--dark" : ""} ${full ? "min-h-svh" : ""} px-6 py-[clamp(3rem,7vw,6rem)]`}
    >
      <div className={`relative z-[1] mx-auto ${width}`}>{children}</div>
    </main>
  );
}

/** `← Auren`, in the clerk's small caps. */
export function Back({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="back inline-block">
      {children}
    </Link>
  );
}
