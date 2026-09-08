"use client";

import { useState, useTransition } from "react";

import { drawWylm, travel } from "./actions";

export function Draw({ available }: { available: number }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [amount, setAmount] = useState(4);

  return (
    <div className="f-inline spaced-tight">
      <label className="f-field f-narrow">
        <span className="f-label">How much</span>
        <input
          type="number"
          min={1}
          max={Math.max(1, available)}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
        />
      </label>
      <button
        type="button"
        disabled={pending || available < 1}
        onClick={() =>
          start(async () => {
            const r = await drawWylm(amount);
            setMsg(r.error ?? `Drew ${r.took} from ${r.line}.`);
          })
        }
        className="btn"
      >
        {pending ? "Drawing…" : "Draw"}
      </button>
      {msg && (
        <span className="quiet" role="status">
          {msg}
        </span>
      )}
    </div>
  );
}

export function Travel({
  towns,
  at,
}: {
  towns: readonly { name: string }[];
  at: string | null;
}) {
  const [pending, start] = useTransition();
  return (
    <form
      action={(fd) => start(async () => { await travel(fd); })}
      className="f-inline"
    >
      <label className="f-field">
        <span className="f-label">Move to</span>
        <select name="town" defaultValue={at ?? ""} required>
          <option value="" disabled>
            Where are you?
          </option>
          {towns.map((t) => (
            <option key={t.name} value={t.name}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      <button disabled={pending} className="btn btn--ghost">
        {pending ? "…" : "Stand here"}
      </button>
    </form>
  );
}
