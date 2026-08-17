"use client";

import { useFormState, useFormStatus } from "react-dom";

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

export function ApplyForm() {
  const [state, action] = useFormState<ApplyState, FormData>(apply, {});

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
    <form action={action} className="mt-10 space-y-6">
      <Field name="name" label="Character name" maxLength={100} required />
      <Field
        name="concept"
        label="In a sentence, who are they?"
        maxLength={300}
        rows={2}
        required
      />
      <Field name="origin" label="Where are they from?" maxLength={700} rows={3} />
      <Field name="history" label="History" maxLength={1500} rows={6} required />
      <Field
        name="hook"
        label="What do they want on the island?"
        maxLength={700}
        rows={3}
      />

      {state.error && (
        <p className="text-sm text-[#e2725b]">{state.error}</p>
      )}

      <Submit />
    </form>
  );
}

function Field({
  name,
  label,
  maxLength,
  rows,
  required = false,
}: {
  name: string;
  label: string;
  maxLength: number;
  rows?: number;
  required?: boolean;
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
