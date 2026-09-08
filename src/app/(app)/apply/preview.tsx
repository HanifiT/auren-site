"use client";

import { epithet } from "@/lib/naming";
import type { Look } from "./actions";
import { imperial, type Draft } from "./steps";

/**
 * The record being written, shown while it is written.
 *
 * Deliberately the same shape as the Record view — the same ledger of small
 * labelled fields, the same "not said" for anything unanswered — so that what a
 * player sees while filling the census is the thing they are actually making,
 * rather than a progress bar counting steps they have not read.
 *
 * Empty fields print, exactly as they do on the Record. That is what makes this
 * a preview of a register page rather than a summary of a form: the gaps are
 * part of what the record says.
 *
 * `inline` drops the sticky column treatment, for the review step where it is
 * the content rather than an aside.
 */
export function Preview({
  draft,
  standing,
  inline = false,
}: {
  draft: Draft;
  standing: Look["house"];
  inline?: boolean;
}) {
  const cm = Number(draft.heightCm);
  const heightReads = draft.heightCm && Number.isFinite(cm) && cm >= 100 && cm <= 250;
  const named = draft.kin.filter((k) => k.name.trim());

  return (
    <aside className={inline ? "preview preview--inline" : "preview"}>
      <p className="note-head">The record so far</p>

      <p className="preview-name">
        {epithet(draft.name.trim() || "Unnamed", draft.house.trim())}
      </p>
      <p className="epithet">
        {draft.town
          ? `Standing at ${draft.town}${standing ? `, seated at ${standing.origin_town}` : ""}`
          : "Nowhere yet"}
      </p>

      <dl className="preview-fields">
        <Row k="Craft" v={draft.craft} />
        <Row k="Age" v={draft.age && `${draft.age} winters`} />
        <Row
          k="Height"
          v={draft.heightCm && `${draft.heightCm} cm`}
          under={heightReads ? imperial(cm) : null}
        />
        <Row k="Build" v={draft.build} />
        <Row k="Bearing" v={draft.bearing} />
        <Row k="Hair" v={draft.hair} />
        <Row k="Eyes" v={draft.eyes} />
        <Row k="Complexion" v={draft.complexion} />
        <Row k="Voice" v={draft.voice} />
        <Row k="Born" v={draft.born} />
        <Row k="Tongue" v={draft.tongue} />
      </dl>

      {draft.marks.trim() && (
        <>
          <p className="note-head preview-head">Marks</p>
          <p className="preview-prose">{draft.marks.trim()}</p>
        </>
      )}

      {named.length > 0 && (
        <>
          <p className="note-head preview-head">Kin</p>
          <ul className="preview-kin">
            {named.map((k) => (
              <li key={k.key}>
                <span>{k.name.trim()}</span>
                <span className="quiet">
                  {k.relation}
                  {k.through ? ` through ${k.through}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {draft.account.trim() && (
        <>
          <p className="note-head preview-head">The long account</p>
          <p className="preview-prose">{draft.account.trim()}</p>
        </>
      )}
    </aside>
  );
}

/** Empty prints, the same as it does on the Record. */
function Row({
  k,
  v,
  under,
}: {
  k: string;
  v?: string | false | null;
  under?: string | null;
}) {
  const empty = !v || !String(v).trim();
  return (
    <div className="preview-row">
      <dt>{k}</dt>
      <dd className={empty ? "preview-empty" : undefined}>
        {empty ? "not said" : v}
        {under && !empty && <span className="preview-under">{under}</span>}
      </dd>
    </div>
  );
}
