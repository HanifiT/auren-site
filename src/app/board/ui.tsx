"use client";

import { useState, useTransition } from "react";

import { post, settle, submit, take } from "./actions";

function pence(n: number): string {
  const parts: string[] = [];
  const pounds = Math.floor(n / 240);
  const shillings = Math.floor((n % 240) / 12);
  const d = n % 12;
  if (pounds) parts.push(`£${pounds}`);
  if (shillings) parts.push(`${shillings}s`);
  if (d || parts.length === 0) parts.push(`${d}d`);
  return parts.join(" ");
}

export function Reward({ p, tier }: { p: number; tier: string | null }) {
  return (
    <span className="whitespace-nowrap text-sm">
      <span className="text-[#f0b429]">{pence(p)}</span>
      {tier && <span className="ml-2 text-[#a3be5c]">· {tier} Ār</span>}
    </span>
  );
}

export function TakeButton({ missionId, taken }: { missionId: string; taken: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  if (taken) {
    return <span className="text-xs uppercase tracking-wider text-[#a3be5c]">taken</span>;
  }
  return (
    <span className="flex flex-col items-end gap-1">
      <button
        disabled={pending}
        onClick={() => start(async () => setError((await take(missionId)).error ?? null))}
        className="rounded-sm border border-[#f0b429]/60 px-5 py-1.5 text-xs uppercase tracking-[0.2em] text-[#f0b429] transition-colors hover:bg-[#f0b429] hover:text-[#0b0f0c] disabled:opacity-40"
      >
        {pending ? "…" : "Take"}
      </button>
      {error && <span className="text-xs text-[#e2725b]">{error}</span>}
    </span>
  );
}

export function SubmitWork({ claimId }: { claimId: string }) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  if (done) {
    return <span className="text-xs uppercase tracking-wider text-[#f0b429]">submitted</span>;
  }
  return (
    <form
      action={(fd) => start(async () => { await submit(fd); setDone(true); })}
      className="mt-3 flex gap-2"
    >
      <input type="hidden" name="claim_id" value={claimId} />
      <input
        name="note"
        placeholder="What did you do?"
        maxLength={2000}
        className="flex-1 rounded-sm border border-white/15 bg-white/[0.03] px-3 py-2 text-sm outline-none focus:border-[#f0b429]/60"
      />
      <button
        disabled={pending}
        className="rounded-sm border border-white/20 px-4 py-2 text-xs uppercase tracking-wider text-[#e8e2d4]/70 hover:border-[#f0b429]/60 hover:text-[#f0b429] disabled:opacity-40"
      >
        {pending ? "…" : "Submit"}
      </button>
    </form>
  );
}

export function Settle({ claimId }: { claimId: string }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  if (result) return <span className="text-xs text-[#a3be5c]">{result}</span>;
  return (
    <span className="flex gap-2">
      {([true, false] as const).map((pay) => (
        <button
          key={String(pay)}
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await settle(claimId, pay);
              setResult(
                r.error ??
                  (pay ? `paid ${pence(r.paid ?? 0)}${r.ar ? ` · +${r.ar} Ār` : ""}`
                       : "rejected"),
              );
            })
          }
          className={`rounded-sm border px-4 py-1.5 text-xs uppercase tracking-wider transition-colors disabled:opacity-40 ${
            pay
              ? "border-[#4c9a2a]/50 text-[#a3be5c] hover:bg-[#4c9a2a]/15"
              : "border-[#6e8b74]/50 text-[#6e8b74] hover:bg-[#6e8b74]/10"
          }`}
        >
          {pay ? "Pay" : "Reject"}
        </button>
      ))}
    </span>
  );
}

export function PostMission({ towns }: { towns: readonly { name: string }[] }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const field =
    "w-full rounded-sm border border-white/15 bg-white/[0.03] px-3 py-2 text-sm outline-none focus:border-[#f0b429]/60";

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-sm border border-[#f0b429]/60 px-6 py-2 text-xs uppercase tracking-[0.2em] text-[#f0b429] hover:bg-[#f0b429] hover:text-[#0b0f0c]"
      >
        Post work
      </button>
    );
  }

  return (
    <form
      action={(fd) =>
        start(async () => {
          const r = await post(fd);
          setError(r.error ?? null);
          if (!r.error) setOpen(false);
        })
      }
      className="space-y-3 rounded-sm border border-[#f0b429]/30 p-5"
    >
      <input name="title" placeholder="Title" maxLength={120} required className={field} />
      <textarea name="brief" placeholder="What is the work?" rows={3} maxLength={4000} required className={field} />
      <div className="grid gap-3 sm:grid-cols-4">
        <input name="reward" type="number" min={0} defaultValue={120} placeholder="Pence" className={field} />
        <select name="ar_tier" defaultValue="" className={field}>
          <option value="">no Ār</option>
          <option value="minor">minor · 5</option>
          <option value="notable">notable · 10</option>
          <option value="considerable">considerable · 25</option>
          <option value="great">great · 50</option>
        </select>
        <input name="slots" type="number" min={1} placeholder="Slots" className={field} />
        <select name="town" defaultValue="" className={field}>
          <option value="">anywhere</option>
          {towns.map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
        </select>
      </div>
      {error && <p className="text-sm text-[#e2725b]">{error}</p>}
      <div className="flex gap-2">
        <button disabled={pending}
          className="rounded-sm border border-[#f0b429]/60 px-6 py-2 text-xs uppercase tracking-[0.2em] text-[#f0b429] hover:bg-[#f0b429] hover:text-[#0b0f0c] disabled:opacity-40">
          {pending ? "Posting…" : "Post"}
        </button>
        <button type="button" onClick={() => setOpen(false)}
          className="rounded-sm border border-white/15 px-4 py-2 text-xs uppercase tracking-wider text-[#e8e2d4]/50">
          Cancel
        </button>
      </div>
    </form>
  );
}
