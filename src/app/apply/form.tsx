"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import {
  BEARING, BUILDS, COMPLEXIONS, EYE_COLOURS, HAIR_COLOURS,
  TOWNS, TRADES, inchesToWords,
} from "@/lib/options";
import { ImageCrop } from "@/components/image-crop";
import { readColour } from "@/lib/colour";
import { create, type ApplyState } from "./actions";
import { Entry, Reveal } from "./scroll";

/**
 * The seal is the submit.
 *
 * Pressing wax is a deliberate, one-handed, irreversible gesture, which is
 * exactly the weight this action has — so it is not a button that says Submit.
 */
function Seal({ mode }: { mode: string }) {
  const { pending } = useFormStatus();
  return (
    <Reveal n={11} className="mt-10 flex flex-wrap items-center gap-6">
      <button
        type="submit"
        disabled={pending}
        className="seal"
        aria-label={
          mode === "found" ? "Seal and found the House" : "Seal and petition the House"
        }
      >
        {pending ? "·" : "A"}
      </button>
      <div className="max-w-[22rem] text-sm text-ink-soft">
        <b className="display block text-[1.1rem] font-medium text-ink">
          {pending ? "Pressing…" : "Press the seal"}
        </b>
        Once sealed the line is read into the roll. Names can be added to a
        House later; the House itself cannot be renamed.
      </div>
    </Reveal>
  );
}

/**
 * Height in centimetres, read back in feet and inches.
 *
 * Stored as one integer (db/012) so it can be compared later, but almost
 * nobody thinks in centimetres about how tall a person is, so the sheet says
 * both and the box only takes one.
 */
function HeightField() {
  const [cm, setCm] = useState("");
  const n = Number(cm);
  const shown = cm && Number.isFinite(n) && n >= 100 && n <= 250;
  return (
    <label className="block">
      <span className="field-label">Height</span>
      <input
        name="height_cm"
        type="number"
        min={100}
        max={250}
        value={cm}
        onChange={(e) => setCm(e.target.value)}
        placeholder="cm"
      />
      <span className="hint mt-1 block">
        {shown ? inchesToWords(n) : "In centimetres"}
      </span>
    </label>
  );
}

/**
 * The House colour, shown as it will actually appear.
 *
 * The preview is a Discord member-list row on Discord's own dark background,
 * because that is the only place this colour is ever seen and a swatch on
 * parchment tells you nothing about whether the name will be readable there.
 * The sigil is in it for the same reason — it is part of the role name.
 *
 * Validation is the same function the server action runs. Being told in the
 * form beats being told after the seal is pressed, but the server still
 * decides: this is a courtesy, not the check.
 */
// Every one of these clears all four surfaces in lib/colour. #B03030 was here
// and was dropped: it passed Discord at 1.99 and scored 1.42 against the rail,
// which is the ground a House seal is actually struck on.
const SWATCHES = [
  "#C74F4F", "#C2762C", "#D2A63C", "#7FA84A",
  "#4C9A2A", "#4FA69B", "#5586C4", "#7B6BC9",
  "#A85FA8", "#C4787F", "#9C8B6E", "#A8ADB4",
];

function HouseColour({ houseName }: { houseName: string }) {
  const [colour, setColour] = useState("#4C9A2A");
  const verdict = readColour(colour);
  const shown = houseName.trim() || "Ashcombe";

  return (
    <>
      <input type="hidden" name="colour" value={colour} />
      <div
        className="flex items-center gap-3 rounded-md px-4 py-3"
        style={{ background: "#313338" }}
      >
        <span
          className="display text-lg font-medium"
          style={{ color: verdict.ok ? colour : "#96989d" }}
        >
          {"\u2691"} {shown}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {SWATCHES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setColour(s)}
            aria-label={s}
            aria-pressed={colour.toLowerCase() === s.toLowerCase()}
            className="h-7 w-7 rounded-full ring-offset-2 transition"
            style={{
              background: s,
              boxShadow: colour.toLowerCase() === s.toLowerCase()
                ? "0 0 0 2px currentColor" : "none",
            }}
          />
        ))}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <input
          type="color"
          value={colour}
          onChange={(e) => setColour(e.target.value)}
          aria-label="Any other colour"
          className="h-9 w-12 cursor-pointer bg-transparent p-0"
        />
        <input
          type="text"
          value={colour}
          onChange={(e) => setColour(e.target.value)}
          aria-label="Colour, as hex"
          spellCheck={false}
          className="w-32 font-mono"
        />
      </div>

      <p className="hint mt-2">
        {verdict.ok
          ? "Worn by every member of the House. It cannot be changed later."
          : verdict.reason}
      </p>
    </>
  );
}

function Choose({
  name,
  label,
  options,
}: {
  name: string;
  label: string;
  options: readonly string[];
}) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <select name={name} defaultValue="">
        <option value="">—</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}

export function CreateForm({ houses }: { houses: { id: string; name: string }[] }) {
  const [state, action] = useFormState<ApplyState, FormData>(create, {});
  const [mode, setMode] = useState<"found" | "join">("found");
  // Controlled only so the colour preview can show the real name. Nothing
  // else depends on it.
  const [houseName, setHouseName] = useState("");

  if (state.ok) {
    return (
      <div className="panel mt-10">
        <p className="display text-2xl text-rubric">Entered.</p>
        <p className="mt-2 text-sm text-ink-soft">
          {mode === "found"
            ? "Your House stands. Draw its history below."
            : "Your petition is with the House. They will answer it."}
        </p>
      </div>
    );
  }

  // The numerals have to be true, so the line numbers are counted at render
  // rather than hardcoded — petitioning is four lines shorter than founding.
  let line = 0;
  const n = () => line++;

  return (
    <form action={action} className="mt-6">
      <input type="hidden" name="mode" value={mode} />

      <Entry n={n()} label="The name">
        <div className="choice" role="group" aria-label="How the name is taken">
          {(["found", "join"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
            >
              {m === "found" ? "Found a House" : "Petition one"}
            </button>
          ))}
        </div>
      </Entry>

      {mode === "found" ? (
        <>
          <Entry n={n()} label="House name" htmlFor="house_name">
            <input id="house_name" name="house_name" type="text" maxLength={60}
                   placeholder="Ashcombe" value={houseName}
                   onChange={(e) => setHouseName(e.target.value)} />
          </Entry>

          <Entry n={n()} label="Motto" htmlFor="motto">
            <input id="motto" name="motto" type="text" maxLength={120}
                   placeholder="What the House says when it is asked" />
          </Entry>

          <Entry n={n()} label="Crest" htmlFor="crest">
            <ImageCrop
              name="crest"
              aspect={1}
              frameWidth={220}
              output={{ width: 512, height: 512 }}
              empty="Nothing borne yet."
              hint="What is on the shield. It is cut square."
            />
          </Entry>

          <Entry n={n()} label="Colour">
            <HouseColour houseName={houseName} />
          </Entry>

          <Entry n={n()} label="Where the line is from" htmlFor="origin_town">
            <select id="origin_town" name="origin_town" required defaultValue="">
              <option value="" disabled>Choose a town</option>
              {TOWNS.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name} —{" "}
                  {t.standing === "neither" ? "neither north nor south" : t.standing}
                </option>
              ))}
            </select>
            <p className="hint mt-2">
              Not where they live — everyone lives on the island now. This is
              where the name carries.
            </p>
          </Entry>
        </>
      ) : (
        <Entry n={n()} label="Which House" htmlFor="cynn_id">
          <select id="cynn_id" name="cynn_id" required defaultValue="">
            <option value="" disabled>Choose a House</option>
            {houses.map((h) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
          <p className="hint mt-2">A petition, not an entry. The House decides.</p>
        </Entry>
      )}

      <Entry n={n()} label="The person" htmlFor="name">
        <input id="name" name="name" type="text" maxLength={100} required
               placeholder="Given name, then the House" />
        <div className="mt-5 grid gap-5 sm:grid-cols-3">
          <label className="block">
            <span className="field-label">Age</span>
            <input name="age" type="number" min={0} max={200} />
          </label>
          <Choose name="bearing" label="Bearing" options={BEARING} />
          <Choose name="trade" label="Trade" options={TRADES} />
        </div>
      </Entry>

      <Entry n={n()} label="Likeness" htmlFor="portrait">
        <ImageCrop
          name="portrait"
          aspect={0.8}
          frameWidth={240}
          output={{ width: 800, height: 1000 }}
          empty="No likeness taken."
          hint="Re-encoded on upload. Nothing but the picture is kept."
        />
      </Entry>

      {/*
        The appearance block is the one part of this form that is not
        administrative. A census asks what the clerk could see, so these are
        the questions a clerk would actually have answered by looking.
      */}
      <Entry n={n()} label="As they appear">
        <div className="grid gap-5 sm:grid-cols-3">
          <Choose name="hair_colour" label="Hair" options={HAIR_COLOURS} />
          <label className="block sm:col-span-2">
            <span className="field-label">Worn how</span>
            <input name="hair_style" type="text" maxLength={80}
                   placeholder="Cropped short · a long plait · shaved at the sides" />
          </label>
          <Choose name="eyes" label="Eyes" options={EYE_COLOURS} />
          <Choose name="complexion" label="Complexion" options={COMPLEXIONS} />
          <Choose name="build" label="Build" options={BUILDS} />
          <HeightField />
        </div>
      </Entry>

      <Entry n={n()} label="Marks" htmlFor="marks">
        <input id="marks" name="marks" type="text" maxLength={200}
               placeholder="Scars, burns, ink, a missing finger — anything the assessor would note" />
        <p className="hint mt-2">
          What identifies them across a room, or in a description read aloud.
        </p>
      </Entry>

      <Entry n={n()} label="In a sentence, who are they?" htmlFor="short">
        <textarea id="short" name="short" rows={2} maxLength={300} required
                  placeholder="What the assessor would write in the margin — two lines, no more." />
        <p className="field-label mt-6">The long account</p>
        <textarea name="bio" rows={9} maxLength={4000} />
      </Entry>

      {state.error && (
        <p className="mt-6 border-l-2 border-rubric pl-3 text-sm text-rubric">
          {state.error}
        </p>
      )}

      <Seal mode={mode} />
    </form>
  );
}
