"use client";

import { useState, useTransition } from "react";

import { claim, confirm } from "./actions";
import type { Edge } from "@/lib/tree";

type Person = { id: string; name: string; confirmed: boolean };

export function Branch({ title, people }: { title: string; people: Person[] }) {
  return (
    <div className="kin-col">
      <p className="note-head">{title}</p>
      {people.length === 0 ? (
        <p className="kin-none">—</p>
      ) : (
        <ul className="roster">
          {people.map((p) => (
            <li key={p.id}>
              <span className="roster-main">{p.name}</span>
              <span className="roster-note">
                {p.confirmed ? "agreed" : "claimed — waiting on them"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Claims made about you, unanswered.
 *
 * It sits at the top of the view rather than at the bottom: somebody has named
 * you and nothing renders in either tree until you answer, which makes it the
 * only thing on the page that is waiting on you.
 */
export function Awaiting({ edges }: { edges: Edge[] }) {
  const [pending, start] = useTransition();
  if (edges.length === 0) return null;
  return (
    <section className="awaiting">
      <p className="note-head">Claims about you</p>
      <p>
        Somebody has named you. Nothing renders in the tree — theirs or yours —
        until you agree.
      </p>
      <ul className="roster spaced-tight">
        {edges.map((e) => (
          <li key={e.id} className="awaiting-row">
            <span>
              {e.kind === "married_to"
                ? `${e.from_name} claims to be married to ${e.to_name}`
                : `${e.from_name} claims to be parent of ${e.to_name}`}
            </span>
            <button
              type="button"
              disabled={pending}
              onClick={() => start(() => void confirm(e.id))}
              className="btn btn--ghost"
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
      <div className="empty spaced">
        <strong>Nobody else is in the House yet.</strong>
        Most of a tree is forebears who were never players, and staff enter
        those. There is nobody here to claim a tie with.
      </div>
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
      className="f-inline spaced"
    >
      <label className="f-field">
        <span className="f-label">Who</span>
        <select name="other" required defaultValue="">
          <option value="" disabled>
            Choose
          </option>
          {household.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <label className="f-field">
        <span className="f-label">Is my</span>
        <select name="relation" required defaultValue="parent">
          <option value="parent">parent</option>
          <option value="child">child</option>
          <option value="spouse">spouse</option>
        </select>
      </label>
      <button type="submit" disabled={pending} className="btn">
        {pending ? "Claiming…" : "Claim"}
      </button>
      {error && (
        <p className="f-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
