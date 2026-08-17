"use client";

import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { STATS, type StatKey } from "@/lib/stats";
import { apply, type ApplyState } from "./actions";

const field =
  "w-full rounded-sm border border-white/15 bg-white/[0.03] px-4 py-3 text-[#e8e2d4] " +
  "outline-none transition-colors placeholder:text-[#e8e2d4]/25 focus:border-[#f0b429]/60";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm border border-[#f0b429]/60 px-8 py-3 text-sm uppercase tracking-[0.25em] text-[#f0b429] transition-colors hover:bg-[#f0b429] hover:text-[#0b0f0c] disabled:opacity-40"
    >
      {pending ? "Entering…" : "Present"}
    </button>
  );
}

export function ApplyForm({ values }: { values: number[] }) {
  const [state, action] = useFormState<ApplyState, FormData>(apply, {});
  const [assigned, setAssigned] = useState<Partial<Record<StatKey, number>>>({});

  // Which rolled numbers are still unspent. Indexed rather than by value,
  // because a roll can legitimately contain the same number twice.
  const remaining = useMemo(() => {
    const pool = [...values];
    for (const v of Object.values(assigned)) {
      const i = pool.indexOf(v as number);
      if (i >= 0) pool.splice(i, 1);
    }
    return pool;
  }, [values, assigned]);

  if (state.ok) {
    return (
      <div className="mt-10 rounded-sm border border-[#4c9a2a]/40 p-6">
        <p className="font-serif text-xl text-[#a3be5c]">Entered.</p>
        <p className="mt-2 text-sm text-[#e8e2d4]/65">
          Your character is with the censors. You will be told when the record
          has been read.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="mt-10 space-y-8">
      <fieldset>
        <legend className="mb-4 text-xs uppercase tracking-[0.3em] text-[#e8e2d4]/50">
          Assign your numbers
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {STATS.map((stat) => (
            <label
              key={stat.key}
              className="flex items-center justify-between gap-3 rounded-sm border border-white/10 px-4 py-3"
            >
              <span>
                <span className="font-serif text-lg">{stat.name}</span>
                <span className="ml-2 text-xs text-[#e8e2d4]/40">
                  {stat.gloss}
                </span>
              </span>
              <select
                name={`stat_${stat.key}`}
                required
                value={assigned[stat.key] ?? ""}
                onChange={(e) =>
                  setAssigned((a) => ({
                    ...a,
                    [stat.key]: Number(e.target.value),
                  }))
                }
                className="rounded-sm border border-white/15 bg-[#0b0f0c] px-3 py-1.5 text-lg text-[#f0b429] outline-none"
              >
                <option value="">—</option>
                {Array.from(new Set(values))
                  .sort((a, b) => b - a)
                  .filter(
                    (v) =>
                      remaining.includes(v) || assigned[stat.key] === v,
                  )
                  .map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
              </select>
            </label>
          ))}
        </div>
        <p className="mt-3 text-xs text-[#e8e2d4]/40">
          Rolled: {values.slice().sort((a, b) => b - a).join(" · ")}
          {remaining.length > 0 && (
            <span className="ml-2 text-[#f0b429]/70">
              {remaining.length} left to place
            </span>
          )}
        </p>
      </fieldset>

      <div className="space-y-6">
        <Field name="name" label="Character name" maxLength={100} required />
        <Field name="concept" label="In a sentence, who are they?" maxLength={300} rows={2} required />
        <Field name="origin" label="Where are they from?" maxLength={700} rows={3} />
        <Field name="history" label="History" maxLength={1500} rows={6} required />
        <Field name="hook" label="What do they want on the island?" maxLength={700} rows={3} />
      </div>

      {state.error && <p className="text-sm text-[#e2725b]">{state.error}</p>}
      <Submit />
    </form>
  );
}

function Field({
  name, label, maxLength, rows, required = false,
}: {
  name: string; label: string; maxLength: number; rows?: number; required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-[#e8e2d4]/50">
        {label}
      </span>
      {rows ? (
        <textarea name={name} rows={rows} maxLength={maxLength} required={required} className={field} />
      ) : (
        <input name={name} maxLength={maxLength} required={required} className={field} />
      )}
    </label>
  );
}
