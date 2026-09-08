"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { epithet, settlementEcho } from "@/lib/naming";
import type { Town } from "@/lib/towns.generated";
import { enter, look, type Look } from "./actions";
import {
  EMPTY, STEPS, problemWith,
  type Draft, type StepId,
} from "./steps";
import { Body } from "./body";
import { Kin } from "./kin";
import { Preview } from "./preview";

/**
 * The census, as a page of the register rather than a signup form.
 *
 * One section open at a time; everything already answered stays legible above
 * it, collapsed to what was written and re-openable; and the record being
 * assembled is shown throughout, so a player can see the thing they are making
 * rather than a progress bar.
 *
 * NOTHING IS IN localStorage. The draft and the step both live in this
 * component, and the step is mirrored into the URL so the browser's own back
 * button walks the steps rather than leaving the page — and because nothing
 * remounts, every answer is still there when it arrives. Nothing survives a
 * deliberate reload, which is the point: a half-finished character quietly
 * restored a week later is worse than an empty form.
 */
export function Census({
  towns,
  who,
  startFull,
  startLiving,
}: {
  towns: Town[];
  who: string;
  startFull: boolean;
  startLiving: { id: string; name: string; house: string | null }[];
}) {
  /**
   * The step lives in React state and is MIRRORED to the URL, rather than read
   * from it.
   *
   * Reading it from `useSearchParams` and moving with `router.replace` means a
   * server round trip on every Next button — this page is `force-dynamic` — and
   * a re-render that can drop the draft. The requirement is that answers
   * survive going back, so the answers and the step both stay in this
   * component, and `history.pushState` keeps the address bar honest.
   *
   * `popstate` puts the browser's own back button back in play: it walks the
   * steps rather than leaving the page, and because nothing remounted, every
   * answer is still there when it arrives.
   */
  const [current, setCurrent] = useState<StepId>(() => {
    if (typeof window === "undefined") return STEPS[0].id;
    const asked = new URLSearchParams(window.location.search).get("step");
    return STEPS.find((s) => s.id === asked)?.id ?? STEPS[0].id;
  });

  useEffect(() => {
    const onPop = () => {
      const asked = new URLSearchParams(window.location.search).get("step");
      setCurrent(STEPS.find((s) => s.id === asked)?.id ?? STEPS[0].id);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [problem, setProblem] = useState<string | null>(null);
  const [seen, setSeen] = useState<Look>({ house: null, kin: [] });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<
    { petitioned: boolean; house: string; notified: string[] } | null
  >(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  const index = STEPS.findIndex((s) => s.id === current);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  /**
   * Focus moves to the new step's heading when one opens.
   *
   * Not on first render: taking focus off the document on arrival is
   * disorienting, and it steals focus from anybody who tabbed straight in.
   */
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    heading.current?.focus();
  }, [current]);

  /**
   * Ask the server what it already knows about the names on the page.
   *
   * Debounced, because it runs from typing. It answers two questions in one
   * round trip — does that House already stand, and do any of those kin names
   * belong to somebody — because both change what the submit will do and both
   * have to be said in the flow rather than afterwards.
   */
  const houseName = draft.house;
  // Serialised for the dependency array rather than joined on a separator:
  // a name can contain any character, so no separator is safe to split back on.
  const kinNames = JSON.stringify(
    draft.kin.map((k) => k.name.trim()).filter(Boolean),
  );
  useEffect(() => {
    const names = JSON.parse(kinNames) as string[];
    if (!houseName.trim() && names.length === 0) {
      setSeen({ house: null, kin: [] });
      return;
    }
    const id = setTimeout(() => {
      void look(houseName, names).then(setSeen);
    }, 350);
    return () => clearTimeout(id);
  }, [houseName, kinNames]);

  const goto = useCallback((id: StepId) => {
    setCurrent(id);
    window.history.pushState(null, "", `/apply?step=${id}`);
  }, []);

  const advance = () => {
    const wrong = problemWith(current, draft);
    if (wrong) {
      setProblem(wrong);
      return;
    }
    setProblem(null);
    goto(STEPS[Math.min(index + 1, STEPS.length - 1)].id);
  };

  const submit = async () => {
    setBusy(true);
    setProblem(null);
    const res = await enter(draft);
    setBusy(false);
    if (!res.ok) {
      setProblem(res.error);
      return;
    }
    setDone({ petitioned: res.petitioned, house: res.house, notified: res.notified });
  };

  // At capacity. Refuses, names the souls in the way, and says what would
  // have to happen — a refusal that does not say what to do next is a wall.
  if (startFull) {
    return (
      <div className="empty">
        <strong>You bear three living souls, which is the limit.</strong>
        The roll holds three to a name. To enter another,{" "}
        {startLiving.map((l, i) => (
          <span key={l.id}>
            {i > 0 && (i === startLiving.length - 1 ? " or " : ", ")}
            <b>{epithet(l.name, l.house)}</b>
          </span>
        ))}{" "}
        would have to depart the island or die first. Departure is written in
        Discord; either way the record stays on the roll, struck through, and
        the name is never freed.
      </div>
    );
  }

  if (done) {
    return (
      <section className="note">
        <p className="note-head">Entered</p>
        <p className="plate-name">{epithet(draft.name, done.house)}</p>
        <p className="spaced-tight">
          {done.petitioned
            ? `${done.house} already stands, so this is a petition. They decide, and the record reads pending until they answer.`
            : `${done.house} stands. You founded it, and the only person who could admit you was you.`}
        </p>
        {done.notified.length > 0 && (
          <p className="hand spaced-tight">
            {done.notified.join(", ")}{" "}
            {done.notified.length === 1 ? "belongs" : "belong"} to another
            player, so those ties entered as claims and wait for agreement. They
            are on the tree, marked, until then.
          </p>
        )}
        <p className="actions">
          <a href="/record" className="btn">Read the record</a>
          <a href="/tree" className="btn btn--ghost">The tree</a>
        </p>
      </section>
    );
  }

  const step = STEPS[index];

  return (
    <div className="census">
      <div className="census-main">
        {/* Everything already answered, still legible, and re-openable. */}
        {STEPS.slice(0, index).map((s) => (
          <button
            key={s.id}
            type="button"
            className="census-done"
            onClick={() => goto(s.id)}
          >
            <span className="census-n">{s.n}</span>
            <span className="census-done-body">
              <span className="census-done-title">{s.title}</span>
              <span className="census-done-answer">{summarise(s.id, draft)}</span>
            </span>
            <span className="census-amend">amend</span>
          </button>
        ))}

        <section className="census-step" aria-labelledby="census-heading">
          <p className="eyebrow">
            Step {step.n} of {STEPS.length} &middot; {step.sub}
          </p>
          <h2 id="census-heading" ref={heading} tabIndex={-1}>
            {step.title}
          </h2>

          <div className="spaced">
            {current === "where" && (
              <Where towns={towns} value={draft.town} onPick={(t) => set("town", t)} />
            )}

            {current === "name" && (
              <TheName draft={draft} set={set} standing={seen.house} who={who} />
            )}

            {current === "craft" && (
              <label className="f-field">
                <span className="f-label">The craft</span>
                <input
                  type="text"
                  value={draft.craft}
                  maxLength={80}
                  placeholder="smith, netmender, drover, tally-clerk"
                  onChange={(e) => set("craft", e.target.value)}
                />
                <p className="f-hint">
                  Whatever you type is the trade. Those are examples rather than
                  a list: if the island needs somebody to do it, it is a craft.
                </p>
              </label>
            )}

            {current === "body" && <Body draft={draft} set={set} />}

            {current === "kin" && (
              <Kin
                kin={draft.kin}
                matches={seen.kin}
                onChange={(kin) => set("kin", kin)}
              />
            )}

            {current === "account" && (
              <label className="f-field">
                <span className="f-label">The long account</span>
                <textarea
                  rows={12}
                  maxLength={4000}
                  value={draft.account}
                  placeholder="Where they came from, what happened to them, and what they are doing here."
                  onChange={(e) => set("account", e.target.value)}
                />
                <p className="f-hint">
                  This is the part staff actually read. Everything above it is
                  the register; this is the person.
                </p>
              </label>
            )}

            {current === "review" && (
              <Review draft={draft} standing={seen.house} matches={seen.kin} />
            )}
          </div>

          {problem && (
            <p className="f-error" role="alert">
              {problem}
            </p>
          )}

          <div className="actions">
            {index > 0 && (
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => goto(STEPS[index - 1].id)}
              >
                Back
              </button>
            )}
            {current === "review" ? (
              <button type="button" className="btn" disabled={busy} onClick={submit}>
                {busy ? "Entering…" : "Enter it in the census"}
              </button>
            ) : (
              <button type="button" className="btn" onClick={advance}>
                Next
              </button>
            )}
          </div>
        </section>
      </div>

      <Preview draft={draft} standing={seen.house} />
    </div>
  );
}

/** What a finished step says once it is collapsed. */
function summarise(id: StepId, d: Draft): string {
  switch (id) {
    case "where":
      return d.town || "not chosen";
    case "name":
      return epithet(d.name.trim(), d.house.trim()) || "not said";
    case "craft":
      return d.craft.trim() || "not said";
    case "body": {
      const bits = [
        d.age && `${d.age} winters`,
        d.heightCm && `${d.heightCm} cm`,
        d.build.trim(),
        d.bearing.trim(),
      ].filter(Boolean);
      return bits.length ? bits.join(" · ") : "not said";
    }
    case "kin": {
      const named = d.kin.filter((k) => k.name.trim());
      return named.length
        ? named.map((k) => k.name.trim()).join(", ")
        : "nobody named";
    }
    case "account":
      return d.account.trim()
        ? `${d.account.trim().split(/\s+/).length} words`
        : "not written";
    default:
      return "";
  }
}

/**
 * The one closed choice in the whole flow.
 *
 * A radio group rather than a select, because it is the most consequential
 * decision here and a nine-item dropdown hides eight of them behind a click.
 * Each says its region and one line of what the place is.
 */
function Where({
  towns,
  value,
  onPick,
}: {
  towns: Town[];
  value: string;
  onPick: (t: string) => void;
}) {
  return (
    <>
      <p className="f-hint census-lede">
        Where you are standing when the register reaches you. It is the only
        thing here chosen from a list, and the only one that decides how the
        rest of the island meets you.
      </p>
      <fieldset className="towns">
        <legend className="f-label">The settlements</legend>
        {towns.map((t) => (
          <label key={t.name} className={`town${value === t.name ? " on" : ""}`}>
            <input
              type="radio"
              name="town"
              value={t.name}
              checked={value === t.name}
              onChange={() => onPick(t.name)}
            />
            <span className="town-body">
              <span className="town-name">
                {t.name}
                <span className="town-region">
                  {t.region === "neither" ? "neither north nor south" : t.region}
                </span>
                {t.forsaken && <span className="town-forsaken">forsaken</span>}
              </span>
              <span className="town-note">{t.note}</span>
            </span>
          </label>
        ))}
      </fieldset>
    </>
  );
}

/*
 * Every one of these clears all four surfaces in lib/colour. #B03030 was here
 * and was dropped: it passed Discord at 1.99 and scored 1.42 against the rail,
 * which is the ground a House seal is actually struck on.
 */
const SWATCHES = [
  "#C74F4F", "#C2762C", "#D2A63C", "#7FA84A",
  "#4C9A2A", "#4FA69B", "#5586C4", "#7B6BC9",
  "#A85FA8", "#C4787F", "#9C8B6E", "#A8ADB4",
];

function TheName({
  draft,
  set,
  standing,
  who,
}: {
  draft: Draft;
  set: <K extends keyof Draft>(k: K, v: Draft[K]) => void;
  standing: Look["house"];
  who: string;
}) {
  const echo = settlementEcho(draft.house, draft.town);
  return (
    <div className="f-stack">
      <label className="f-field">
        <span className="f-label">Given name</span>
        <input
          type="text"
          value={draft.name}
          maxLength={100}
          placeholder={who}
          onChange={(e) => set("name", e.target.value)}
        />
      </label>

      <label className="f-field">
        <span className="f-label">House</span>
        <input
          type="text"
          value={draft.house}
          maxLength={60}
          placeholder="Brackenhow"
          onChange={(e) => set("house", e.target.value)}
        />
      </label>

      {(draft.name.trim() || draft.house.trim()) && (
        <p className="assembled">
          {epithet(draft.name.trim() || "—", draft.house.trim())}
        </p>
      )}

      {/* Which of the two things the submit will do, said before it does it. */}
      {draft.house.trim() && (
        <p className="f-hint">
          {standing
            ? `${standing.name} already stands, seated at ${standing.origin_town}. Entering this will be a petition to join it, and they decide.`
            : "No House of that name stands. You will found it, and it cannot be renamed afterwards."}
        </p>
      )}

      {echo && (
        <p className="census-warn" role="status">
          {echo}
        </p>
      )}

      {!standing && (
        <div className="f-field">
          <span className="f-label">
            Colour <span className="opt">worn by the House in Discord</span>
          </span>
          <div className="swatches">
            {SWATCHES.map((s) => (
              <button
                key={s}
                type="button"
                className={`swatch${draft.colour === s ? " on" : ""}`}
                style={{ background: s }}
                aria-label={`Colour ${s}`}
                aria-pressed={draft.colour === s}
                onClick={() => set("colour", s)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** The record read back, as it will appear on the Record view. */
function Review({
  draft,
  standing,
  matches,
}: {
  draft: Draft;
  standing: Look["house"];
  matches: Look["kin"];
}) {
  const claims = draft.kin.filter(
    (k) =>
      k.name.trim() &&
      matches.some(
        (m) => m.typed.toLowerCase() === k.name.trim().toLowerCase() && m.isPlayer,
      ),
  );
  return (
    <>
      <p className="f-hint census-lede">
        This is the record as it will read. Nothing is written until you enter
        it, and the House name cannot be changed afterwards.
      </p>
      <Preview draft={draft} standing={standing} inline />
      <p className="quiet spaced">
        {standing
          ? `${standing.name} stands already, so this enters as a petition and reads pending until they answer.`
          : `${draft.house.trim() || "The House"} does not stand yet, so entering founds it.`}
      </p>
      {claims.length > 0 && (
        <p className="census-warn">
          {claims.map((c) => c.name.trim()).join(", ")}{" "}
          {claims.length === 1 ? "belongs" : "belong"} to another player. Those
          ties enter as claims and wait for agreement: they show on the tree
          marked as unagreed, never as fact.
        </p>
      )}
    </>
  );
}
