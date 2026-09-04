"use client";

import { useState, useTransition } from "react";

import { claim, confirm } from "./actions";
import type { Edge } from "@/lib/tree";

type Person = { id: string; name: string; confirmed: boolean };

export function Branch({ title, people }: { title: string; people: Person[] }) {
  return (
    <div>
      <h3 className="text-xs uppercase tracking-[0.25em] text-ink-faint">
        {title}
      </h3>
      {people.length === 0 ? (
        <p className="mt-2 text-sm text-ink-faint">—</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {people.map((p) => (
            <li key={p.id} className="flex items-center gap-2 text-sm">
              <span className={p.confirmed ? "" : "text-ink-faint"}>
                {p.name}
              </span>
              {!p.confirmed && (
                <span className="rounded-full border border-vellum-deep px-2 py-0.5 text-[10px] uppercase tracking-wider text-rubric">
                  pending
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Awaiting({ edges }: { edges: Edge[] }) {
  const [pending, start] = useTransition();
  if (edges.length === 0) return null;
  return (
    <section className="mt-10 border border-vellum-deep bg-[rgba(148,48,30,.05)] p-5">
      <h2 className="text-xs uppercase tracking-[0.3em] text-rubric">
        Claims about you
      </h2>
      <p className="mt-2 text-sm text-ink-soft">
        Someone has named you. Nothing renders in the tree until you agree.
      </p>
      <ul className="mt-4 space-y-2">
        {edges.map((e) => (
          <li key={e.id} className="flex items-center justify-between gap-4">
            <span className="text-sm">
              {e.kind === "married_to"
                ? `${e.from_name} claims to be married to ${e.to_name}`
                : `${e.from_name} claims to be parent of ${e.to_name}`}
            </span>
            <button
              disabled={pending}
              onClick={() => start(() => void confirm(e.id))}
              className="act act--ink act--small"
            >
              Agree
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ClaimForm({
  household,
}: {
  household: { id: string; name: string }[];
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (household.length === 0) {
    return (
      <p className="mt-4 text-sm text-ink-faint">
        Nobody else is in the House yet. Most of a tree is forebears who were
        never players — staff can add them.
      </p>
    );
  }

  return (
    <form
      action={(fd) =>
        start(async () => {
          const res = await claim(fd);
          setError(res.error ?? null);
        })
      }
      className="mt-4 flex flex-wrap items-end gap-3"
    >
      <label className="block">
        <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-ink-faint">
          Who
        </span>
        <select name="other" required defaultValue=""
          className="border border-vellum-deep px-3 py-2 text-sm text-ink outline-none">
          <option value="" disabled>Choose</option>
          {household.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-ink-faint">
          Is my
        </span>
        <select name="relation" required defaultValue="parent"
          className="border border-vellum-deep px-3 py-2 text-sm text-ink outline-none">
          <option value="parent">parent</option>
          <option value="child">child</option>
          <option value="spouse">spouse</option>
        </select>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="act act--rubric act--small"
      >
        {pending ? "Claiming…" : "Claim"}
      </button>
      {error && <p className="w-full text-sm text-rubric">{error}</p>}
    </form>
  );
}
