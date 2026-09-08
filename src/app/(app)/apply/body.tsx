"use client";

import { imperial, type Draft } from "./steps";

/**
 * Of the body, and two facts of the life that have nowhere else to go.
 *
 * FREE TEXT EXCEPT THE TWO NUMBERS. Build, bearing, hair, eyes, complexion and
 * voice were all pickers checked against a curated list; what somebody looks
 * and sounds like is a thing they should be able to say in their own words, and
 * a list of nine builds is a list of nine ways to not describe somebody.
 *
 * Meant to be quick: one screen, small inputs, and no validation beyond age and
 * height being numbers. A census that refuses to record somebody because they
 * did not say what colour their eyes are is not a census.
 *
 * `born` and `tongue` are here rather than in their own step. They are of the
 * life rather than of the body, so they sit under their own rule at the foot —
 * but they are two short fields and a step of their own would be a step that
 * asks two questions.
 */
export function Body({
  draft,
  set,
}: {
  draft: Draft;
  set: <K extends keyof Draft>(k: K, v: Draft[K]) => void;
}) {
  const cm = Number(draft.heightCm);
  const heightReads =
    draft.heightCm && Number.isFinite(cm) && cm >= 100 && cm <= 250;

  return (
    <div className="f-stack">
      <div className="f-row f-row--tight">
        <label className="f-field">
          <span className="f-label">Age <span className="opt">winters</span></span>
          <input
            type="number"
            min={0}
            max={200}
            value={draft.age}
            onChange={(e) => set("age", e.target.value)}
          />
        </label>

        <label className="f-field">
          <span className="f-label">Height <span className="opt">cm</span></span>
          <input
            type="number"
            min={100}
            max={250}
            value={draft.heightCm}
            onChange={(e) => set("heightCm", e.target.value)}
          />
          <p className={heightReads ? "f-echo" : "f-hint"}>
            {heightReads ? imperial(cm) : "In centimetres"}
          </p>
        </label>

        <label className="f-field">
          <span className="f-label">Build</span>
          <input
            type="text"
            maxLength={60}
            value={draft.build}
            placeholder="rangy, thickset, stooped"
            onChange={(e) => set("build", e.target.value)}
          />
        </label>

        <label className="f-field">
          <span className="f-label">Bearing</span>
          <input
            type="text"
            maxLength={60}
            value={draft.bearing}
            placeholder="grim, open, wry"
            onChange={(e) => set("bearing", e.target.value)}
          />
        </label>

        <label className="f-field">
          <span className="f-label">Hair</span>
          <input
            type="text"
            maxLength={80}
            value={draft.hair}
            placeholder="black, cropped short"
            onChange={(e) => set("hair", e.target.value)}
          />
        </label>

        <label className="f-field">
          <span className="f-label">Eyes</span>
          <input
            type="text"
            maxLength={60}
            value={draft.eyes}
            placeholder="grey, one of each"
            onChange={(e) => set("eyes", e.target.value)}
          />
        </label>

        <label className="f-field">
          <span className="f-label">Complexion</span>
          <input
            type="text"
            maxLength={60}
            value={draft.complexion}
            placeholder="weathered, freckled"
            onChange={(e) => set("complexion", e.target.value)}
          />
        </label>

        <label className="f-field">
          <span className="f-label">Voice</span>
          <input
            type="text"
            maxLength={120}
            value={draft.voice}
            placeholder="low, and slow to start"
            onChange={(e) => set("voice", e.target.value)}
          />
        </label>
      </div>

      <label className="f-field">
        <span className="f-label">Marks</span>
        <input
          type="text"
          maxLength={240}
          value={draft.marks}
          placeholder="scars, burns, ink, a missing finger — what the assessor would note"
          onChange={(e) => set("marks", e.target.value)}
        />
        <p className="f-hint">
          What identifies them across a room, or in a description read aloud.
        </p>
      </label>

      <hr className="f-rule" />

      <div className="f-row">
        <label className="f-field">
          <span className="f-label">Born</span>
          <input
            type="text"
            maxLength={120}
            value={draft.born}
            placeholder="anywhere — most people came from off the island"
            onChange={(e) => set("born", e.target.value)}
          />
        </label>

        <label className="f-field">
          <span className="f-label">Tongue</span>
          <input
            type="text"
            maxLength={120}
            value={draft.tongue}
            placeholder="the common speech; some of the old"
            onChange={(e) => set("tongue", e.target.value)}
          />
        </label>
      </div>
      <p className="f-hint">
        Of the life rather than of the body. Where somebody was born is free
        text and not one of the nine settlements: most people on the island came
        from off it.
      </p>
    </div>
  );
}
