"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { BEARING, TOWNS, TRADES } from "@/lib/options";
import { create, type ApplyState } from "./actions";

const field =
  "w-full rounded-sm border border-white/15 bg-white/[0.03] px-4 py-3 text-[#e8e2d4] " +
  "outline-none transition-colors placeholder:text-[#e8e2d4]/25 focus:border-[#f0b429]/60";
const label = "mb-2 block text-xs uppercase tracking-[0.2em] text-[#e8e2d4]/50";

function Submit({ mode }: { mode: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm border border-[#f0b429]/60 px-8 py-3 text-sm uppercase tracking-[0.25em] text-[#f0b429] transition-colors hover:bg-[#f0b429] hover:text-[#0b0f0c] disabled:opacity-40"
    >
      {pending ? "Entering…" : mode === "found" ? "Found the House" : "Petition"}
    </button>
  );
}

export function CreateForm({ houses }: { houses: { id: string; name: string }[] }) {
  const [state, action] = useFormState<ApplyState, FormData>(create, {});
  const [mode, setMode] = useState<"found" | "join">("found");

  if (state.ok) {
    return (
      <div className="mt-10 rounded-sm border border-[#4c9a2a]/40 p-6">
        <p className="font-serif text-xl text-[#a3be5c]">Entered.</p>
        <p className="mt-2 text-sm text-[#e8e2d4]/65">
          {mode === "found"
            ? "Your House stands. Draw its history below."
            : "Your petition is with the House. They will answer it."}
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="mt-10 space-y-10">
      <input type="hidden" name="mode" value={mode} />

      <fieldset>
        <legend className={label}>The name</legend>
        <div className="mb-4 flex gap-2">
          {(["found", "join"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-sm border px-4 py-2 text-xs uppercase tracking-[0.2em] transition-colors ${
                mode === m
                  ? "border-[#f0b429]/60 text-[#f0b429]"
                  : "border-white/15 text-[#e8e2d4]/45 hover:text-[#e8e2d4]/70"
              }`}
            >
              {m === "found" ? "Found a House" : "Join one"}
            </button>
          ))}
        </div>

        {mode === "found" ? (
          <div className="space-y-4">
            <label className="block">
              <span className={label}>House name</span>
              <input name="house_name" maxLength={60} className={field} />
            </label>
            <label className="block">
              <span className={label}>Motto</span>
              <input name="motto" maxLength={120} className={field} />
            </label>
            <label className="block">
              <span className={label}>Crest</span>
              <input type="file" name="crest" accept="image/*"
                     className="text-sm text-[#e8e2d4]/60 file:mr-3 file:rounded-sm file:border file:border-white/15 file:bg-transparent file:px-3 file:py-1.5 file:text-xs file:uppercase file:tracking-wider file:text-[#e8e2d4]/70" />
            </label>
            <label className="block">
              <span className={label}>Where the line is from</span>
              <select name="origin_town" required className={field} defaultValue="">
                <option value="" disabled>Choose a town</option>
                {TOWNS.map((t) => (
                  <option key={t.name} value={t.name}>
                    {t.name} — {t.standing === "neither" ? "neither north nor south" : t.standing}
                  </option>
                ))}
              </select>
              <span className="mt-2 block text-xs text-[#e8e2d4]/35">
                Not where they live — everyone lives on the island now. This is
                where the name carries.
              </span>
            </label>
          </div>
        ) : (
          <label className="block">
            <span className={label}>Which House</span>
            <select name="cynn_id" required className={field} defaultValue="">
              <option value="" disabled>Choose a House</option>
              {houses.map((h) => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
            <span className="mt-2 block text-xs text-[#e8e2d4]/35">
              A petition, not an entry. The House decides.
            </span>
          </label>
        )}
      </fieldset>

      <fieldset className="space-y-4">
        <legend className={label}>The person</legend>
        <label className="block">
          <span className={label}>Name</span>
          <input name="name" maxLength={100} required className={field} />
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className={label}>Age</span>
            <input name="age" type="number" min={0} max={200} className={field} />
          </label>
          <label className="block">
            <span className={label}>Bearing</span>
            <select name="bearing" className={field} defaultValue="">
              <option value="">—</option>
              {BEARING.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </label>
          <label className="block">
            <span className={label}>Trade</span>
            <select name="trade" className={field} defaultValue="">
              <option value="">—</option>
              {TRADES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
        </div>
        <label className="block">
          <span className={label}>Portrait</span>
          <input type="file" name="portrait" accept="image/*"
                 className="text-sm text-[#e8e2d4]/60 file:mr-3 file:rounded-sm file:border file:border-white/15 file:bg-transparent file:px-3 file:py-1.5 file:text-xs file:uppercase file:tracking-wider file:text-[#e8e2d4]/70" />
          <span className="mt-2 block text-xs text-[#e8e2d4]/35">
            Re-encoded on upload. Nothing but the picture is kept.
          </span>
        </label>
        <label className="block">
          <span className={label}>In a sentence, who are they?</span>
          <textarea name="short" rows={2} maxLength={300} required className={field} />
        </label>
        <label className="block">
          <span className={label}>Bio</span>
          <textarea name="bio" rows={10} maxLength={4000} className={field} />
        </label>
      </fieldset>

      {state.error && <p className="text-sm text-[#e2725b]">{state.error}</p>}
      <Submit mode={mode} />
    </form>
  );
}
