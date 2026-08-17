"use client";

import { useState, useTransition } from "react";

import { rollStats } from "./actions";

/**
 * The roll button.
 *
 * Deliberately an explicit click and not an effect on mount: a roll that
 * happens on page load happens again on every refresh, which is the thing
 * this design exists to prevent.
 */
export function RollButton() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mt-10">
      <button
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await rollStats();
            setError(res.error ?? null);
          })
        }
        className="rounded-sm border border-[#f0b429]/60 px-8 py-3 text-sm uppercase tracking-[0.25em] text-[#f0b429] transition-colors hover:bg-[#f0b429] hover:text-[#0b0f0c] disabled:opacity-40"
      >
        {pending ? "Casting…" : "Cast the dice"}
      </button>
      <p className="mt-3 text-xs text-[#e8e2d4]/40">
        Once. The numbers are recorded before you see them, and they do not
        change.
      </p>
      {error && <p className="mt-3 text-sm text-[#e2725b]">{error}</p>}
    </div>
  );
}
