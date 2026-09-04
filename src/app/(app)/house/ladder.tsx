"use client";

import { useEffect, useState } from "react";

import type { Step } from "@/lib/standing";
import { shortfall } from "@/lib/standing";

/**
 * The ladder. The signature element of the whole app.
 *
 * EVERY RUNG AT ONCE. A single "23 Ār to Ċeorl" line tells a player the next
 * step and nothing about the shape of the climb — that the middle is cheap and
 * the top is generational, that four of the nine rungs cannot be reached in one
 * lifetime at any price. Held rungs are solid, unreached rungs are faded, and
 * under each unreached one is exactly what it is short by.
 *
 * IN BOTH CURRENCIES, because they are two gates and not one. A House can be
 * over an Ār threshold and still not advance: Hold, Ealdormann and Hersir each
 * want a completed succession and Hlāford wants two. The succession requirement
 * is rendered even when the Ār requirement is met — that is the case a player
 * most needs explained, and it is the case a single "N Ār to go" line hides
 * completely.
 *
 * Highest at the top, so the list is read downward toward where the House
 * actually stands and everything above it is visibly still to climb.
 *
 * THE ONE ORCHESTRATED MOMENT IN THE APP. The current rung's mark settles into
 * place when this view opens — it arrives from above and comes to rest, once,
 * on mount. Nothing else animates anywhere, and `prefers-reduced-motion` turns
 * even this off: the mark is simply already there.
 */
export function Ladder({ steps }: { steps: Step[] }) {
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    // Next frame, so the browser has painted the un-settled position first and
    // has something to transition from.
    const id = requestAnimationFrame(() => setSettled(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <ol className="ladder">
      {[...steps].reverse().map((s) => {
        const short = shortfall(s);
        return (
          <li
            key={s.rung.name}
            className={[
              "rung",
              s.held ? "rung--held" : "",
              s.current ? "rung--here" : "",
              s.current && settled ? "rung--settled" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <span className="rung-mark" aria-hidden="true" />
            <div className="rung-body">
              <p className="rung-name">
                <span className="rung-word">{s.rung.name}</span>
                <span className="gloss">{s.rung.sense}</span>
                {s.current && <span className="rung-here-tag">you are here</span>}
              </p>
              <p className="rung-cost">
                {s.rung.threshold} Ār
                {s.rung.requiresSuccessions > 0 &&
                  ` · ${s.rung.requiresSuccessions} completed succession${
                    s.rung.requiresSuccessions > 1 ? "s" : ""
                  }`}
              </p>
              {short && <p className="rung-short">{short}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
