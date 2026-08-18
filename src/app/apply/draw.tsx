"use client";

import { useState, useTransition } from "react";

import { draw } from "./actions";

type Card = { ar: number; line: string; text: string; hook: string | null };

/**
 * The draw.
 *
 * The animation runs *after* the server has committed, over a value it was
 * handed. It cannot influence the result — the count-up is decoration on a
 * number that already exists in the database.
 */
export function DrawCard({ cynnId }: { cynnId: string }) {
  const [pending, start] = useTransition();
  const [card, setCard] = useState<Card | null>(null);
  const [shown, setShown] = useState(0);
  const [error, setError] = useState<string | null>(null);

  function reveal(c: Card) {
    setCard(c);
    // Count toward the committed value. Deliberately not a random walk —
    // it should look like a reading, not a slot machine.
    let n = 0;
    const step = () => {
      n += 1;
      setShown(n);
      if (n < c.ar) setTimeout(step, 260 - n * 12);
    };
    setTimeout(step, 350);
  }

  if (card) {
    return (
      <div className="mt-10 rounded-sm border border-[#f0b429]/40 p-8 text-center">
        <div className="font-serif text-7xl text-[#f0b429] tabular-nums">
          {shown}
        </div>
        <div className="mt-2 text-xs uppercase tracking-[0.35em] text-[#e8e2d4]/45">
          {card.line}
        </div>
        <p className="mx-auto mt-6 max-w-prose text-[#e8e2d4]/80">{card.text}</p>
        {card.hook && (
          <p className="mx-auto mt-4 max-w-prose border-t border-white/10 pt-4 text-sm italic text-[#e8e2d4]/50">
            {card.hook}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-10 text-center">
      <button
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await draw(cynnId);
            if (res.error) setError(res.error);
            else if (res.card) reveal(res.card);
          })
        }
        className="rounded-sm border border-[#f0b429]/60 px-10 py-4 text-sm uppercase tracking-[0.3em] text-[#f0b429] transition-colors hover:bg-[#f0b429] hover:text-[#0b0f0c] disabled:opacity-40"
      >
        {pending ? "Reading…" : "Draw the House's history"}
      </button>
      <p className="mt-4 text-xs text-[#e8e2d4]/40">
        What the line was known for before it took ship. Once, and it does not
        change.
      </p>
      {error && <p className="mt-3 text-sm text-[#e2725b]">{error}</p>}
    </div>
  );
}
