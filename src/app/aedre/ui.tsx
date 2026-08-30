"use client";

import { useState, useTransition } from "react";

import { drawWylm, travel } from "./actions";

export function Draw({ available }: { available: number }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [amount, setAmount] = useState(4);

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <input
        type="number" min={1} max={Math.max(1, available)} value={amount}
        onChange={(e) => setAmount(Number(e.target.value))}
        className="w-20 border border-vellum-deep px-3 py-1.5 text-sm outline-none focus:border-rubric"
      />
      <button
        disabled={pending || available < 1}
        onClick={() =>
          start(async () => {
            const r = await drawWylm(amount);
            setMsg(r.error ?? `Drew ${r.took} from ${r.line}.`);
          })
        }
        className="act act--ink act--small"
      >
        {pending ? "Drawing…" : "Draw"}
      </button>
      {msg && <span className="text-sm text-ink-soft">{msg}</span>}
    </div>
  );
}

export function Travel({ towns, at }: { towns: readonly { name: string }[]; at: string | null }) {
  const [pending, start] = useTransition();
  return (
    <form action={(fd) => start(async () => { await travel(fd); })}
          className="flex items-center gap-2">
      <select name="town" defaultValue={at ?? ""} required
        className="border border-vellum-deep px-3 py-1.5 text-sm outline-none">
        <option value="" disabled>Where are you?</option>
        {towns.map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
      </select>
      <button disabled={pending}
        className="act act--ink act--small">
        {pending ? "…" : "Stand here"}
      </button>
    </form>
  );
}
