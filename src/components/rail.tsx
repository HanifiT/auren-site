"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SignOut } from "./auth-buttons";
import type { Slots } from "@/lib/roll";

/**
 * The rail.
 *
 * A `<nav>` with `aria-current="page"` on the active item — the whole rail is
 * the app's one persistent element, so it is also the one place a screen reader
 * can be told where it is. It lives in the (app) layout, which Next does not
 * remount across routes inside it: a navigation swaps the content area and
 * nothing here re-renders from scratch.
 *
 * Under 900px it becomes a horizontal scrolling bar. The nav stays a list of
 * the same links in the same order — not a hamburger, not a different
 * information architecture at a different width.
 */

export type RailView = {
  href: string;
  label: string;
  sub: string;
};

export function Rail({
  views,
  who,
  ofTheIsland,
  slots,
}: {
  views: RailView[];
  who: string;
  ofTheIsland: boolean;
  slots: Slots;
}) {
  const path = usePathname();

  return (
    <div className="rail">
      <div className="rail-head">
        <Link href="/" className="wordmark">
          Auren
        </Link>
        {/* Unexplained, and it stays that way. Spoiler discipline applies to
            the site exactly as it does in the server. */}
        <p className="rail-motto">Spes ultima dea</p>
      </div>

      <nav className="rail-nav" aria-label="The register">
        {views.map((v) => {
          const on = path === v.href || path.startsWith(v.href + "/");
          return (
            <Link
              key={v.href}
              href={v.href}
              className={`rail-item${on ? " on" : ""}`}
              aria-current={on ? "page" : undefined}
            >
              <span className="rail-mark" aria-hidden="true" />
              <span className="rail-text">
                <span className="rail-label">{v.label}</span>
                <span className="rail-sub">{v.sub}</span>
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="rail-foot">
        <p className="who">{who}</p>
        <p className="who-sub">
          {ofTheIsland ? "of the island" : "not yet of the island"}
        </p>
        <SlotStrip slots={slots} />
        <div className="rail-out">
          <SignOut variant="ink" />
        </div>
      </div>
    </div>
  );
}

/**
 * Slots, drawn to match the constraint rather than to a number we chose.
 *
 * `character_one_living_per_owner` (db/007) is a partial unique index, so the
 * allowance is exactly one and there is no second pip to draw. The departed and
 * the dead are counted apart from it because they stay written and do not take
 * the place — which is the sentence under the pips, said in words rather than
 * left for a player to infer from a greyed-out circle.
 */
function SlotStrip({ slots }: { slots: Slots }) {
  const pips = Array.from({ length: slots.livingAllowed }, (_, i) => (
    <span key={i} className={`pip${i < slots.living ? " filled" : ""}`} />
  ));

  return (
    <div className="slots">
      <p className="slots-row">
        <span className="slots-name">Living</span>
        <span className="slots-pips" aria-hidden="true">
          {pips}
        </span>
        <span className="slots-count">
          {slots.living} of {slots.livingAllowed}
        </span>
      </p>
      <p className="slots-note">
        The roll holds one living soul to a name. Departed and dead stay
        written, and do not take the place.
      </p>
      {(slots.departed > 0 || slots.dead > 0 || slots.pending > 0) && (
        <p className="slots-row quiet">
          {slots.departed > 0 && <span>Departed {slots.departed}</span>}
          {slots.dead > 0 && <span>Dead {slots.dead}</span>}
          {slots.pending > 0 && <span>Awaiting {slots.pending}</span>}
        </p>
      )}
    </div>
  );
}
