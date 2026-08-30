"use client";

import { useEffect } from "react";

/**
 * The route-level boundary.
 *
 * Without one of these, anything thrown while rendering or inside a server
 * action replaces the whole document with Next's bare "Application error: a
 * client-side exception has occurred" — no route, no wording, nothing the
 * player can act on and nothing that says the work was not lost.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="leaf grid min-h-svh place-items-center px-6">
      <div className="relative z-[1] max-w-[34rem] text-center">
        <p className="eyebrow">The clerk sets down the pen</p>
        <h1 className="display mt-3 text-[clamp(2.2rem,6vw,3.4rem)]">
          Something would not write.
        </h1>
        <p className="mt-5 text-ink-soft">
          Nothing was entered, so nothing is lost. Try again — and if it happens
          twice with the same images, they are probably too large or not the
          format they claim to be.
        </p>
        {error.digest && (
          <p className="hint mt-4">Reference {error.digest}</p>
        )}
        <div className="mt-9 flex flex-wrap justify-center gap-4">
          <button onClick={reset} className="act act--rubric">
            Try again
          </button>
          <a href="/" className="act act--ink">
            Auren
          </a>
        </div>
      </div>
    </main>
  );
}
